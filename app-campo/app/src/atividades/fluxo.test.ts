import { describe, expect, test } from '@jest/globals';

import { acoesAtividade } from './fluxo';

describe('transições de atividades', () => {
  test('atividade planejada só pode ser iniciada', () => {
    expect(acoesAtividade('planejada')).toEqual(['andamento']);
  });

  test('atividade em execução só pode ser concluída', () => {
    expect(acoesAtividade('em_execucao')).toEqual(['concluida']);
  });

  test('atividade concluída ou cancelada não oferece transições', () => {
    expect(acoesAtividade('concluida')).toEqual([]);
    expect(acoesAtividade('cancelada')).toEqual([]);
  });
});
