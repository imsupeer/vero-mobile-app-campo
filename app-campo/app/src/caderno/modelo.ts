import type { ItemFila } from '@/sinc/fila';
import type { PlanejamentoMaoDeObra } from '@/api/tipos';

export const TIPOS_APONTAMENTO = [
  { valor: 'tratos_culturais', rotulo: 'Tratos culturais' },
  { valor: 'colheita', rotulo: 'Colheita' },
  { valor: 'aplicacao', rotulo: 'Aplicação' },
  { valor: 'nutricao', rotulo: 'Nutrição' },
  { valor: 'abastecimento', rotulo: 'Abastecimento' },
  { valor: 'outro', rotulo: 'Outro' },
] as const;

export type TipoApontamento = (typeof TIPOS_APONTAMENTO)[number]['valor'];

export type CargaApontamento = {
  client_uuid?: string;
  tipo?: string;
  talhao_id?: number;
  atividade_id?: number;
  maquina_id?: number;
  data?: string;
  observacao?: string;
  planejamento_mo?: PlanejamentoMaoDeObra;
};

export function lerCarga(item: ItemFila): CargaApontamento | null {
  try {
    return JSON.parse(item.payload) as CargaApontamento;
  } catch {
    return null;
  }
}

export function rotuloTipo(tipo?: string | null): string {
  return TIPOS_APONTAMENTO.find((item) => item.valor === tipo)?.rotulo ?? tipo ?? 'Apontamento';
}

export function rotuloEstado(estado: ItemFila['estado']): string {
  switch (estado) {
    case 'pendente': return 'Aguardando envio';
    case 'enviando': return 'Enviando';
    case 'erro': return 'Tentará novamente';
    case 'falha': return 'Precisa de atenção';
    case 'confirmado': return 'Enviado';
  }
}

export function dataHoje(): string {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function dataValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const data = new Date(`${valor}T12:00:00`);
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === valor;
}

export function responsavelValido(id: number | null, idsAtivos: readonly number[]): id is number {
  return id !== null && Number.isInteger(id) && id > 0 && idsAtivos.includes(id);
}

export function diasDesdePoda(dataPoda: string | null | undefined, dataApontamento: string): number | null {
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (dataPoda == null || !iso.test(dataPoda) || !dataValida(dataApontamento)) return null;
  const inicio = Date.parse(`${dataPoda}T00:00:00Z`);
  const data = Date.parse(`${dataApontamento}T00:00:00Z`);
  return Number.isFinite(inicio) && Number.isFinite(data) ? Math.floor((data - inicio) / 86_400_000) : null;
}

export function faseVariedadePorDias(
  dias: number | null,
  fases: readonly { id: number; dia_inicio: number; dia_fim: number }[],
): number | null {
  if (dias === null || dias < 0) return null;
  return fases.find((fase) => dias >= fase.dia_inicio && dias < fase.dia_fim)?.id ?? null;
}

export type EstimativaMaoDeObra = {
  estado: 'ok' | 'sem_parametro' | 'sem_trabalho';
  base: 'media' | 'meta' | 'observado' | 'referencia' | null;
  diarias: number | null;
  pessoas: number | null;
  dias: number | null;
  custoPropria: number | null;
  custoTerceirizada: number | null;
  premio: number | null;
};

export function numeroPlanejamento(valor: string | number | null | undefined): number {
  if (valor == null || valor === '') return 0;
  const texto = String(valor).trim();
  const numero = Number(texto.includes(',') ? texto.replace(/\./g, '').replace(',', '.') : texto);
  return Number.isFinite(numero) ? numero : 0;
}

/** Dimensionamento central do Web: média/meta editável e rendimento observado como fallback. */
export function estimarMaoDeObra(input: {
  total: number; rendimento: number; rendimentoObservado: number; fator: number;
  meta: number; media: number; premioMeta: number; premioValor: number;
  custoPropria: number; custoTerceirizada: number; modo: 'prazo' | 'pessoas';
  prazo: number; pessoasInformadas: number;
}): EstimativaMaoDeObra {
  const vazio = { base: null, diarias: null, pessoas: null, dias: null, custoPropria: null, custoTerceirizada: null, premio: null } as const;
  if (input.total <= 0) return { estado: 'sem_trabalho', ...vazio };
  const observado = input.rendimentoObservado > 0;
  const rendimento = observado ? input.rendimentoObservado : input.rendimento;
  if (rendimento <= 0) return { estado: 'sem_parametro', ...vazio };
  const base = input.media > 0 ? input.media : input.meta > 0 ? input.meta : rendimento;
  const fonte = input.media > 0 ? 'media' : input.meta > 0 ? 'meta' : observado ? 'observado' : 'referencia';
  const diarias = input.total / base * (input.fator > 0 ? input.fator : 1);
  const diariasInteiras = Math.ceil(diarias);
  const pessoas = input.modo === 'prazo'
    ? input.prazo > 0 ? Math.ceil(diarias / input.prazo) : null
    : input.pessoasInformadas > 0 ? Math.ceil(input.pessoasInformadas) : null;
  const dias = input.modo === 'pessoas'
    ? input.pessoasInformadas > 0 ? Math.ceil(diarias / input.pessoasInformadas) : null
    : input.prazo > 0 ? Math.ceil(input.prazo) : null;
  const basePremio = input.media > 0 ? input.media : rendimento;
  return {
    estado: 'ok', base: fonte, diarias, pessoas, dias,
    custoPropria: input.custoPropria > 0 ? diariasInteiras * input.custoPropria : null,
    custoTerceirizada: input.custoTerceirizada > 0 ? diariasInteiras * input.custoTerceirizada : null,
    premio: input.premioMeta > 0 && input.premioValor > 0 && pessoas !== null
      ? Math.max(0, basePremio - input.premioMeta) * pessoas * input.premioValor : null,
  };
}
