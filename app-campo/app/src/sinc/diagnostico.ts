import type { FalhaLeitura } from '@/sinc/motor';

const ROTULOS_MODULOS: Record<string, string> = {
  talhoes: 'Válvulas e fazenda',
  safras: 'Safras',
  atividades: 'Atividades',
  tipos_atividade: 'Tipos de atividade',
  maquinas: 'Máquinas',
  fenologia: 'Fenologia',
  apontamentos_abertos: 'Serviços em campo',
  apontamentos: 'Histórico do Caderno',
  colaboradores: 'Colaboradores',
  alertas: 'Alertas',
  mip_referencias: 'Referências MIP',
  mip_recebidos: 'Monitoramentos MIP',
  financeiro: 'Títulos financeiros',
  estoque: 'Estoque',
  estoque_lotes: 'Lotes próximos do vencimento',
  estoque_movimentacoes: 'Movimentações de estoque',
  compras_pedidos: 'Pedidos de compra',
  cargas_colheita: 'Cargas de colheita',
  aplicacoes: 'Aplicações',
  fornecedores: 'Fornecedores',
  compras_solicitacoes: 'Solicitações de compra',
  compras_aprovacoes_pendentes: 'Aprovações de compra',
  colheitas_pendentes: 'Colheitas previstas',
  colheitas_registros: 'Registros de colheita',
  variedade_fases: 'Fases por variedade',
  centros_custo: 'Centros de custo',
  produtividade: 'Produtividade',
  irrigacao_planejado: 'Planejamento de irrigação',
  irrigacao_consumo: 'Consumo de irrigação',
  analise_solo: 'Análises de solo',
  analise_foliar: 'Análises foliares',
};

export function falhaDePermissao(falha: FalhaLeitura): boolean {
  return falha.codigo === 'sem_permissao';
}

export function rotuloModulo(modulo: string): string {
  return ROTULOS_MODULOS[modulo] ?? modulo.replace(/_/g, ' ');
}

export function motivoFalhaLeitura(codigo: string): string {
  switch (codigo) {
    case 'sem_conexao': return 'Sem conexão com o servidor.';
    case 'host_nao_encontrado': return 'Endereço da empresa não encontrado.';
    case 'resposta_invalida': return 'O servidor devolveu uma resposta inválida.';
    case 'rota_desconhecida':
    case 'modulo_desconhecido': return 'Esta consulta não está disponível na API.';
    case 'sem_permissao': return 'Seu perfil não tem acesso a esta consulta.';
    default: return 'Não foi possível atualizar esta consulta.';
  }
}
