import { describe, expect, test } from '@jest/globals';

import type { Alerta, ApontamentoAberto, Talhao } from '@/api/tipos';
import { estadosPorSetor } from './estados';

const areas = [
  { id: 10, talhao_id: 1 },
  { id: 11, talhao_id: 1 },
  { id: 20, talhao_id: 2 },
] as Talhao[];

describe('estados de situação do mapa', () => {
  test('propaga serviço aberto para todos os setores da válvula', () => {
    const resultado = estadosPorSetor(areas, [{ id: 3, talhao_id: 1 } as ApontamentoAberto], []);
    expect(resultado).toEqual({ '10': 'servico', '11': 'servico', '20': 'normal' });
  });

  test('alerta aberto prevalece sobre serviço em todos os setores vinculados', () => {
    const resultado = estadosPorSetor(
      areas,
      [{ id: 3, talhao_id: 1 } as ApontamentoAberto],
      [{ id: 4, talhao_id: 1, status: 'aberto' } as Alerta],
    );
    expect(resultado['10']).toBe('alerta');
    expect(resultado['11']).toBe('alerta');
  });

  test('ignora alertas já tratados', () => {
    const resultado = estadosPorSetor(areas, [], [{ id: 4, talhao_id: 1, status: 'reconhecido' } as Alerta]);
    expect(resultado['10']).toBe('normal');
    expect(resultado['11']).toBe('normal');
  });
});
