import type { TituloFinanceiro } from '@/api/tipos';

export type TipoFiltro = 'pagar' | 'receber';
export type PeriodoFiltro = 'todos' | 'mes_atual' | '30_dias' | 'vencidos';
export type SituacaoTitulo = 'vencido' | 'aberto' | 'quitado';

/** Defesa no cliente contra registros em cache fora do escopo financeiro atual. */
export function filtrarTitulosPermitidos(
  titulos: TituloFinanceiro[],
  podePagar: boolean,
  podeReceber: boolean,
): TituloFinanceiro[] {
  return titulos.filter((titulo) =>
    titulo.tipo === 'pagar' ? podePagar : titulo.tipo === 'receber' && podeReceber,
  );
}

export function estaVencido(titulo: TituloFinanceiro): boolean {
  return titulo.vencido === true || titulo.vencido === 1 || titulo.vencido === '1' || titulo.vencido === 'true';
}

export function situacao(titulo: TituloFinanceiro): SituacaoTitulo {
  const status = String(titulo.status ?? '').toLowerCase();
  if (status === 'pago' || status === 'baixado' || status === 'recebido' || status === 'quitado') return 'quitado';
  return estaVencido(titulo) ? 'vencido' : 'aberto';
}

function isoLocal(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

export function intervalo(periodo: PeriodoFiltro, hoje = new Date()): { inicio: string; fim: string } | null {
  if (periodo === 'todos' || periodo === 'vencidos') return null;
  if (periodo === 'mes_atual') {
    return { inicio: `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`, fim: isoLocal(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)) };
  }
  const fim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 30);
  return { inicio: isoLocal(hoje), fim: isoLocal(fim) };
}

export function filtrarTitulos(titulos: TituloFinanceiro[], tipo: TipoFiltro, periodo: PeriodoFiltro, hoje = new Date()): TituloFinanceiro[] {
  const faixa = intervalo(periodo, hoje);
  return titulos.filter((titulo) => {
    if (titulo.tipo !== tipo) return false;
    if (periodo === 'vencidos') return situacao(titulo) === 'vencido';
    if (faixa === null) return true;
    const vencimento = String(titulo.data_vencimento ?? '').slice(0, 10);
    return vencimento !== '' && vencimento >= faixa.inicio && vencimento <= faixa.fim;
  }).sort((a, b) => {
    const peso = (titulo: TituloFinanceiro) => situacao(titulo) === 'vencido' ? 0 : situacao(titulo) === 'aberto' ? 1 : 2;
    return peso(a) - peso(b) || String(a.data_vencimento ?? '9999').localeCompare(String(b.data_vencimento ?? '9999'));
  });
}

export function formatarReais(valor: number | string | null | undefined): string {
  return (Number(valor) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatarData(valor: string | null | undefined): string {
  const partes = String(valor ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return partes == null ? 'Sem vencimento' : `${partes[3]}/${partes[2]}/${partes[1]}`;
}
