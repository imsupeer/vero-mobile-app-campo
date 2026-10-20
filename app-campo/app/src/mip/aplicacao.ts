/** Converte números digitados no padrão brasileiro ou decimal da API. */
export function decimalAplicacao(valor: string | number | null | undefined): number | null {
  if (valor == null || String(valor).trim() === '') return null;
  const texto = String(valor).trim().replace(/\s/g, '');
  const normalizado = texto.includes(',') ? texto.replace(/\./g, '').replace(',', '.') : texto;
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : null;
}

export function horaAplicacaoValida(inicio: string, fim: string): boolean {
  const valida = (hora: string) => {
    const partes = /^(\d{2}):(\d{2})$/.exec(hora);
    return partes !== null && Number(partes[1]) < 24 && Number(partes[2]) < 60;
  };
  if (inicio !== '' && !valida(inicio)) return false;
  if (fim !== '' && !valida(fim)) return false;
  return inicio === '' || fim === '' || fim >= inicio;
}

/** O Web usa a quantidade prevista se o campo real for deixado em branco. */
export function quantidadeRealAplicacao(valor: string, prevista: string | number | null | undefined): number | null {
  const entrada = valor.trim() === '' ? prevista : valor;
  const quantidade = decimalAplicacao(entrada);
  return quantidade !== null && quantidade > 0 ? quantidade : null;
}
