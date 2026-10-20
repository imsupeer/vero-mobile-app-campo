/**
 * Retrocede o cursor para compensar a diferença entre o relógio do PHP e o
 * timestamp `updated_at` gravado pelo banco. O backend conhecido pode adiantar
 * até 3 h; a margem de 1 h também cobre registros criados durante uma rodada.
 */
export function cursorComSobreposicao(cursor: string, horas = 4): string {
  const data = new Date(`${cursor.replace(' ', 'T')}Z`);
  if (!Number.isFinite(data.getTime())) return cursor;
  data.setUTCHours(data.getUTCHours() - horas);
  return data.toISOString().slice(0, 19).replace('T', ' ');
}
