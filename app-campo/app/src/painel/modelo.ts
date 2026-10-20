type AtividadePainel = {
  status?: string | null;
  data_planejada?: string | null;
  updated_at?: string | null;
};

type CargaPainel = {
  peso_kg?: number | string | null;
  classificacao?: string | null;
  data_carga?: string | null;
  fazenda?: string | null;
};

type ProdutoPainel = {
  codigo?: string | null;
  nome?: string | null;
  unidade?: string | null;
  estoque_minimo?: number | string | null;
  saldo?: number | string | null;
};

type LotePainel = {
  id: number | string;
  codigo_lote?: string | null;
  validade?: string | null;
  quantidade?: number | string | null;
  codigo?: string | null;
  produto?: string | null;
  unidade?: string | null;
};

type ProdutividadePainel = {
  safra?: string | null;
  fazenda?: string | null;
  kg_previsto?: number | string | null;
  kg_realizado?: number | string | null;
};

function dia(valor?: string | null): string {
  return String(valor ?? "").slice(0, 10);
}

export function resumirAtividades(
  atividades: AtividadePainel[],
  hoje: string,
  cutoff: string,
) {
  const resumo = {
    planejadas: 0,
    execucao: 0,
    concluidas: 0,
    atrasadas: 0,
  };

  for (const atividade of atividades) {
    switch (atividade.status ?? "planejada") {
      case "planejada":
        resumo.planejadas += 1;
        if (dia(atividade.data_planejada) && dia(atividade.data_planejada) < hoje)
          resumo.atrasadas += 1;
        break;
      case "em_execucao":
        resumo.execucao += 1;
        break;
      case "concluida":
        if (dia(atividade.updated_at) >= cutoff) resumo.concluidas += 1;
        break;
    }
  }

  return resumo;
}

export function resumirCargas(
  cargas: CargaPainel[],
  fazenda: string | null,
  cutoff: string,
  hoje: string,
) {
  const porClasse = new Map<string, number>();
  let total = 0;

  for (const carga of cargas) {
    const data = dia(carga.data_carga);
    if (!data || data < cutoff || data > hoje) continue;
    if (fazenda != null && (carga.fazenda ?? "").trim() !== fazenda) continue;

    const peso = Number(carga.peso_kg) || 0;
    total += peso;
    const classe = carga.classificacao ?? "Sem classificação";
    porClasse.set(classe, (porClasse.get(classe) ?? 0) + peso);
  }

  return {
    total,
    porClasse: [...porClasse.entries()].sort((a, b) => b[1] - a[1]),
  };
}

export function resumirEstoque(produtos: ProdutoPainel[]) {
  const abaixo = produtos
    .map((produto) => ({
      ...produto,
      saldoNumero: Number(produto.saldo) || 0,
      minimoNumero: Number(produto.estoque_minimo) || 0,
    }))
    .filter((produto) => produto.minimoNumero > 0 && produto.saldoNumero < produto.minimoNumero)
    .sort((a, b) => a.saldoNumero / a.minimoNumero - b.saldoNumero / b.minimoNumero);

  return { total: abaixo.length, itens: abaixo.slice(0, 8) };
}

export function resumirLotesVencendo(
  lotes: LotePainel[],
  hoje: string,
  ate: string,
  limite = 8,
) {
  const elegiveis = lotes
    .map((lote) => ({
      ...lote,
      quantidadeNumero: Number(lote.quantidade) || 0,
      validadeDia: dia(lote.validade),
    }))
    .filter((lote) => lote.quantidadeNumero > 0 && lote.validadeDia !== "" && lote.validadeDia <= ate)
    .sort((a, b) => a.validadeDia.localeCompare(b.validadeDia) || String(a.id).localeCompare(String(b.id)))
    .map((lote) => ({ ...lote, vencido: lote.validadeDia < hoje }));

  return { total: elegiveis.length, itens: elegiveis.slice(0, limite) };
}

export function resumirColheitaPorSafra(
  registros: ProdutividadePainel[],
  fazenda: string | null,
) {
  const safras = new Map<string, { previsto: number; realizado: number }>();
  for (const registro of registros) {
    const safra = registro.safra?.trim();
    if (!safra || (fazenda != null && (registro.fazenda ?? "").trim() !== fazenda)) continue;
    const total = safras.get(safra) ?? { previsto: 0, realizado: 0 };
    total.previsto += Number(registro.kg_previsto) || 0;
    total.realizado += Number(registro.kg_realizado) || 0;
    safras.set(safra, total);
  }
  return [...safras.entries()]
    .map(([safra, valores]) => ({ safra, ...valores }))
    .sort((a, b) => b.safra.localeCompare(a.safra))
    .slice(0, 5);
}
