export type SituacaoEstoque = 'zerado' | 'abaixo' | 'ok';

export function situacaoEstoque(saldoValor: unknown, minimoValor: unknown): SituacaoEstoque {
  const saldo = Number(saldoValor ?? 0);
  const minimo = Number(minimoValor ?? 0);
  if (saldo <= 0) return 'zerado';
  if (minimo > 0 && saldo < minimo) return 'abaixo';
  return 'ok';
}
