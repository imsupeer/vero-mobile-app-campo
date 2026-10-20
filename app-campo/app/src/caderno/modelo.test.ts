import { describe, expect, test } from '@jest/globals';

import { dataValida, diasDesdePoda, estimarMaoDeObra, faseVariedadePorDias, numeroPlanejamento, responsavelValido, rotuloEstado, rotuloTipo } from '@/caderno/modelo';

describe('regras do caderno de campo', () => {
  test('valida datas reais no formato do ERP', () => {
    expect(dataValida('2026-09-25')).toBe(true);
    expect(dataValida('2026-02-30')).toBe(false);
    expect(dataValida('25/09/2026')).toBe(false);
  });

  test('mantém rótulos compreensíveis para tipo e sincronização', () => {
    expect(rotuloTipo('colheita')).toBe('Colheita');
    expect(rotuloEstado('falha')).toBe('Precisa de atenção');
  });

  test('exige um operador ativo como responsável pela frente', () => {
    expect(responsavelValido(12, [12, 18])).toBe(true);
    expect(responsavelValido(null, [12, 18])).toBe(false);
    expect(responsavelValido(0, [12, 18])).toBe(false);
    expect(responsavelValido(13, [12, 18])).toBe(false);
  });

  test('resolve a fase de variedade pelo dia desde a poda com limite final exclusivo', () => {
    const fases = [{ id: 4, dia_inicio: 0, dia_fim: 10 }, { id: 5, dia_inicio: 10, dia_fim: 20 }];
    expect(diasDesdePoda('2026-10-01', '2026-10-11')).toBe(10);
    expect(diasDesdePoda('2026-10-20', '2026-10-19')).toBe(-1);
    expect(faseVariedadePorDias(9, fases)).toBe(4);
    expect(faseVariedadePorDias(10, fases)).toBe(5);
    expect(faseVariedadePorDias(20, fases)).toBeNull();
    expect(faseVariedadePorDias(-1, fases)).toBeNull();
  });

  test('interpreta números brasileiros e dimensiona equipe como o ERP', () => {
    expect(numeroPlanejamento('1.234,5')).toBe(1234.5);
    expect(estimarMaoDeObra({
      total: 1000, rendimento: 100, rendimentoObservado: 0, fator: 1.1,
      meta: 100, media: 0, premioMeta: 90, premioValor: 2,
      custoPropria: 50, custoTerceirizada: 0, modo: 'prazo', prazo: 2,
      pessoasInformadas: 0,
    })).toMatchObject({ estado: 'ok', diarias: 11, pessoas: 6, premio: 120 });
  });
});
