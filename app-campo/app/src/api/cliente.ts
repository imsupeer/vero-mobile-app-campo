/**
 * O cliente da API do VERO.
 *
 * Fala com o `api/v1` do ERP — o mesmo backend que o `vero_campo` usa. Não há
 * servidor intermediário: o ERP é o dono do dado, e ter um segundo lugar
 * guardando o mesmo apontamento seria criar um problema de reconciliação que
 * não se conserta depois, só se administra.
 *
 * Envelope do servidor (contrato D3):
 *   sucesso: { ok: true,  data, message, sync: { server_time } }
 *   erro:    { ok: false, error: "<codigo>", message }
 *
 * O `error` é um código estável — trate por ele, nunca pelo texto da
 * `message`, que muda.
 */
import NetInfo from '@react-native-community/netinfo';

import { lerBaseUrl } from '@/api/ambiente';
import { lerToken } from '@/api/sessaoArmazenada';

/** Quanto esperar antes de desistir. Rede de campo é lenta, não ausente. */
const LIMITE_MS = 15_000;
const LIMITE_UPLOAD_MS = 30_000;

type EnvelopeOk<T> = {
  ok: true;
  data: T;
  message: string | null;
  sync?: { server_time?: string };
};

type EnvelopeErro = { ok: false; error: string; message: string };

export type Resposta<T> = {
  data: T;
  message: string | null;
  /**
   * O relógio DO BANCO do servidor, e é ele que vira o cursor do delta.
   *
   * Não é detalhe: o PHP do ERP já rodou 3 h à frente do banco, e usar o
   * relógio do PHP deixava o cursor "no futuro" — registros novos sumiam do
   * delta por horas, sem erro nenhum aparecendo. Ver `api_hora_banco()` no
   * servidor e a proteção em `motor.ts`.
   */
  serverTime: string | null;
};

export class ErroApi extends Error {
  constructor(
    readonly codigo: string,
    mensagem: string,
    readonly status: number,
  ) {
    super(mensagem || codigo);
    this.name = 'ErroApi';
  }
}

/**
 * Sessão inválida do lado do servidor.
 *
 * Quem cuida do estado de autenticação registra aqui o que fazer (limpar o
 * token guardado e voltar ao login). Fica neste arquivo porque é o único
 * ponto por onde toda resposta passa.
 */
const CODIGOS_SESSAO = ['token_ausente', 'token_invalido', 'token_revogado', 'token_expirado'];

let aoPerderSessao: (() => void) | null = null;

export function registrarPerdaDeSessao(fn: () => void): void {
  aoPerderSessao = fn;
}

type Metodo = 'GET' | 'POST' | 'PUT' | 'DELETE';

async function requisicao<T>(
  metodo: Metodo,
  rota: string,
  corpo?: unknown,
  { autenticado = true }: { autenticado?: boolean } = {},
): Promise<Resposta<T>> {
  const base = await lerBaseUrl();
  if (base === null) {
    throw new ErroApi('sem_ambiente', 'Informe o código da empresa.', 0);
  }

  const cabecalhos: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (autenticado) {
    const token = await lerToken();
    if (token !== null) cabecalhos.Authorization = `Bearer ${token}`;
  }

  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), LIMITE_MS);

  let resposta: Response;
  try {
    resposta = await fetch(`${base}${rota}`, {
      method: metodo,
      headers: cabecalhos,
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
      signal: controle.signal,
    });
  } catch (e) {
    /**
     * Distinguir "sem internet" de "código de empresa errado" é requisito, não
     * capricho: confundir os dois faz o operador apagar uma configuração certa
     * no meio da válvula, e aí ele não consegue mais nem entrar.
     *
     * Tempo esgotado conta sempre como falta de conexão.
     */
    const abortou = (e as { name?: string } | null)?.name === 'AbortError';
    if (!abortou) {
      let conectado = false;
      try {
        conectado = (await NetInfo.fetch()).isConnected === true;
      } catch {
        /* NetInfo falhou: assume offline, que é o caminho seguro */
      }
      if (conectado) {
        /* há internet, mas o host não resolveu ou o TLS falhou: o código da
           empresa não existe. Note que isso morre ANTES de a credencial sair
           do aparelho. */
        throw new ErroApi('host_nao_encontrado', 'Código não encontrado. Confira com o suporte.', 0);
      }
    }
    throw new ErroApi(
      'sem_conexao',
      'Sem conexão. O registro fica na fila e envia depois.',
      0,
    );
  } finally {
    clearTimeout(relogio);
  }

  let corpoLido: unknown;
  try {
    corpoLido = await resposta.json();
  } catch {
    throw new ErroApi('resposta_invalida', 'Resposta inesperada do servidor.', resposta.status);
  }

  const envelope = corpoLido as EnvelopeOk<T> | EnvelopeErro;

  if (envelope === null || typeof envelope !== 'object' || !('ok' in envelope)) {
    throw new ErroApi('resposta_invalida', 'Resposta inesperada do servidor.', resposta.status);
  }

  if (!envelope.ok) {
    if (CODIGOS_SESSAO.includes(envelope.error)) {
      aoPerderSessao?.();
    }
    throw new ErroApi(envelope.error, envelope.message, resposta.status);
  }

  return {
    data: envelope.data,
    message: envelope.message ?? null,
    serverTime: envelope.sync?.server_time ?? null,
  };
}

export type ArquivoMultipart = {
  uri: string;
  nome: string;
  mime: string;
};

/** Envia foto sem transformar o arquivo em base64 (que aumentaria a fila em ~33%). */
async function postMultipart<T>(
  rota: string,
  arquivo: ArquivoMultipart,
  campos: Record<string, string>,
): Promise<Resposta<T>> {
  const base = await lerBaseUrl();
  if (base === null) throw new ErroApi('sem_ambiente', 'Informe o código da empresa.', 0);

  const token = await lerToken();
  const dados = new FormData();
  dados.append('arquivo', { uri: arquivo.uri, name: arquivo.nome, type: arquivo.mime } as unknown as Blob);
  Object.entries(campos).forEach(([chave, valor]) => dados.append(chave, valor));

  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), LIMITE_UPLOAD_MS);
  let resposta: Response;
  try {
    resposta = await fetch(`${base}${rota}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...(token === null ? {} : { Authorization: `Bearer ${token}` }),
      },
      body: dados,
      signal: controle.signal,
    });
  } catch (e) {
    throw new ErroApi(
      'sem_conexao',
      'Sem conexão. A foto fica na fila e envia depois.',
      0,
    );
  } finally {
    clearTimeout(relogio);
  }

  let corpoLido: unknown;
  try {
    corpoLido = await resposta.json();
  } catch {
    throw new ErroApi('resposta_invalida', 'Resposta inesperada do servidor.', resposta.status);
  }

  const envelope = corpoLido as EnvelopeOk<T> | EnvelopeErro;
  if (envelope === null || typeof envelope !== 'object' || !('ok' in envelope)) {
    throw new ErroApi('resposta_invalida', 'Resposta inesperada do servidor.', resposta.status);
  }
  if (!envelope.ok) {
    if (CODIGOS_SESSAO.includes(envelope.error)) aoPerderSessao?.();
    throw new ErroApi(envelope.error, envelope.message, resposta.status);
  }

  return {
    data: envelope.data,
    message: envelope.message ?? null,
    serverTime: envelope.sync?.server_time ?? null,
  };
}

export const http = {
  get: <T>(rota: string) => requisicao<T>('GET', rota),
  post: <T>(rota: string, corpo?: unknown) => requisicao<T>('POST', rota, corpo),
  postMultipart,
  /** Só o login usa: é a única rota pública. */
  postPublico: <T>(rota: string, corpo?: unknown) =>
    requisicao<T>('POST', rota, corpo, { autenticado: false }),
};
