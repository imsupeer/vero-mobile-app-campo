/** Verifica se um tipo de atividade pode ser usado na cultura selecionada. */
export function compativelComCultura(
  culturas: string | number[] | null | undefined,
  culturaId: number | null,
): boolean {
  if (culturaId === null) return true;

  const ids = Array.isArray(culturas)
    ? culturas.map(Number).filter(Number.isFinite)
    : String(culturas ?? '')
      .split(',')
      .map((valor) => valor.trim())
      .filter((valor) => valor.length > 0)
      .map(Number)
      .filter(Number.isFinite);

  return ids.length === 0 || ids.includes(culturaId);
}
