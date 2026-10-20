import { describe, expect, it } from '@jest/globals';

import { lerHorimetro } from './regras';

describe('leitura de horímetro', () => {
  it('aceita zero como leitura inicial e decimal com vírgula', () => {
    expect(lerHorimetro('0')).toBe(0);
    expect(lerHorimetro('12,5')).toBe(12.5);
  });

  it('rejeita campo vazio, negativos e texto inválido', () => {
    expect(lerHorimetro('')).toBeNull();
    expect(lerHorimetro('  ')).toBeNull();
    expect(lerHorimetro('-0,1')).toBeNull();
    expect(lerHorimetro('abc')).toBeNull();
  });
});
