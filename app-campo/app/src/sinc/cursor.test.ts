import { describe, expect, it } from '@jest/globals';
import { cursorComSobreposicao } from './cursor';

describe('cursorComSobreposicao', () => {
  it('reconsulta uma janela antes do último cursor para cobrir relógios divergentes', () => {
    expect(cursorComSobreposicao('2026-10-07 10:55:42')).toBe('2026-10-07 06:55:42');
  });

  it('trata corretamente a virada de dia e de mês', () => {
    expect(cursorComSobreposicao('2026-10-01 02:15:00')).toBe('2026-09-30 22:15:00');
  });

  it('preserva um cursor malformado em vez de fabricar uma data', () => {
    expect(cursorComSobreposicao('cursor-invalido')).toBe('cursor-invalido');
  });
});
