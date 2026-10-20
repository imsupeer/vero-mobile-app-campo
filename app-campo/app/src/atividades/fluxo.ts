export type AcaoAtividade = 'andamento' | 'concluida';

/** Transições de status disponíveis no VERO Web para uma atividade. */
export function acoesAtividade(status?: string | null): AcaoAtividade[] {
  if (status === 'planejada') return ['andamento'];
  if (status === 'em_execucao') return ['concluida'];
  return [];
}
