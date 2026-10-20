import { describe, expect, test } from '@jest/globals';

import { reconectou } from '@/sinc/conexao';

describe('tentativa de sincronização ao recuperar a rede', () => {
  test('identifica a transição de desconectado para conectado', () => {
    expect(reconectou(false, true)).toBe(true);
  });

  test('não dispara na primeira leitura nem enquanto o estado permanece igual', () => {
    expect(reconectou(null, true)).toBe(false);
    expect(reconectou(true, true)).toBe(false);
    expect(reconectou(false, false)).toBe(false);
  });

  test('não dispara quando a conexão cai', () => {
    expect(reconectou(true, false)).toBe(false);
  });
});
