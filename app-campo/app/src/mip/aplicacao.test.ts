import { describe, expect, test } from '@jest/globals';

import { decimalAplicacao, horaAplicacaoValida, quantidadeRealAplicacao } from './aplicacao';

describe('execução de aplicação DF/IF', () => {
  test('interpreta valores decimais em formato brasileiro e API', () => {
    expect(decimalAplicacao('1.234,56')).toBe(1234.56);
    expect(decimalAplicacao('12.5')).toBe(12.5);
    expect(decimalAplicacao('')).toBeNull();
    expect(decimalAplicacao('abc')).toBeNull();
  });

  test('valida horários e impede término anterior ao início', () => {
    expect(horaAplicacaoValida('08:15', '08:16')).toBe(true);
    expect(horaAplicacaoValida('08:15', '08:15')).toBe(true);
    expect(horaAplicacaoValida('17:00', '16:59')).toBe(false);
    expect(horaAplicacaoValida('24:00', '')).toBe(false);
    expect(horaAplicacaoValida('', '12:60')).toBe(false);
  });

  test('usa a quantidade prevista quando o realizado fica em branco e exige valor positivo', () => {
    expect(quantidadeRealAplicacao('', '625.000000')).toBe(625);
    expect(quantidadeRealAplicacao('1.234,5', 100)).toBe(1234.5);
    expect(quantidadeRealAplicacao('0', 100)).toBeNull();
    expect(quantidadeRealAplicacao('-2', 100)).toBeNull();
  });
});
