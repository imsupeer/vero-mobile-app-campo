import { describe, expect, test } from "@jest/globals";

import {
  resumirAtividades,
  resumirCargas,
  resumirColheitaPorSafra,
  resumirEstoque,
  resumirLotesVencendo,
} from "./modelo";

describe("resumos do painel operacional", () => {
  test("ignora atividades canceladas e conta conclusão só nos últimos 30 dias", () => {
    expect(
      resumirAtividades(
        [
          { status: "planejada", data_planejada: "2026-10-06" },
          { status: "em_execucao" },
          { status: "concluida", updated_at: "2026-10-01 10:00:00" },
          { status: "concluida", updated_at: "2026-08-01 10:00:00" },
          { status: "cancelada" },
        ],
        "2026-10-07",
        "2026-09-07",
      ),
    ).toEqual({ planejadas: 1, execucao: 1, concluidas: 1, atrasadas: 1 });
  });

  test("soma cargas dos últimos 30 dias e respeita a fazenda selecionada", () => {
    expect(
      resumirCargas(
        [
          { data_carga: "2026-10-07", peso_kg: "50", classificacao: "A", fazenda: "Santa Luzia" },
          { data_carga: "2026-09-06", peso_kg: 20, classificacao: "A", fazenda: "Santa Luzia" },
          { data_carga: "2026-10-08", peso_kg: 99, classificacao: "B", fazenda: "Santa Luzia" },
          { data_carga: "2026-10-07", peso_kg: 10, classificacao: "B", fazenda: "Fazenda Modelo" },
        ],
        "Santa Luzia",
        "2026-09-07",
        "2026-10-07",
      ),
    ).toEqual({ total: 50, porClasse: [["A", 50]] });
  });

  test("estoque lista primeiro os produtos proporcionalmente mais abaixo do mínimo", () => {
    expect(
      resumirEstoque([
        { codigo: "A", nome: "Adubo", saldo: 5, estoque_minimo: 10 },
        { codigo: "B", nome: "Defensivo", saldo: 0, estoque_minimo: 2 },
        { codigo: "C", nome: "Sem mínimo", saldo: 0, estoque_minimo: 0 },
        { codigo: "D", nome: "Normal", saldo: 20, estoque_minimo: 10 },
      ]),
    ).toEqual({
      total: 2,
      itens: [
        { codigo: "B", nome: "Defensivo", saldo: 0, estoque_minimo: 2, saldoNumero: 0, minimoNumero: 2 },
        { codigo: "A", nome: "Adubo", saldo: 5, estoque_minimo: 10, saldoNumero: 5, minimoNumero: 10 },
      ],
    });
  });

  test("colheita agrega previsto e realizado por safra e fazenda", () => {
    expect(
      resumirColheitaPorSafra(
        [
          { safra: "2026/2", fazenda: "Santa Luzia", kg_previsto: "100", kg_realizado: 80 },
          { safra: "2026/2", fazenda: "Santa Luzia", kg_previsto: 50, kg_realizado: "40" },
          { safra: "2026/1", fazenda: "Outra", kg_previsto: 70, kg_realizado: 65 },
        ],
        "Santa Luzia",
      ),
    ).toEqual([{ safra: "2026/2", previsto: 150, realizado: 120 }]);
  });

  test("prioriza lotes vencidos e próximos do vencimento e ignora saldo zero", () => {
    const resumo = resumirLotesVencendo([
      { id: 1, codigo_lote: "A", validade: "2026-10-06", quantidade: "2" },
      { id: 2, codigo_lote: "B", validade: "2026-10-10", quantidade: 5 },
      { id: 3, codigo_lote: "C", validade: "2026-11-15", quantidade: 1 },
      { id: 4, codigo_lote: "D", validade: "2026-10-07", quantidade: 0 },
    ], "2026-10-07", "2026-11-06");

    expect(resumo.total).toBe(2);
    expect(resumo.itens.map(({ codigo_lote, vencido }) => [codigo_lote, vencido])).toEqual([
      ["A", true],
      ["B", false],
    ]);
  });

});
