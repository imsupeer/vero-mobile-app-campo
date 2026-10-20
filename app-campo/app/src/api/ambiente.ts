/**
 * Para qual servidor este aparelho fala.
 *
 * A URL não é fixa no código porque o sistema é multiempresa: cada cliente
 * tem o seu endereço, montado a partir do **código da empresa** que o
 * operador digita uma vez, na primeira abertura.
 *
 * `EXPO_PUBLIC_API_URL` existe como atalho de desenvolvimento — o Expo
 * embute o valor no pacote, o que permite apontar para a máquina local sem
 * precisar de código de empresa nenhum.
 */
import {
  apagarValorArmazenado,
  gravarValorArmazenado,
  lerValorArmazenado,
} from '@/api/sessaoArmazenada';

const CHAVE_CODIGO = 'vero.codigo_empresa';

/** O molde do endereço. Trocar aqui muda para todos os clientes. */
function montarUrl(codigo: string): string {
  return `https://${codigo}.verobyorigo.agr.br/api/v1`;
}

export async function lerBaseUrl(): Promise<string | null> {
  const desenvolvimento = process.env.EXPO_PUBLIC_API_URL;
  if (typeof desenvolvimento === 'string' && desenvolvimento !== '') {
    return desenvolvimento;
  }

  const codigo = await lerValorArmazenado(CHAVE_CODIGO);

  return codigo === null || codigo === '' ? null : montarUrl(codigo);
}

export async function gravarCodigoEmpresa(codigo: string): Promise<void> {
  await gravarValorArmazenado(CHAVE_CODIGO, codigo.trim().toLowerCase());
}

export async function lerCodigoEmpresa(): Promise<string | null> {
  return lerValorArmazenado(CHAVE_CODIGO);
}

export async function esquecerCodigoEmpresa(): Promise<void> {
  await apagarValorArmazenado(CHAVE_CODIGO);
}
