export type TipoColuna = 'texto' | 'numero' | 'moeda' | 'data' | 'status';
export type ColunaRelatorio = { campo: string; titulo: string; tipo: TipoColuna; largura?: number; campoAlternativo?: string };
/** As seções do Painel de Relatórios, na ordem em que aparecem — espelham os
 *  grupos do VERO web (Estoque, Compras, Colheita). */
export type CategoriaRelatorio = 'Operações' | 'Estoque' | 'Compras' | 'Colheita';
export const ORDEM_CATEGORIAS: CategoriaRelatorio[] = ['Operações', 'Estoque', 'Compras', 'Colheita'];

export type Relatorio = { id: string; titulo: string; descricao: string; categoria: CategoriaRelatorio; modulo: string; permissoes: string[]; colunas: ColunaRelatorio[] };

/** O Web autoriza cada conjunto pelo micro-relatório, não por `relatorios.ver`. */
export function podeAcessarRelatorio(relatorio: Relatorio, pode: (permissao: string) => boolean): boolean {
  return relatorio.permissoes.some(pode);
}

export function relatoriosDisponiveis(pode: (permissao: string) => boolean): Relatorio[] {
  return CATALOGO_RELATORIOS.filter((relatorio) => podeAcessarRelatorio(relatorio, pode));
}

/** Contratos explícitos dos quatro conjuntos documentados para consulta no campo. */
export const CATALOGO_RELATORIOS: Relatorio[] = [
  { id: 'apontamentos', titulo: 'Apontamentos de campo', descricao: 'Registros de campo sincronizados; valores financeiros não são exibidos no app.', categoria: 'Operações', modulo: 'apontamentos', permissoes: ['relatorios.relatorios_operacionais.ver', 'caderno.ver', 'agro.apontamentos_campo.ver'], colunas: [
    { campo: 'data', titulo: 'Data', tipo: 'data', largura: 130 }, { campo: 'atividade', titulo: 'Atividade', tipo: 'texto', largura: 220 }, { campo: 'valvula', titulo: 'Válvula', tipo: 'texto', largura: 130 }, { campo: 'pessoas', titulo: 'Pessoas', tipo: 'numero', largura: 100 }, { campo: 'producao', titulo: 'Produção', tipo: 'numero', largura: 130 },
  ] },
  { id: 'atividades', titulo: 'Atividades planejadas', descricao: 'Atividades e status disponíveis no aparelho.', categoria: 'Operações', modulo: 'atividades', permissoes: ['relatorios.relatorios_operacionais.ver', 'caderno.ver', 'agro.planejamento_atividades.ver'], colunas: [
    { campo: 'data_planejada', titulo: 'Data planejada', tipo: 'data', largura: 150 }, { campo: 'descricao', titulo: 'Atividade', tipo: 'texto', largura: 240 }, { campo: 'tipo', titulo: 'Tipo', tipo: 'texto', largura: 140 }, { campo: 'talhao_nome', titulo: 'Válvula', tipo: 'texto', largura: 140 }, { campo: 'status', titulo: 'Status', tipo: 'status', largura: 140 },
  ] },
  { id: 'aplicacoes', titulo: 'Aplicações (DF/IF)', descricao: 'Ordens e execuções sincronizadas; custos permanecem no ERP.', categoria: 'Operações', modulo: 'aplicacoes', permissoes: ['relatorios.relatorios_operacionais.ver', 'mip.ver', 'mip.aplicacoes_defensivos.editar'], colunas: [
    { campo: 'data', campoAlternativo: 'data_prevista', titulo: 'Data', tipo: 'data', largura: 130 }, { campo: 'tipo', titulo: 'Tipo', tipo: 'texto', largura: 160 }, { campo: 'talhao_nome', titulo: 'Válvula', tipo: 'texto', largura: 160 }, { campo: 'area_aplicada_ha', titulo: 'Área (ha)', tipo: 'numero', largura: 120 }, { campo: 'status', titulo: 'Status', tipo: 'status', largura: 140 },
  ] },
  { id: 'estoque', titulo: 'Posição de estoque', descricao: 'Saldos e estoque mínimo, sem custos.', categoria: 'Estoque', modulo: 'estoque', permissoes: ['relatorios.relatorios_estoque.ver', 'estoque.ver', 'estoque.produtos_insumos.ver'], colunas: [
    { campo: 'codigo', titulo: 'Código', tipo: 'texto', largura: 120 }, { campo: 'nome', titulo: 'Produto', tipo: 'texto', largura: 220 }, { campo: 'saldo', titulo: 'Saldo', tipo: 'numero', largura: 110 }, { campo: 'unidade', titulo: 'Un.', tipo: 'texto', largura: 80 }, { campo: 'estoque_minimo', titulo: 'Mínimo', tipo: 'numero', largura: 110 },
  ] },
  { id: 'movimentacoes', titulo: 'Movimentações de estoque', descricao: 'Entradas, saídas e ajustes, sem custos.', categoria: 'Estoque', modulo: 'estoque_movimentacoes', permissoes: ['relatorios.relatorios_estoque.ver', 'estoque.ver', 'estoque.historico_movimentacoes.ver'], colunas: [
    { campo: 'data_movimento', titulo: 'Data', tipo: 'data', largura: 130 }, { campo: 'produto', titulo: 'Produto', tipo: 'texto', largura: 220 }, { campo: 'tipo', titulo: 'Tipo', tipo: 'status', largura: 130 }, { campo: 'quantidade', titulo: 'Quantidade', tipo: 'numero', largura: 130 }, { campo: 'unidade', titulo: 'Un.', tipo: 'texto', largura: 80 }, { campo: 'origem_tipo', titulo: 'Origem', tipo: 'texto', largura: 140 },
  ] },
  { id: 'compras', titulo: 'Pedidos de compra', descricao: 'Acompanhamento dos pedidos emitidos no ERP.', categoria: 'Compras', modulo: 'compras_pedidos', permissoes: ['relatorios.relatorios_compras.ver', 'compras.ver', 'compras.pedidos_compra.ver'], colunas: [
    { campo: 'numero', titulo: 'Número', tipo: 'texto', largura: 130 }, { campo: 'fornecedor', titulo: 'Fornecedor', tipo: 'texto', largura: 220 }, { campo: 'status', titulo: 'Status', tipo: 'status', largura: 150 }, { campo: 'valor_total', titulo: 'Valor', tipo: 'moeda', largura: 140 }, { campo: 'data_pedido', titulo: 'Data', tipo: 'data', largura: 130 },
  ] },
  { id: 'cargas', titulo: 'Cargas de colheita', descricao: 'Romaneios e destinos das cargas do campo.', categoria: 'Colheita', modulo: 'cargas_colheita', permissoes: ['relatorios.relatorios_colheita.ver', 'agro.romaneios_colheita.ver', 'agro.romaneios_colheita.editar'], colunas: [
    { campo: 'romaneio', titulo: 'Romaneio', tipo: 'texto', largura: 150 }, { campo: 'data_carga', titulo: 'Data', tipo: 'data', largura: 130 }, { campo: 'talhao', titulo: 'Válvula', tipo: 'texto', largura: 120 }, { campo: 'fazenda', titulo: 'Fazenda', tipo: 'texto', largura: 180 }, { campo: 'classificacao', titulo: 'Classificação', tipo: 'status', largura: 140 }, { campo: 'peso_kg', titulo: 'Peso (kg)', tipo: 'numero', largura: 130 }, { campo: 'destino', titulo: 'Destino', tipo: 'status', largura: 130 },
  ] },
];

export function formatarCelula(valor: unknown, tipo: TipoColuna): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  if (tipo === 'numero') {
    const numero = Number(valor); return Number.isFinite(numero) ? numero.toLocaleString('pt-BR', { maximumFractionDigits: 3 }) : '—';
  }
  if (tipo === 'moeda') {
    const numero = Number(valor); return Number.isFinite(numero) ? numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';
  }
  if (tipo === 'data') {
    const partes = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
    return partes == null ? String(valor) : `${partes[3]}/${partes[2]}/${partes[1]}${partes[4] ? ` ${partes[4]}:${partes[5]}` : ''}`;
  }
  return String(valor).replace(/_/g, ' ');
}

export function valorColuna(registro: Record<string, unknown>, coluna: ColunaRelatorio): unknown {
  const valor = registro[coluna.campo];
  return valor == null || valor === '' ? registro[coluna.campoAlternativo ?? ''] : valor;
}

export function larguraTabela(relatorio: Relatorio): number {
  return relatorio.colunas.reduce((total, coluna) => total + (coluna.largura ?? 140), 0);
}
