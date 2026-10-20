import { describe, expect, test } from '@jest/globals';

import { normalizarPontoAssinatura } from './assinatura';

describe('coordenadas do quadro de assinatura', () => {
  test('escala um quadro web largo para o viewBox fixo', () => {
    expect(normalizarPontoAssinatura(800, 80, 1600, 160)).toEqual({ x: 160, y: 80 });
  });

  test('preserva coordenadas no tamanho nativo e limita pontos ao quadro', () => {
    expect(normalizarPontoAssinatura(120, 40, 320, 160)).toEqual({ x: 120, y: 40 });
    expect(normalizarPontoAssinatura(400, -5, 320, 160)).toEqual({ x: 320, y: 0 });
  });
});
