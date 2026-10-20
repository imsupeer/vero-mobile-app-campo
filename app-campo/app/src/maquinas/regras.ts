export function lerHorimetro(valor: string): number | null {
  if (valor.trim() === '') return null;
  const numero = Number(valor.replace(',', '.'));
  return Number.isFinite(numero) && numero >= 0 ? numero : null;
}
