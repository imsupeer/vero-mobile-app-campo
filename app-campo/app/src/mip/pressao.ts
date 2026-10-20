/**
 * Pressão MIP/MID por alvo, para uma válvula.
 *
 * É o mesmo indicador que abre o painel da válvula no VERO web: para cada alvo
 * (praga ou doença), a última medição dentro da janela de 12 semanas, dividida
 * pelo nível de ação cadastrado. A razão vira uma classe de cor:
 *
 *   Controlado  < 50%      Alerta    100–199%
 *   Atenção     50–99%     Crítico   ≥ 200%
 *
 * A janela é relativa ao dado, não ao relógio do aparelho: contamos 12 semanas
 * a partir do monitoramento mais recente da válvula. Assim o número bate com o
 * do servidor mesmo offline, quando a data do celular pode estar torta.
 */
import type { MipRecebido, MipReferencia } from '@/api/tipos';

export type ClassePressao = 'controlado' | 'atencao' | 'alerta' | 'critico';

export type Pressao = {
  alvoId: string;
  nome: string;
  tipo: 'praga' | 'doenca' | 'outro';
  local: string | null;
  valor: number;
  nivelAcao: number;
  /** valor ÷ nível de ação (1 = exatamente no nível de ação). */
  razao: number;
  classe: ClassePressao;
  data: string | null;
};

export type ResumoPressao = {
  itens: Pressao[];
  totalMonitoramentos: number;
  ultima: string | null;
};

const SEMANAS = 12;
const DIAS_JANELA = SEMANAS * 7;

export function classificar(razao: number): ClassePressao {
  if (razao >= 2) return 'critico';
  if (razao >= 1) return 'alerta';
  if (razao >= 0.5) return 'atencao';
  return 'controlado';
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** "2025-01-09" → Date (meia-noite local). Datas inválidas viram null. */
function comoData(iso: string | null | undefined): Date | null {
  if (typeof iso !== 'string') return null;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m == null) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function tipoDe(v: unknown): 'praga' | 'doenca' | 'outro' {
  const t = String(v ?? '').toLowerCase();
  if (t.startsWith('prag')) return 'praga';
  if (t.startsWith('doen')) return 'doenca';
  return 'outro';
}

/** A classe de uma válvula no mapa: a maior pressão entre seus alvos, ou 'sem'
 *  quando não há monitoramento na janela. É o que colore a válvula no site. */
export type ClasseMapa = ClassePressao | 'sem';

export function classePorTalhao(
  recebidos: MipRecebido[],
  referencias: MipReferencia[],
  talhaoIds: Array<number | string>,
): Map<string, ClasseMapa> {
  const mapa = new Map<string, ClasseMapa>();
  for (const id of talhaoIds) {
    const r = pressaoDoTalhao(recebidos, referencias, id);
    mapa.set(String(id), r.itens[0]?.classe ?? 'sem');
  }
  return mapa;
}

export function pressaoDoTalhao(
  recebidos: MipRecebido[],
  referencias: MipReferencia[],
  talhaoId: number | string,
): ResumoPressao {
  const alvo = String(talhaoId);
  const doTalhao = recebidos.filter((r) => String(r.talhao_id) === alvo);
  if (doTalhao.length === 0) return { itens: [], totalMonitoramentos: 0, ultima: null };

  /* fim da janela = monitoramento mais recente; início = 12 semanas antes */
  const datas = doTalhao.map((r) => comoData(r.data_monitoramento)).filter((d): d is Date => d != null);
  const maisRecente = datas.reduce((a, b) => (b > a ? b : a), datas[0] ?? new Date());
  const inicioJanela = new Date(maisRecente);
  inicioJanela.setDate(inicioJanela.getDate() - DIAS_JANELA);

  const naJanela = doTalhao.filter((r) => {
    const d = comoData(r.data_monitoramento);
    return d != null && d >= inicioJanela && d <= maisRecente;
  });

  const tipoPorAlvo = new Map(referencias.map((ref) => [String(ref.id), tipoDe(ref.tipo)]));

  /* por alvo, fica com o monitoramento mais recente dentro da janela */
  const ultimoPorAlvo = new Map<string, MipRecebido>();
  for (const r of naJanela) {
    const chave = String(r.alvo_id ?? r.alvo_nome ?? r.id);
    const atual = ultimoPorAlvo.get(chave);
    const dNovo = comoData(r.data_monitoramento);
    const dAtual = atual ? comoData(atual.data_monitoramento) : null;
    if (atual == null || (dNovo != null && (dAtual == null || dNovo >= dAtual))) {
      ultimoPorAlvo.set(chave, r);
    }
  }

  const itens: Pressao[] = [];
  for (const [chave, r] of ultimoPorAlvo) {
    const nivelAcao = num(r.nivel_acao);
    const valor = num(r.nivel_infestacao);
    const razao = nivelAcao > 0 ? valor / nivelAcao : 0;
    itens.push({
      alvoId: chave,
      nome: r.alvo_nome ?? 'Alvo',
      tipo: tipoPorAlvo.get(String(r.alvo_id)) ?? 'outro',
      local: r.local_infestacao ?? null,
      valor,
      nivelAcao,
      razao,
      classe: classificar(razao),
      data: r.data_monitoramento ?? null,
    });
  }

  /* maior pressão primeiro: é o que a pessoa precisa ver antes de tudo */
  itens.sort((a, b) => b.razao - a.razao);

  const ultimaData = maisRecente;
  const ultima = `${String(ultimaData.getDate()).padStart(2, '0')}/${String(ultimaData.getMonth() + 1).padStart(2, '0')}/${ultimaData.getFullYear()}`;

  return { itens, totalMonitoramentos: naJanela.length, ultima };
}
