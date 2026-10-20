import type { Alerta, ApontamentoAberto, Talhao } from '@/api/tipos';

export type EstadoSituacao = 'normal' | 'servico' | 'alerta';

/** Propaga apontamentos/alertas da válvula-pai para todos os setores exibidos no mapa. */
export function estadosPorSetor(
  areas: Talhao[],
  apontamentos: ApontamentoAberto[],
  alertas: Alerta[],
): Record<string, EstadoSituacao> {
  const estados: Record<string, EstadoSituacao> = {};
  const setoresPorTalhao = new Map<string, string[]>();

  for (const area of areas) {
    estados[String(area.id)] = 'normal';
    const talhaoId = String(area.talhao_id ?? area.id);
    const setores = setoresPorTalhao.get(talhaoId) ?? [];
    setores.push(String(area.id));
    setoresPorTalhao.set(talhaoId, setores);
  }

  for (const apontamento of apontamentos) {
    if (apontamento.talhao_id == null) continue;
    for (const setorId of setoresPorTalhao.get(String(apontamento.talhao_id)) ?? []) {
      estados[setorId] = 'servico';
    }
  }

  for (const alerta of alertas) {
    if (alerta.talhao_id == null || (alerta.status != null && alerta.status !== 'aberto')) continue;
    for (const setorId of setoresPorTalhao.get(String(alerta.talhao_id)) ?? []) {
      estados[setorId] = 'alerta';
    }
  }

  return estados;
}
