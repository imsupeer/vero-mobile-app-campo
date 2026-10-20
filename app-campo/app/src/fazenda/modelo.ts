import type { Talhao } from '@/api/tipos';

/** Extrai os nomes de fazenda efetivamente presentes nas válvulas do tenant. */
export function listarFazendas(talhoes: Talhao[]): string[] {
  return Array.from(
    new Set(talhoes.map((talhao) => (talhao.fazenda ?? '').trim()).filter((nome) => nome !== '')),
  ).sort((a, b) => a.localeCompare(b));
}

export function filtrarPorFazenda<T extends { fazenda?: string | null }>(itens: T[], fazenda: string | null): T[] {
  const selecionada = fazenda?.trim();
  if (!selecionada) return [];
  return itens.filter((item) => (item.fazenda ?? '').trim() === selecionada);
}

export function filtrarPorTalhoes<T extends { carga: { talhao_id?: number } }>(itens: T[], idsTalhoes: ReadonlySet<number>): T[] {
  return itens.filter((item) => item.carga.talhao_id != null && idsTalhoes.has(Number(item.carga.talhao_id)));
}
