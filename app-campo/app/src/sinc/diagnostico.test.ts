import { describe, expect, test } from '@jest/globals';

import { falhaDePermissao, motivoFalhaLeitura, rotuloModulo } from '@/sinc/diagnostico';

describe('diagnóstico da sincronização de leitura', () => {
  test('distingue ausência de permissão de uma falha operacional', () => {
    expect(falhaDePermissao({ modulo: 'financeiro', codigo: 'sem_permissao' })).toBe(true);
    expect(falhaDePermissao({ modulo: 'apontamentos', codigo: 'modulo_desconhecido' })).toBe(false);
  });

  test('usa rótulos de campo e mensagens acionáveis para os módulos', () => {
    expect(rotuloModulo('apontamentos')).toBe('Histórico do Caderno');
    expect(motivoFalhaLeitura('modulo_desconhecido')).toBe('Esta consulta não está disponível na API.');
    expect(motivoFalhaLeitura('sem_conexao')).toBe('Sem conexão com o servidor.');
  });
});
