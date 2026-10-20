/** Conversões de data civil sem aplicar deslocamento de fuso horário. */
export function dataLocalDaIso(valor: string): Date | null {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (partes === null) return null;

  const ano = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  const data = new Date(ano, mes - 1, dia, 12);
  if (data.getFullYear() !== ano || data.getMonth() !== mes - 1 || data.getDate() !== dia) return null;
  return data;
}

export function dataLocalParaIso(data: Date): string {
  const ano = String(data.getFullYear()).padStart(4, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function formatarDataPtBr(valor: string): string {
  const data = dataLocalDaIso(valor);
  if (data === null) return 'Selecionar data';
  return `${String(data.getDate()).padStart(2, '0')}/${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;
}
