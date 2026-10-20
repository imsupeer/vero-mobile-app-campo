import type { Produtividade } from '@/api/tipos';

/** Consolida linhas por válvula, como a visão "todas as safras" do Web. */
export function consolidarPorValvula(registros: readonly Produtividade[]): Produtividade[] {
  const porValvula = new Map<number, Produtividade>();

  for (const item of registros) {
    const anterior = porValvula.get(item.id);
    if (anterior === undefined) {
      porValvula.set(item.id, { ...item });
      continue;
    }

    const kg = Number(anterior.kg_realizado ?? 0) + Number(item.kg_realizado ?? 0);
    const area = Number(anterior.area_ha ?? 0) + Number(item.area_ha ?? 0);
    const planos = [anterior.produtividade_planejada, item.produtividade_planejada]
      .filter((valor): valor is number | string => valor != null)
      .map(Number)
      .filter(Number.isFinite);

    porValvula.set(item.id, {
      ...anterior,
      kg_realizado: kg,
      kg_previsto: Number(anterior.kg_previsto ?? 0) + Number(item.kg_previsto ?? 0),
      area_ha: area,
      kg_ha: area > 0 ? kg / area : null,
      produtividade_planejada: planos.length > 0
        ? planos.reduce((soma, valor) => soma + valor, 0) / planos.length
        : null,
      colheitas: Number(anterior.colheitas ?? 0) + Number(item.colheitas ?? 0),
      ultima_colheita: String(anterior.ultima_colheita ?? '') > String(item.ultima_colheita ?? '')
        ? anterior.ultima_colheita
        : item.ultima_colheita,
    });
  }

  return [...porValvula.values()].sort((a, b) => (Number(b.kg_realizado) || 0) - (Number(a.kg_realizado) || 0));
}
