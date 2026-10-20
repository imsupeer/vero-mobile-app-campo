export type PontoAssinatura = { x: number; y: number };

/** Converte coordenadas de layout (CSS/dp) para o viewBox fixo da assinatura. */
export function normalizarPontoAssinatura(
  x: number,
  y: number,
  largura: number,
  altura: number,
): PontoAssinatura {
  const escalaX = largura > 0 ? 320 / largura : 1;
  const escalaY = altura > 0 ? 160 / altura : 1;

  return {
    x: Math.max(0, Math.min(320, x * escalaX)),
    y: Math.max(0, Math.min(160, y * escalaY)),
  };
}
