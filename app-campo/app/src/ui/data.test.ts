import { describe, expect, it } from '@jest/globals';
import { dataLocalDaIso, dataLocalParaIso, formatarDataPtBr } from './data';

describe('conversões de data do campo', () => {
  it('converte entre ISO e data local sem alterar o dia', () => {
    const iso = '2026-10-04';
    const data = dataLocalDaIso(iso);

    expect(data).not.toBeNull();
    expect(dataLocalParaIso(data!)).toBe(iso);
  });

  it('rejeita datas inexistentes e valores fora do formato ISO', () => {
    expect(dataLocalDaIso('2026-02-30')).toBeNull();
    expect(dataLocalDaIso('04/10/2026')).toBeNull();
  });

  it('exibe a data no padrão brasileiro', () => {
    expect(formatarDataPtBr('2026-10-04')).toBe('04/10/2026');
    expect(formatarDataPtBr('')).toBe('Selecionar data');
  });
});
