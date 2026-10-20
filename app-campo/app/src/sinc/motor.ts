/**
 * O motor de sincronização.
 *
 * Portado do `vero_campo`, que já roda em campo. Cada proteção aqui existe
 * porque alguma coisa deu errado de verdade — as datas são dos incidentes.
 * Não simplifique nenhuma sem entender o que ela segura.
 *
 * Contrato do servidor (`api/v1`):
 *   GET  /sync/{modulo}?desde=YYYY-MM-DD HH:MM:SS  → { itens: [...] }
 *   POST /{rota}  com `client_uuid` no corpo (idempotente)
 */
import { ErroApi, http } from '@/api/cliente';
import { gravarCache, gravarDelta, lerDelta, limparModulo, removerDoCache } from '@/db/banco';
import { cursorComSobreposicao } from '@/sinc/cursor';
import { estadoDe, marcar, pendentes, registrarFalha } from '@/sinc/fila';
import type { ItemFila } from '@/sinc/fila';

/** O servidor devolve no máximo isto por página. */
const PAGINA = 500;

/** Trava de segurança: 10 mil registros por módulo, por rodada. */
const MAX_PAGINAS = 20;

type ItemSync = {
  id: string | number;
  updated_at?: string;
  /** Tombstone: saiu do conjunto e deve ser removido do cache local. */
  _excluido?: boolean | number;
};

/**
 * Módulos que devolvem o RETRATO ATUAL inteiro, sem delta.
 *
 * São filas de trabalho, não cadastro: "o que está aberto agora", "o que
 * aguarda minha aprovação". Nesses o cache é **substituído**, não fundido —
 * o que saiu do retrato tem de sumir da tela. Fundir deixaria o operador
 * olhando para uma tarefa que outra pessoa já concluiu.
 */
const MODULOS_RETRATO = new Set([
  'fazendas',
  'centros_custo',
  'tipos_atividade',
  'tipos_atividade',
  'nutrientes',
  'variedades',
  'fenologia_estagios',
  'safras_talhoes',
  'fenologia',
  'variedade_fases',
  'apontamentos_abertos',
  'colheitas_pendentes',
  'colheitas_registros',
  'calc_parametros',
  'compras_aprovacoes_pendentes',
  'financeiro',
  /* Saldos dependem de movimentações, que não atualizam updated_at do produto.
     Recarregar o retrato completo evita deltas incompletos e cache obsoleto. */
  'estoque',
  'cargas_colheita',
  'mip_referencias',
  'mip_pontos',
  /* Histórico de DF/IF precisa ser recarregado como conjunto para também
     buscar documentos validados antes de este módulo entrar no app. */
  'aplicacoes',
  /* consultas do Tier 2 — agregados sempre em retrato (não delta) */
  'produtividade',
  'irrigacao_planejado',
  'irrigacao_consumo',
  'analise_solo',
  'analise_foliar',
]);

/**
 * Códigos em que a REGRA DE NEGÓCIO rejeitou o envio.
 *
 * Reenviar o mesmo conteúdo nunca vai funcionar, então o item vira falha na
 * hora. Sem esta lista, um apontamento com válvula inválido tentaria de hora
 * em hora para sempre, gastando bateria e rede — e o operador nunca saberia
 * que precisa corrigir alguma coisa.
 */
const REJEICOES_DEFINITIVAS = new Set([
  'sem_permissao', 'status_invalido', 'tipo_invalido', 'alvo_invalido',
  'talhao_invalido', 'maquina_invalida', 'atividade_invalida', 'campo_obrigatorio',
  'leitura_menor', 'ja_reconhecido', 'alvo_repetido', 'litros_invalido',
  'horimetro_invalido', 'extensao_invalida', 'mime_invalido', 'arquivo_grande',
  'assinatura_grande', 'uuids_invalidos', 'nao_encontrado',
  'client_uuid_invalido', 'json_invalido',
  /* o escritório mexeu depois: reenviar sobrescreveria a decisão de alguém */
  'conflito',
  'sem_operador', 'sem_itens', 'quantidade_invalida', 'hora_invalida',
  'safra_fechada', 'sem_peso_caixa', 'confirmar_falhou',
  'solicitacao_vazia', 'aprovacao_invalida', 'pedido_nao_recebivel', 'periodo_fechado',
  'romaneio_duplicado',
  'unidade_invalida', 'cracha_invalido', 'funcao_indefinida',
  'posto_sem_atividade', 'beep_recusado', 'sem_recepcao',
  /* Tier 1: colheita, aplicações, recebimento */
  'produto_invalido', 'sem_safra', 'validade_invalida', 'emissao_pendente',
  'ponto_invalido', 'metodologia_invalida', 'safra_invalida',
]);

/**
 * Os módulos de leitura que este aplicativo acompanha.
 *
 * O servidor oferece mais (compras, estoque, máquinas, aplicações…). Comece
 * pequeno e acrescente conforme as telas forem existindo: cada módulo aqui é
 * uma chamada a mais em toda sincronização, e a rede do campo é escassa.
 */
export const MODULOS_LEITURA = [
  'fazendas',
  'talhoes',
  'safras',
  'atividades',
  'tipos_atividade',
  'safras_talhoes',
  'maquinas',
  'maquina_registros',
  'fenologia',
  'apontamentos_abertos',
  'apontamentos',
  'colaboradores',
  'alertas',
  'mip_referencias',
  'mip_pontos',
  'mip_recebidos',
  'financeiro',
  'estoque',
  'estoque_lotes',
  'estoque_movimentacoes',
  'compras_pedidos',
  'cargas_colheita',
  /* fluxos operacionais do Tier 1 */
  'aplicacoes',
  'fornecedores',
  'compras_solicitacoes',
  'compras_aprovacoes_pendentes',
  'colheitas_pendentes',
  'colheitas_registros',
  /* consultas do Tier 2 */
  'produtividade',
  'irrigacao_planejado',
  'irrigacao_consumo',
  'analise_solo',
  'analise_foliar',
  'nutrientes',
  'variedades',
  'fenologia_estagios',
  'variedade_fases',
  'calc_parametros',
  'centros_custo',
] as const;

/* ── descida ─────────────────────────────────────────────────────────────── */

/** Baixa um módulo e grava no cache local. */
export async function baixarModulo(modulo: string): Promise<number> {
  const cursorPersistido = MODULOS_RETRATO.has(modulo) ? null : await lerDelta(modulo);
  let desde = cursorPersistido === null ? null : cursorComSobreposicao(cursorPersistido);
  let total = 0;
  let serverTime: string | null = null;

  for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
    const sufixo = desde !== null ? `?desde=${encodeURIComponent(desde)}` : '';
    const resp = await http.get<{ itens?: ItemSync[] }>(`/sync/${modulo}${sufixo}`);

    const itens = resp.data?.itens ?? [];
    serverTime = resp.serverTime ?? serverTime;

    /**
     * Cursor "do futuro" (incidente de 22/07).
     *
     * O `server_time` saía do relógio do PHP, que roda 3 h à frente do banco.
     * O cursor gravado ficava maior que qualquer `updated_at`, e os registros
     * novos sumiam do delta por horas — sem erro nenhum, que é o pior tipo de
     * falha. Detectado, refaz a carga cheia do módulo.
     *
     * A comparação de texto funciona porque o formato `YYYY-MM-DD HH:MM:SS`
     * ordena igual como texto e como data.
     */
    if (cursorPersistido !== null && serverTime !== null && cursorPersistido > serverTime) {
      desde = null;
      continue;
    }

    const vivos = itens.filter((i) => !i._excluido);
    const excluidos = itens.filter((i) => i._excluido).map((i) => String(i.id));

    if (MODULOS_RETRATO.has(modulo)) {
      await limparModulo(modulo);
      if (vivos.length > 0) await gravarCache(modulo, vivos);
      total = vivos.length;
      break;
    }

    if (vivos.length > 0) await gravarCache(modulo, vivos);
    if (excluidos.length > 0) await removerDoCache(modulo, excluidos);
    total += vivos.length;

    if (itens.length < PAGINA) break;   /* última página */

    const ultimo = itens[itens.length - 1]?.updated_at;
    /* sem progresso: 500 itens com o mesmo `updated_at` fariam o cursor não
       avançar, e o laço pediria a mesma página até a trava de segurança */
    if (ultimo == null || ultimo === desde) break;
    desde = ultimo;
  }

  if (serverTime !== null) await gravarDelta(modulo, serverTime);

  return total;
}

export type FalhaLeitura = { modulo: string; codigo: string };
export type ResultadoLeitura = { baixados: number; modulosPulados: string[]; falhasLeitura: FalhaLeitura[] };

/**
 * Baixa todos os módulos.
 *
 * Um módulo que falha **não** derruba os outros, e isso é o caso comum, não a
 * exceção: vários exigem permissão, e quem não tem recebe 403. Não é erro —
 * é o módulo não se aplicar àquela pessoa, e ela segue trabalhando.
 */
export async function sincronizarLeitura(): Promise<ResultadoLeitura> {
  let baixados = 0;
  const modulosPulados: string[] = [];
  const falhasLeitura: FalhaLeitura[] = [];

  for (const modulo of MODULOS_LEITURA) {
    try {
      baixados += await baixarModulo(modulo);
    } catch (e) {
      modulosPulados.push(modulo);
      falhasLeitura.push({
        modulo,
        codigo: e instanceof ErroApi ? e.codigo : 'erro_desconhecido',
      });
      /* sem rede: os próximos falhariam igual, não adianta insistir */
      if (e instanceof ErroApi && e.codigo === 'sem_conexao') break;
    }
  }

  return { baixados, modulosPulados, falhasLeitura };
}

/* ── subida ──────────────────────────────────────────────────────────────── */

export type EstadoEnvio = 'confirmado' | 'pendente' | 'erro' | 'falha';

/**
 * Envia a fila pendente.
 *
 * Idempotente por `client_uuid`: reenviar não duplica. As falhas são
 * **classificadas**, e é a classificação que separa um aplicativo que
 * funciona no campo de um que enlouquece o operador:
 *
 *   sem conexão       → volta a pendente, SEM contar tentativa, e para a fila
 *   rejeição de regra → vira falha na hora, para a pessoa corrigir
 *   qualquer outra    → backoff exponencial até o teto
 *
 * Contar tentativa quando falta rede seria punir o operador pelo lugar onde
 * ele trabalha: numa semana sem sinal a fila estouraria o teto sozinha e
 * descartaria trabalho que estava perfeito.
 */
export async function enviarFila(
  aoItem?: (item: ItemFila, estado: EstadoEnvio, erro?: unknown) => void,
): Promise<number> {
  const itens = await pendentes();
  let enviados = 0;

  for (const it of itens) {
    if (it.paiUuid !== null && await estadoDe(it.paiUuid) !== 'confirmado') {
      continue;
    }
    /* "Enviar para análise" do MIP resolve os monitoramentos pelo client_uuid:
       os rascunhos precisam ter subido antes, senão a análise roda vazia e o
       servidor a marca como feita sem processar nada. Segura o lote até que
       todos os rascunhos citados estejam confirmados. */
    if (it.tipo === 'monitoramentos_enviar') {
      const carga = JSON.parse(it.payload) as { uuids?: unknown };
      const uuids = Array.isArray(carga.uuids) ? carga.uuids.map(String) : [];
      const estados = await Promise.all(uuids.map((u) => estadoDe(u)));
      if (estados.some((e) => e === 'pendente' || e === 'enviando' || e === 'erro')) {
        continue;
      }
    }
    await marcar(it.clientUuid, 'enviando');
    try {
      const carga = JSON.parse(it.payload) as Record<string, unknown>;
      if (it.tipo === 'anexo') {
        const uri = String(carga.uri ?? '');
        const nome = String(carga.nome ?? 'foto.jpg');
        const mime = String(carga.mime ?? 'image/jpeg');
        await http.postMultipart(it.rota, { uri, nome, mime }, {
          client_uuid: String(carga.client_uuid ?? it.clientUuid),
          origem_uuid: String(carga.origem_uuid ?? it.paiUuid ?? ''),
          origem_tipo: String(carga.origem_tipo ?? 'apontamento'),
          descricao: String(carga.descricao ?? ''),
        });
      } else {
        await http.post(it.rota, carga);
      }

      await marcar(it.clientUuid, 'confirmado');
      enviados += 1;
      aoItem?.(it, 'confirmado');
    } catch (e) {
      const codigo = e instanceof ErroApi ? e.codigo : '';

      if (codigo === 'sem_conexao') {
        await marcar(it.clientUuid, 'pendente');
        aoItem?.(it, 'pendente', e);
        break;
      }

      const estado = await registrarFalha(
        it.clientUuid,
        e instanceof Error ? e.message : 'falha',
        REJEICOES_DEFINITIVAS.has(codigo),
      );
      aoItem?.(it, estado, e);
      /* não interrompe a fila: os próximos podem passar */
    }
  }

  return enviados;
}

export type ResultadoSinc = {
  enviados: number;
  baixados: number;
  modulosPulados: string[];
  falhasLeitura: FalhaLeitura[];
};

/**
 * Uma rodada completa.
 *
 * **Sobe primeiro, desce depois.** O trabalho da pessoa é o que corre risco
 * de se perder se o aparelho quebrar ou a bateria acabar; o cadastro está a
 * salvo no servidor e pode esperar a próxima rodada.
 */
export async function sincronizar(): Promise<ResultadoSinc> {
  const enviados = await enviarFila();
  const leitura = await sincronizarLeitura();

  return {
    enviados,
    baixados: leitura.baixados,
    modulosPulados: leitura.modulosPulados,
    falhasLeitura: leitura.falhasLeitura,
  };
}
