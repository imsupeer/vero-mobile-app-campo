import { describe, expect, test } from '@jest/globals';

import { compativelComCultura } from '@/caderno/culturas';

describe('compativelComCultura', () => {
  test('permite tipos sem restrição de cultura', () => {
    expect(compativelComCultura(null, 1)).toBe(true);
    expect(compativelComCultura('', 1)).toBe(true);
    expect(compativelComCultura(' , ', 1)).toBe(true);
  });

  test('respeita culturas explicitamente configuradas', () => {
    expect(compativelComCultura('1, 3', 3)).toBe(true);
    expect(compativelComCultura([1, 3], 2)).toBe(false);
  });

  test('não filtra quando nenhuma cultura foi selecionada', () => {
    expect(compativelComCultura('2', null)).toBe(true);
  });
});
