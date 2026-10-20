/**
 * A fila de escrita.
 *
 * Quando a pessoa salva alguma coisa, ela entra AQUI — no banco do aparelho —
 * e a tela já responde. A rede não participa desse momento; ela entra depois,
 * pelo motor de sincronização.
 *
 * O `client_uuid` nasce neste instante, ainda offline. É por ele que o
 * servidor reconhece um reenvio e devolve o registro que já existe em vez de
 * criar um gêmeo (ver `api_idempotente` no ERP).
 *
 * Portado do `vero_campo`. Os estados e o backoff não são enfeite — cada um
 * resolve um jeito específico de perder trabalho no campo.
 */
import { abrirBanco } from '@/db/banco';

/**
 * Seis tentativas, dobrando o intervalo: 1 → 2 → 4 → 8 → 16 min.
 *
 * Na sexta falha o item para de tentar e vira decisão do operador. Insistir
 * para sempre gasta bateria e rede, e esconde da pessoa que há algo errado.
 */
const TETO_TENTATIVAS = 6;

export type EstadoFila = 'pendente' | 'enviando' | 'confirmado' | 'erro' | 'falha';

export type ItemFila = {
  clientUuid: string;
  tipo: string;
  rota: string;
  metodo: string;
  payload: string;
  estado: EstadoFila;
  erro: string | null;
  criadoEm: string;
  paiUuid: string | null;
  tentativas: number;
};

type Linha = {
  client_uuid: string;
  tipo: string;
  rota: string;
  metodo: string;
  payload: string;
  estado: string;
  erro: string | null;
  criado_em: string;
  pai_uuid: string | null;
  tentativas: number;
};

function converter(l: Linha): ItemFila {
  return {
    clientUuid: l.client_uuid,
    tipo: l.tipo,
    rota: l.rota,
    metodo: l.metodo,
    payload: l.payload,
    estado: l.estado as EstadoFila,
    erro: l.erro,
    criadoEm: l.criado_em,
    paiUuid: l.pai_uuid,
    tentativas: l.tentativas,
  };
}

/**
 * Um identificador único gerado no aparelho.
 *
 * Não use `Math.random` sozinho como chave de sincronização: a chance de
 * repetir é pequena, e um choque faria o servidor tratar dois registros
 * diferentes como o mesmo — um deles sumiria sem ninguém perceber.
 */
export function novoClientUuid(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (typeof g.crypto?.randomUUID === 'function') {
    return g.crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;

    return v.toString(16);
  });
}

/** Põe uma escrita na fila. Devolve o `client_uuid`. */
export async function enfileirar({
  tipo,
  rota,
  metodo = 'POST',
  payload,
  paiUuid = null,
}: {
  tipo: string;
  rota: string;
  metodo?: string;
  payload: Record<string, unknown>;
  paiUuid?: string | null;
}): Promise<string> {
  const b = await abrirBanco();
  const clientUuid =
    typeof payload.client_uuid === 'string' && payload.client_uuid !== ''
      ? payload.client_uuid
      : novoClientUuid();

  await b.runAsync(
    `INSERT OR REPLACE INTO fila
       (client_uuid, tipo, rota, metodo, payload, estado, criado_em, pai_uuid)
     VALUES (?,?,?,?,?,'pendente',?,?)`,
    clientUuid,
    tipo,
    rota,
    metodo,
    JSON.stringify({ ...payload, client_uuid: clientUuid }),
    new Date().toISOString(),
    paiUuid,
  );

  return clientUuid;
}

/**
 * Os próximos a enviar.
 *
 * Duas ordenações que importam: o registro pai antes dos anexos (uma foto sem
 * o apontamento dela não tem onde se prender), e o mais antigo primeiro — se
 * a janela de sinal acabar no meio, o que fica para trás é o mais recente,
 * que é o que a pessoa ainda lembra de ter feito.
 *
 * Respeita o `proximo_envio` do backoff.
 */
export async function pendentes(): Promise<ItemFila[]> {
  const b = await abrirBanco();
  const linhas = await b.getAllAsync<Linha>(
    `SELECT * FROM fila
      WHERE estado IN ('pendente','erro')
        AND (proximo_envio IS NULL OR proximo_envio <= ?)
      ORDER BY (pai_uuid IS NULL) DESC, criado_em ASC`,
    new Date().toISOString(),
  );

  return linhas.map(converter);
}

/**
 * Devolve à fila o que ficou preso em 'enviando'.
 *
 * Um travamento do aplicativo entre enviar e confirmar deixava o item nesse
 * estado para sempre — ele não era nem pendente nem confirmado, e sumia da
 * tela sem ter subido. Chame na abertura do app. Reenviar é seguro: a
 * idempotência por `client_uuid` garante que não duplica.
 */
export async function reidratarPresos(): Promise<number> {
  const b = await abrirBanco();
  const r = await b.runAsync("UPDATE fila SET estado='pendente' WHERE estado='enviando'");

  return r.changes ?? 0;
}

/**
 * Registra uma falha de envio.
 *
 * `definitiva` é quando a regra de negócio rejeitou: vira falha na hora, sem
 * retentativa, porque reenviar o mesmo conteúdo dá o mesmo resultado. O resto
 * entra no backoff.
 */
export async function registrarFalha(
  clientUuid: string,
  mensagem: string,
  definitiva = false,
): Promise<'falha' | 'erro'> {
  const b = await abrirBanco();
  const item = await b.getFirstAsync<{ tentativas: number }>(
    'SELECT tentativas FROM fila WHERE client_uuid = ?',
    clientUuid,
  );
  const tentativas = (item?.tentativas ?? 0) + 1;

  if (definitiva || tentativas >= TETO_TENTATIVAS) {
    await b.runAsync(
      "UPDATE fila SET estado='falha', erro=?, tentativas=?, proximo_envio=NULL WHERE client_uuid=?",
      definitiva ? mensagem : `${mensagem} — desistiu após ${tentativas} tentativas`,
      tentativas,
      clientUuid,
    );

    return 'falha';
  }

  const esperaMs = 2 ** (tentativas - 1) * 60 * 1000;
  await b.runAsync(
    "UPDATE fila SET estado='erro', erro=?, tentativas=?, proximo_envio=? WHERE client_uuid=?",
    mensagem,
    tentativas,
    new Date(Date.now() + esperaMs).toISOString(),
    clientUuid,
  );

  return 'erro';
}

export async function marcar(
  clientUuid: string,
  estado: EstadoFila,
  erro: string | null = null,
): Promise<void> {
  const b = await abrirBanco();

  if (estado === 'pendente') {
    /* "tentar de novo" zera o histórico de retentativa */
    await b.runAsync(
      "UPDATE fila SET estado='pendente', erro=NULL, tentativas=0, proximo_envio=NULL WHERE client_uuid=?",
      clientUuid,
    );

    return;
  }

  await b.runAsync(
    'UPDATE fila SET estado = ?, erro = ? WHERE client_uuid = ?',
    estado,
    erro,
    clientUuid,
  );
}

/** Tudo que ainda não chegou ao servidor. É o número da faixa de aviso. */
export async function contarPendentes(): Promise<number> {
  const b = await abrirBanco();
  const r = await b.getFirstAsync<{ n: number }>(
    "SELECT COUNT(*) AS n FROM fila WHERE estado IN ('pendente','enviando','erro')",
  );

  return r?.n ?? 0;
}

/** O que o servidor recusou de vez. Precisa de decisão da pessoa. */
export async function contarFalhas(): Promise<number> {
  const b = await abrirBanco();
  const r = await b.getFirstAsync<{ n: number }>(
    "SELECT COUNT(*) AS n FROM fila WHERE estado = 'falha'",
  );

  return r?.n ?? 0;
}

export async function todos(): Promise<ItemFila[]> {
  const b = await abrirBanco();
  const linhas = await b.getAllAsync<Linha>('SELECT * FROM fila ORDER BY criado_em DESC');

  return linhas.map(converter);
}

/** Estado do pai, usado para não enviar um anexo cujo apontamento foi recusado. */
export async function estadoDe(clientUuid: string): Promise<EstadoFila | null> {
  const b = await abrirBanco();
  const linha = await b.getFirstAsync<{ estado: string }>(
    'SELECT estado FROM fila WHERE client_uuid = ?',
    clientUuid,
  );
  return (linha?.estado as EstadoFila | undefined) ?? null;
}

/**
 * Descarta um registro recusado.
 *
 * Leva junto os anexos filhos: sem o pai, eles nunca subiriam e ficariam na
 * fila para sempre.
 */
export async function descartar(clientUuid: string): Promise<void> {
  const b = await abrirBanco();
  await b.runAsync(
    'DELETE FROM fila WHERE client_uuid = ? OR pai_uuid = ?',
    clientUuid,
    clientUuid,
  );
}
