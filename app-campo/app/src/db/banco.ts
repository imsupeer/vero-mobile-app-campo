/**
 * O banco do aparelho.
 *
 * Regra que atravessa o aplicativo inteiro: **a tela lê daqui, nunca da
 * rede.** A rede só alimenta este banco, em segundo plano. Se uma tela só
 * funciona conectada, o desenho está errado.
 *
 * O `cache` é genérico de propósito — `(modulo, registro_id, dados JSON)`.
 * Uma tabela por módulo daria consultas mais bonitas e obrigaria a mexer no
 * esquema do aparelho toda vez que o servidor ganhasse um módulo novo. Com o
 * cache genérico, módulo novo é só mais uma linha na lista de `MODULOS_LEITURA`.
 *
 * Portado do `vero_campo`, que já roda em campo.
 */
import * as SQLite from 'expo-sqlite';

let banco: SQLite.SQLiteDatabase | null = null;
let abertura: Promise<SQLite.SQLiteDatabase> | null = null;

export async function abrirBanco(): Promise<SQLite.SQLiteDatabase> {
  if (banco !== null) return banco;
  if (abertura !== null) return abertura;

  /* Várias telas consultam o banco juntas ao abrir. Compartilhar a mesma
     Promise impede duas aberturas nativas concorrentes e garante que nenhuma
     consulta rode antes da criação do esquema. */
  abertura = (async () => {
    const aberto = await SQLite.openDatabaseAsync('vero_campo_novo.db');

    await aberto.execAsync(`
    PRAGMA journal_mode = WAL;

    /* cadastro baixado do servidor, guardado como veio */
    CREATE TABLE IF NOT EXISTS cache (
      modulo      TEXT NOT NULL,
      registro_id TEXT NOT NULL,
      dados       TEXT NOT NULL,
      updated_at  TEXT,
      PRIMARY KEY (modulo, registro_id)
    );

    /* o cursor do delta, por módulo: o último server_time recebido */
    CREATE TABLE IF NOT EXISTS sync_meta (
      modulo       TEXT PRIMARY KEY,
      ultimo_delta TEXT
    );

    /* a fila de escrita: o que foi feito no aparelho e ainda não subiu */
    CREATE TABLE IF NOT EXISTS fila (
      client_uuid   TEXT PRIMARY KEY,
      tipo          TEXT NOT NULL,
      rota          TEXT NOT NULL,
      metodo        TEXT NOT NULL DEFAULT 'POST',
      payload       TEXT NOT NULL,
      -- pendente | enviando | confirmado | erro | falha
      estado        TEXT NOT NULL DEFAULT 'pendente',
      erro          TEXT,
      criado_em     TEXT NOT NULL,
      -- foto/anexo espera o registro pai subir primeiro
      pai_uuid      TEXT,
      tentativas    INTEGER NOT NULL DEFAULT 0,
      proximo_envio TEXT
    );

    CREATE INDEX IF NOT EXISTS fila_estado_idx ON fila (estado);
    `);

    banco = aberto;
    return aberto;
  })().catch((erro: unknown) => {
    abertura = null;
    throw erro;
  });

  return abertura;
}

/* ── cache de leitura ────────────────────────────────────────────────────── */

export async function gravarCache(
  modulo: string,
  itens: { id: string | number; updated_at?: string }[],
): Promise<void> {
  const b = await abrirBanco();
  await b.withTransactionAsync(async () => {
    for (const it of itens) {
      await b.runAsync(
        'INSERT OR REPLACE INTO cache (modulo, registro_id, dados, updated_at) VALUES (?,?,?,?)',
        modulo,
        String(it.id),
        JSON.stringify(it),
        it.updated_at ?? null,
      );
    }
  });
}

/** Aplica os tombstones: o que saiu do servidor sai daqui. */
export async function removerDoCache(modulo: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const b = await abrirBanco();
  const marcas = ids.map(() => '?').join(',');
  await b.runAsync(
    `DELETE FROM cache WHERE modulo = ? AND registro_id IN (${marcas})`,
    modulo,
    ...ids,
  );
}

/** Para os módulos de retrato, que substituem o conjunto inteiro. */
export async function limparModulo(modulo: string): Promise<void> {
  const b = await abrirBanco();
  await b.runAsync('DELETE FROM cache WHERE modulo = ?', modulo);
}

export async function lerCache<T>(modulo: string): Promise<T[]> {
  const b = await abrirBanco();
  const linhas = await b.getAllAsync<{ dados: string }>(
    'SELECT dados FROM cache WHERE modulo = ?',
    modulo,
  );

  return linhas.map((l) => JSON.parse(l.dados) as T);
}

/* ── cursor do delta ─────────────────────────────────────────────────────── */

export async function lerDelta(modulo: string): Promise<string | null> {
  const b = await abrirBanco();
  const l = await b.getFirstAsync<{ ultimo_delta: string | null }>(
    'SELECT ultimo_delta FROM sync_meta WHERE modulo = ?',
    modulo,
  );

  return l?.ultimo_delta ?? null;
}

export async function gravarDelta(modulo: string, valor: string): Promise<void> {
  const b = await abrirBanco();
  await b.runAsync(
    'INSERT OR REPLACE INTO sync_meta (modulo, ultimo_delta) VALUES (?, ?)',
    modulo,
    valor,
  );
}

/**
 * Zera todos os cursores, forçando carga cheia na próxima sincronização.
 *
 * Existe porque já foi preciso: cursores gravados enquanto o servidor
 * devolvia hora errada deixaram registros num ponto cego — `updated_at`
 * menor que o cursor, portanto invisíveis para sempre. A saída foi zerar e
 * refazer.
 */
export async function zerarDeltas(): Promise<void> {
  const b = await abrirBanco();
  await b.runAsync('DELETE FROM sync_meta');
}

/**
 * Apaga tudo. Chamado ao sair.
 *
 * **Confirme com a pessoa antes** se houver fila pendente: sair com trabalho
 * não enviado apaga trabalho de verdade, e ela não tem como recuperar.
 */
export async function limparBanco(): Promise<void> {
  const b = await abrirBanco();
  await b.execAsync(`
    DELETE FROM fila;
    DELETE FROM cache;
    DELETE FROM sync_meta;
  `);
}
