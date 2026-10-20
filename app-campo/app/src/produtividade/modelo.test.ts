import { describe, expect, test } from '@jest/globals';
import { consolidarPorValvula } from '@/produtividade/modelo';
import type { Produtividade } from '@/api/tipos';

const linha = (dados: Partial<Produtividade>): Produtividade => ({
  id: 1,
  kg_realizado: 0,
  kg_previsto: 0,
  area_ha: 0,
  colheitas: 0,
  ...dados,
});

describe('consolidarPorValvula', () => {
  test('soma volume e área por safra e calcula kg/ha ponderado', () => {
    const resultado = consolidarPorValvula([
      linha({ safra_id: 1, area_ha: 2, kg_realizado: 6000, kg_previsto: 7000, colheitas: 2, produtividade_planejada: 4000, ultima_colheita: '2026-01-10' }),
      linha({ safra_id: 2, area_ha: 3, kg_realizado: 12000, kg_previsto: 15000, colheitas: 3, produtividade_planejada: 5000, ultima_colheita: '2026-07-22' }),
    ]);

    expect(resultado).toHaveLength(1);
    expect(resultado[0]).toMatchObject({
      area_ha: 5,
      kg_realizado: 18000,
      kg_previsto: 22000,
      kg_ha: 3600,
      produtividade_planejada: 4500,
      colheitas: 5,
      ultima_colheita: '2026-07-22',
    });
  });

  test('ignora metas nulas ao calcular a média e mantém válvulas distintas', () => {
    const resultado = consolidarPorValvula([
      linha({ id: 1, produtividade_planejada: null, kg_realizado: 10 }),
      linha({ id: 1, produtividade_planejada: 300, kg_realizado: 20 }),
      linha({ id: 2, produtividade_planejada: null, kg_realizado: 5 }),
    ]);

    expect(resultado.map((item) => item.id)).toEqual([1, 2]);
    expect(resultado[0]?.produtividade_planejada).toBe(300);
    expect(resultado[1]?.produtividade_planejada).toBeNull();
  });
});
