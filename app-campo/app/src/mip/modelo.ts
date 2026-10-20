export type AlvoMonitoradoEntrada = {
  alvo_id: number | null;
  quantidade: string;
  local: string;
  severidade: string;
};

export type AlvoMonitoradoPayload = {
  alvo_id: number;
  nivel_infestacao?: number;
  quantidade_encontrada?: number;
  local_infestacao?: string;
  severidade_qualitativa?: string;
};

export type UnidadeIndice = '%' | 'un';

export function espacoAmostral(plantas: string, unidadesPorPlanta: string): number | null {
  const nPlantas = Number(plantas.replace(',', '.'));
  if (!Number.isInteger(nPlantas) || nPlantas <= 0) return null;
  const unidades = Number(unidadesPorPlanta.replace(',', '.')) || 1;
  if (!Number.isInteger(unidades) || unidades <= 0) return null;
  return nPlantas * unidades;
}

/** O Web calcula o índice pela quantidade; sem amostra, preserva o valor bruto. */
export function indiceCalculado(quantidade: string, espaco: number | null, unidade: UnidadeIndice = '%'): number | null {
  if (quantidade.trim() === '') return null;
  const qtd = Number(quantidade.replace(',', '.'));
  if (!Number.isFinite(qtd) || qtd < 0) return null;
  if (unidade !== '%' || espaco === null || espaco <= 0) return qtd;
  return Math.round((qtd / espaco) * 10000) / 100;
}

export function pressaoCalculada(indice: number | null, nivelAcao: number | null | undefined): number | null {
  if (indice === null || nivelAcao == null || !Number.isFinite(nivelAcao) || nivelAcao <= 0) return null;
  return Math.round((indice / nivelAcao) * 1000) / 10;
}

export function faixaPressao(pressao: number): 'Crítico' | 'Alerta' | 'Atenção' | 'Controlado' {
  if (pressao >= 200) return 'Crítico';
  if (pressao >= 100) return 'Alerta';
  if (pressao >= 50) return 'Atenção';
  return 'Controlado';
}

export function validarAlvosMonitorados(
  entradas: AlvoMonitoradoEntrada[], espaco: number | null = null, unidade: UnidadeIndice = '%',
): { erro: string | null; alvos: AlvoMonitoradoPayload[] } {
  if (entradas.length === 0) return { erro: 'Adicione ao menos um alvo monitorado.', alvos: [] };
  const vistos = new Set<string>();
  const alvos: AlvoMonitoradoPayload[] = [];
  for (const entrada of entradas) {
    if (entrada.alvo_id === null) return { erro: 'Selecione um alvo em cada linha.', alvos: [] };
    if (!entrada.quantidade.trim()) {
      return { erro: 'Informe a quantidade de cada alvo.', alvos: [] };
    }
    const quantidade = Number(entrada.quantidade.replace(',', '.'));
    if (!Number.isFinite(quantidade) || quantidade < 0) {
      return { erro: 'A quantidade deve ser um número igual ou maior que zero.', alvos: [] };
    }
    const chave = `${entrada.alvo_id}|${entrada.local}`;
    if (vistos.has(chave)) return { erro: 'Alvo repetido no mesmo local. Para repetir, escolha outro local.', alvos: [] };
    vistos.add(chave);
    const alvo: AlvoMonitoradoPayload = { alvo_id: entrada.alvo_id };
    alvo.quantidade_encontrada = quantidade;
    alvo.nivel_infestacao = indiceCalculado(entrada.quantidade, espaco, unidade) ?? quantidade;
    if (entrada.local) alvo.local_infestacao = entrada.local;
    if (entrada.severidade) alvo.severidade_qualitativa = entrada.severidade;
    alvos.push(alvo);
  }
  return { erro: null, alvos };
}
