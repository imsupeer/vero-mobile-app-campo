/**
 * Os formatos que o `api/v1` do ERP devolve.
 *
 * Só o essencial está tipado. O `cache` guarda o item como veio, então um
 * campo novo no servidor chega ao aparelho sem precisar de versão nova do
 * aplicativo — tipar tudo transformaria cada campo novo numa publicação na
 * loja.
 *
 * Tipe o que a tela usa. O resto atravessa.
 */

export type Usuario = {
  id: number;
  nome: string;
  perfil: string;
  /** `modulo.acao`. Use para não desenhar botão que vai dar 403. */
  permissoes: string[];
};

export type RespostaLogin = {
  /** Opaco, 64 caracteres hexadecimais. Vai no cabeçalho `Authorization`. */
  token: string;
  usuario: Usuario;
};

/** Todo item de `/sync/{modulo}` tem pelo menos isto. */
export type ItemSincronizado = {
  id: string | number;
  updated_at?: string;
  /** Tombstone: saiu do conjunto e deve sumir do cache local. */
  _excluido?: boolean | number;
};

/** Módulo `talhoes` — a válvula/quadra, unidade de trabalho do campo. */
export type Talhao = ItemSincronizado & {
  id: number;
  /**
   * O `id` acima é do SETOR/espelho; este é o id da válvula-pai (`agro_talhoes`).
   * É por ELE que alertas, fenologia e apontamentos se ligam à válvula — cruzar
   * por `id` erra o vínculo. Use `talhao_id ?? id`.
   */
  talhao_id?: number | null;
  nome?: string | null;
  codigo?: string | null;
  area_ha?: number | null;
  variedade?: string | null;
  variedade_id?: number | null;
  cultura?: string | null;
  cultura_atual_id?: number | null;
  fazenda?: string | null;
  geometria?: unknown;
  geometry?: unknown;
  centroide_lat?: number | string | null;
  centroide_lng?: number | string | null;
  /** Coordenada própria da válvula, usada como último fallback. */
  latitude?: number | string | null;
  longitude?: number | string | null;
  porta_enxerto?: string | null;
  estrutura_sistema?: string | null;
  num_plantas?: number | null;
  mip_metodologia?: "planta" | "folha" | "caixa" | "severidade" | string | null;
  mip_unidades_por_planta?: number | null;
};

/** Módulo `fazendas` — contexto e localização do tenant para o app de campo. */
export type Fazenda = ItemSincronizado & {
  id: number;
  nome: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
};

/** Módulo `fenologia` — retrato da fase atual de cada válvula. */
export type Fenologia = ItemSincronizado & {
  talhao_id?: number | string | null;
  fase_nome?: string | null;
  variedade?: string | null;
  dias_desde_poda?: number | string | null;
  dia_inicio?: number | string | null;
  dia_fim?: number | string | null;
  volume_mm_dia?: number | string | null;
  data_poda?: string | null;
  safra?: string | null;
};

/** Módulo `atividades` — o que se faz em campo.
 *  O `nome`/`unidade` alimentam o seletor do novo apontamento; os demais campos
 *  vêm do mesmo `/sync/atividades` e descrevem a atividade PLANEJADA (a OS), que
 *  a tela de atividades usa para mudar de status. */
export type Atividade = ItemSincronizado & {
  id: number;
  nome?: string | null;
  descricao?: string | null;
  unidade?: string | null;
  tipo?: string | null;
  status?: string | null;
  observacao?: string | null;
  data_planejada?: string | null;
  talhao_id?: number | null;
  talhao_nome?: string | null;
  fazenda?: string | null;
};

/** Catálogo do formulário Web; distinto das ordens de serviço `atividades`. */
export type TipoAtividade = ItemSincronizado & {
  id: number;
  nome?: string | null;
  categoria?:
    | "trato_cultural"
    | "colheita"
    | "aplicacao"
    | "irrigacao"
    | "packing"
    | "outro"
    | string
    | null;
  unidade_padrao?: string | null;
  exige_producao?: number | boolean | null;
  culturas?: string | number[] | null;
};

/** Parâmetros vigentes usados pelo estimador de mão de obra do Caderno. */
export type ParametroMaoDeObra = ItemSincronizado & {
  id: number;
  unidade_padrao?: string | null;
  rendimento?: number | string | null;
  rend_observado?: number | string | null;
  fator?: number | string | null;
  custo_propria?: number | string | null;
  custo_terceirizada?: number | string | null;
  premio_meta?: number | string | null;
  premio_valor?: number | string | null;
};

export type PlanejamentoMaoDeObra = {
  total?: string;
  unidade?: string;
  dias?: string;
  pessoas?: string;
  meta?: string;
  media?: string;
  premio?: string;
  base?: "prazo" | "pessoas";
};

export type SafraTalhao = ItemSincronizado & {
  id: number;
  talhao_id?: number | null;
  safra_id?: number | null;
  cultura_id?: number | null;
  cultura?: string | null;
  area_plantada_ha?: number | string | null;
  safra?: string | null;
  data_inicio?: string | null;
  data_poda?: string | null;
};

export type FaseVariedade = ItemSincronizado & {
  id: number;
  variedade_id: number;
  nome?: string | null;
  dia_inicio: number;
  dia_fim: number;
};

export type CentroCusto = ItemSincronizado & {
  id: number;
  codigo?: string | null;
  nome?: string | null;
  ativo?: number | boolean | null;
};

export type Nutriente = ItemSincronizado & {
  id: number;
  nome?: string | null;
  simbolo?: string | null;
  aplicacao?: "solo" | "foliar" | "ambos" | string | null;
  unidade_padrao?: string | null;
};

export type Variedade = ItemSincronizado & {
  id: number;
  cultura_id?: number | null;
  nome?: string | null;
};

export type FenologiaEstagio = ItemSincronizado & {
  id: number;
  cultura_id?: number | null;
  escala?: string | null;
  codigo?: string | null;
  nome?: string | null;
  ordem?: number | null;
};

/** Módulo `maquinas` — frota disponível para vincular ao apontamento. */
export type Maquina = ItemSincronizado & {
  id: number;
  nome?: string | null;
  descricao?: string | null;
  codigo?: string | null;
  placa?: string | null;
  horimetro_atual?: number | string | null;
  status?: string | null;
};

/** Módulo `maquina_registros` — histórico operacional, sem valores financeiros. */
export type MaquinaRegistro = ItemSincronizado & {
  id: string | number;
  registro_tipo: "horimetro" | "abastecimento";
  maquina_id: number;
  maquina?: string | null;
  codigo?: string | null;
  data?: string | null;
  horimetro?: number | string | null;
  litros?: number | string | null;
};

/** Módulo `apontamentos_abertos` — serviços já iniciados (retrato, não delta). */
export type ApontamentoAberto = ItemSincronizado & {
  id: number;
  client_uuid?: string | null;
  tipo?: string | null;
  talhao_id?: number | null;
  talhao_nome?: string | null;
  fazenda?: string | null;
  atividade?: string | null;
  atividade_id?: number | null;
  maquina_id?: number | null;
  responsavel?: string | null;
  observacao?: string | null;
  data_apontamento?: string | null;
  iniciado_em?: string | null;
  planejamento_mo?: string | PlanejamentoMaoDeObra | null;
};

/** Módulo `apontamentos` — o histórico do caderno (a tabela do site). É só
 *  leitura; o que o app CRIA continua indo pela fila via `POST /apontamentos`. */
export type ApontamentoHistorico = ItemSincronizado & {
  id: number;
  data?: string | null;
  tipo?: string | null;
  status?: string | null;
  talhao_id?: number | null;
  valvula?: string | null;
  talhao_nome?: string | null;
  fazenda?: string | null;
  atividade?: string | null;
  categoria?: string | null;
  responsavel?: string | null;
  pessoas?: number | string | null;
  producao?: number | string | null;
};

/** Módulo `colaboradores` — sem salário, por decisão de privacidade (P-75). */
export type Colaborador = ItemSincronizado & {
  id: string | number;
  pessoa_id?: string | number | null;
  nome?: string | null;
  funcao?: string | null;
  tipo_vinculo?: string | null;
  origem?: "colaborador" | "terceirizado" | null;
  modalidade_padrao?: "producao" | "diaria" | null;
};

/** Módulo `alertas`. */
export type Alerta = ItemSincronizado & {
  id: number;
  titulo?: string | null;
  mensagem?: string | null;
  severidade?: string | null;
  categoria?: string | null;
  data?: string | null;
  talhao_id?: number | string | null;
  fazenda?: string | null;
  status?: string | null;
};

/** Módulo `mip_referencias` — o catálogo de alvos (pragas/doenças) e seu nível
 *  de ação. É o divisor da pressão: infestação medida ÷ nível de ação. */
export type MipReferencia = ItemSincronizado & {
  id: number;
  nome?: string | null;
  tipo?: "praga" | "doenca" | string | null;
  nivel_acao?: number | string | null;
  ativo?: number | boolean | null;
};

export type MipPonto = ItemSincronizado & {
  id: number;
  talhao_id: number;
  nome?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
};

/** Módulo `mip_recebidos` — cada monitoramento MIP/MID de campo. Já traz o
 *  nome do alvo e o nível de ação, então a pressão sai sem novo join. */
export type MipRecebido = ItemSincronizado & {
  id: number;
  talhao_id?: number | string | null;
  alvo_id?: number | string | null;
  alvo_nome?: string | null;
  nivel_acao?: number | string | null;
  nivel_infestacao?: number | string | null;
  unidade?: string | null;
  local_infestacao?: string | null;
  data_monitoramento?: string | null;
  fazenda?: string | null;
};

/** Módulo `aplicacoes` — ordens de pulverização/fertirrigação (DF/IF) a executar.
 *  O app confirma a execução e coleta a assinatura do operador. */
export type AplicacaoItem = {
  item_id?: number | null;
  produto_id?: number | null;
  produto?: string | null;
  dose_valor?: number | string | null;
  dose_unidade?: string | null;
  quantidade_consumida?: number | string | null;
  quantidade_unidade?: string | null;
  carencia_dias?: number | string | null;
  intervalo_reentrada_horas?: number | string | null;
};
export type AplicacaoOperador = {
  operador_id: number;
  nome?: string | null;
  epi_codigo?: string | null;
  epi_lavagem?: number | boolean | string | null;
  epi_condicao?: string | null;
};
export type Aplicacao = ItemSincronizado & {
  id: number;
  tipo?: string | null;
  talhao_id?: number | null;
  talhao_nome?: string | null;
  status?: "planejada" | "registrada" | string | null;
  data?: string | null;
  data_prevista?: string | null;
  area_aplicada_ha?: number | string | null;
  volume_calda_l?: number | string | null;
  volume_calda_ha_l?: number | string | null;
  condicao_ceu?: string | null;
  observacao?: string | null;
  itens?: AplicacaoItem[] | null;
  operadores?: AplicacaoOperador[] | null;
  assinado_operador?: number | boolean | null;
  assinado_rt?: number | boolean | null;
};

/** Módulo `estoque_movimentacoes` — extrato sem dados de custo. */
export type EstoqueMovimentacao = ItemSincronizado & {
  id: number;
  produto_id?: number | null;
  produto?: string | null;
  unidade?: string | null;
  tipo?: string | null;
  quantidade?: number | string | null;
  data_movimento?: string | null;
  origem_tipo?: string | null;
  observacao?: string | null;
};

/** Módulo `estoque_lotes` — lotes com saldo e validade próxima/vencida. */
export type EstoqueLote = ItemSincronizado & {
  id: number;
  codigo_lote?: string | null;
  validade?: string | null;
  quantidade?: number | string | null;
  codigo?: string | null;
  produto?: string | null;
  unidade?: string | null;
};

/** Módulo `fornecedores` — apoio às compras. */
export type Fornecedor = ItemSincronizado & {
  id: number;
  nome?: string | null;
  cnpj_cpf?: string | null;
  telefone?: string | null;
  ativo?: number | boolean | null;
};

/** Módulo `compras_solicitacoes` — solicitações de compra (SC) já registradas. */
export type ComprasSolicitacaoItem = {
  produto_id?: number | null;
  descricao?: string | null;
  quantidade?: number | string | null;
  produto?: string | null;
};
export type ComprasSolicitacao = ItemSincronizado & {
  id: number;
  numero?: string | null;
  status?: string | null;
  data_solicitacao?: string | null;
  justificativa?: string | null;
  itens?: ComprasSolicitacaoItem[] | null;
};

/** Módulo `compras_pedidos` — pedidos de compra, com itens para o recebimento. */
export type ComprasPedidoItem = {
  pedido_item_id: number;
  produto_id?: number | null;
  descricao?: string | null;
  quantidade?: number | string | null;
  quantidade_recebida?: number | string | null;
  valor_unitario?: number | string | null;
  produto?: string | null;
  controla_validade?: number | boolean | null;
};
export type ComprasPedido = ItemSincronizado & {
  id: number;
  numero?: string | null;
  status?: string | null;
  valor_total?: number | string | null;
  data_pedido?: string | null;
  data_entrega_prevista?: string | null;
  fornecedor?: string | null;
  acima_orcamento?: number | boolean | null;
  itens?: ComprasPedidoItem[] | null;
};

/** Módulo `compras_aprovacoes_pendentes` — fila de aprovação (retrato). O `id` é
 *  o do pedido; `aprovacao_id` identifica a decisão pendente. */
export type ComprasAprovacaoPendente = ItemSincronizado & {
  id: number;
  aprovacao_id?: number | null;
  numero?: string | null;
  valor_total?: number | string | null;
  acima_orcamento?: number | boolean | null;
  data_pedido?: string | null;
  fornecedor?: string | null;
  itens_qtd?: number | string | null;
  enviado_em?: string | null;
};

/** Módulo `colheitas_pendentes` — colheitas lançadas no escritório aguardando o
 *  realizado do campo (retrato). */
export type ColheitaPendente = ItemSincronizado & {
  id: number;
  setor_id?: number | null;
  talhao_id?: number | null;
  variedade_id?: number | null;
  setor_nome?: string | null;
  talhao_nome?: string | null;
  variedade?: string | null;
  data_colheita?: string | null;
  kg_total_previsto?: number | string | null;
};

/** Módulo `colheitas_registros` — registros recentes para vincular a uma carga. */
export type ColheitaRegistro = ItemSincronizado & {
  id: number;
  setor_id?: number | null;
  talhao_id?: number | null;
  safra_talhao_id?: number | null;
  data_colheita?: string | null;
  setor_nome?: string | null;
  valvula?: string | null;
  safra?: string | null;
};

/** Módulo `produtividade` — kg/ha realizado por válvula (sem dinheiro, P-75). */
export type Produtividade = ItemSincronizado & {
  id: number;
  safra_id?: number | null;
  safra?: string | null;
  cultura_id?: number | null;
  valvula?: string | null;
  fazenda?: string | null;
  variedade?: string | null;
  cultura?: string | null;
  area_ha?: number | string | null;
  kg_realizado?: number | string | null;
  kg_previsto?: number | string | null;
  produtividade_planejada?: number | string | null;
  kg_ha?: number | string | null;
  ultima_colheita?: string | null;
  colheitas?: number | string | null;
};

/** Módulo `irrigacao_planejado` — planejado × realizado por planejamento. */
export type IrrigacaoPlanejado = ItemSincronizado & {
  id: number;
  talhao_id?: number | null;
  talhao?: string | null;
  fazenda?: string | null;
  pivo?: string | null;
  area_ha?: number | string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  lamina_alvo?: number | string | null;
  lamina_apontada?: number | string | null;
  agua_m3?: number | string | null;
  horas?: number | string | null;
  eventos?: number | string | null;
};

/** Módulo `irrigacao_consumo` — água/energia/horas e custo por válvula. */
export type IrrigacaoConsumo = ItemSincronizado & {
  id: number;
  talhao?: string | null;
  fazenda?: string | null;
  area_ha?: number | string | null;
  agua_m3?: number | string | null;
  energia_kwh?: number | string | null;
  horas?: number | string | null;
  custo_total?: number | string | null;
};

/** Módulos `analise_solo` / `analise_foliar` — laudo com os resultados por nutriente. */
export type ResultadoAnalise = {
  simbolo?: string | null;
  nome?: string | null;
  valor?: number | string | null;
  unidade?: string | null;
  classificacao?: string | null;
};
export type AnaliseNutricional = ItemSincronizado & {
  id: number;
  data_amostra?: string | null;
  talhao_id?: number | null;
  talhao?: string | null;
  valvula?: string | null;
  fazenda?: string | null;
  safra?: string | null;
  contexto?: string | null;
  origem?: string | null;
  status?: string | null;
  observacao?: string | null;
  resultados?: ResultadoAnalise[] | null;
};

/** Módulo `financeiro` — consulta de títulos, sem movimentação pelo aplicativo. */
export type TituloFinanceiro = ItemSincronizado & {
  tipo?: "pagar" | "receber" | string | null;
  descricao?: string | null;
  fornecedor?: string | null;
  cliente?: string | null;
  documento?: string | null;
  origem_tipo?: string | null;
  valor?: number | string | null;
  data_emissao?: string | null;
  data_vencimento?: string | null;
  data_pagamento?: string | null;
  centro_custo?: string | null;
  plano_conta?: string | null;
  conta_bancaria?: string | null;
  forma_pagamento?: string | null;
  fazenda?: string | null;
  status?: string | null;
  /** Calculado pelo ERP. Nunca recalcular usando o relógio do aparelho. */
  vencido?: boolean | number | string | null;
};
