import { describe, expect, it } from '@jest/globals';

import { situacaoEstoque } from './regras';

describe('situação do estoque', () => {
  it('classifica saldo zero ou negativo como zerado', () => {
    expect(situacaoEstoque(0, 5)).toBe('zerado');
    expect(situacaoEstoque(-1, 5)).toBe('zerado');
  });

  it('marca para reposição somente quando o saldo fica abaixo do mínimo', () => {
    expect(situacaoEstoque(4.99, 5)).toBe('abaixo');
    expect(situacaoEstoque(5, 5)).toBe('ok');
    expect(situacaoEstoque(6, 5)).toBe('ok');
  });

  it('não sinaliza reposição quando o produto não tem mínimo configurado', () => {
    expect(situacaoEstoque(1, 0)).toBe('ok');
  });
});
