/**
 * O token, guardado no cofre do aparelho.
 *
 * `expo-secure-store` usa o Keychain no iPhone e o Keystore no Android.
 * AsyncStorage seria mais simples e está errado: é um arquivo comum, legível
 * por quem tiver acesso ao sistema de arquivos — e o celular de campo é
 * emprestado, perdido e esquecido em cima de caixa.
 *
 * O token do servidor é opaco (64 caracteres hexadecimais). Ele não carrega
 * informação nenhuma dentro de si: quem sabe o que ele vale é o servidor,
 * pela tabela `app_tokens`. Isso é o que permite revogar de verdade — um
 * token assinado só "expira", não se cancela.
 */
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const CHAVE_TOKEN = 'vero.token';

/**
 * O SecureStore é o cofre correto no aparelho, mas não tem implementação
 * equivalente no navegador. O fallback web existe apenas para desenvolvimento
 * e para a versão web do app.
 */
export async function lerValorArmazenado(chave: string): Promise<string | null> {
  if (Platform.OS === 'web') return globalThis.localStorage.getItem(chave);

  return SecureStore.getItemAsync(chave);
}

export async function gravarValorArmazenado(chave: string, valor: string): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage.setItem(chave, valor);
    return;
  }

  await SecureStore.setItemAsync(chave, valor);
}

export async function apagarValorArmazenado(chave: string): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage.removeItem(chave);
    return;
  }

  await SecureStore.deleteItemAsync(chave);
}

export async function lerToken(): Promise<string | null> {
  return lerValorArmazenado(CHAVE_TOKEN);
}

export async function gravarToken(token: string): Promise<void> {
  await gravarValorArmazenado(CHAVE_TOKEN, token);
}

export async function apagarToken(): Promise<void> {
  await apagarValorArmazenado(CHAVE_TOKEN);
}

const CHAVE_USUARIO = 'vero.usuario';

/**
 * O usuário, guardado junto com o token.
 *
 * Sem isto, abrir o aplicativo sem sinal deixaria a pessoa autenticada mas
 * sem nome, sem perfil e sem permissões — ou seja, com a interface toda
 * vazia. Guardar permite abrir offline já com as telas certas.
 *
 * Note que isto é conveniência de tela, não autoridade: quem decide o que a
 * pessoa pode é o servidor, a cada requisição.
 */
export async function lerUsuarioGuardado<T>(): Promise<T | null> {
  const bruto = await lerValorArmazenado(CHAVE_USUARIO);
  if (bruto === null) return null;
  try {
    return JSON.parse(bruto) as T;
  } catch {
    return null;   /* guardado corrompido: segue sem ele */
  }
}

export async function gravarUsuarioGuardado(usuario: unknown): Promise<void> {
  await gravarValorArmazenado(CHAVE_USUARIO, JSON.stringify(usuario));
}

export async function apagarUsuarioGuardado(): Promise<void> {
  await apagarValorArmazenado(CHAVE_USUARIO);
}
