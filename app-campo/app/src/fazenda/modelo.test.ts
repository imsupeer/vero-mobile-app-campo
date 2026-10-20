import type { Talhao } from '@/api/tipos';
import { describe, expect, test } from '@jest/globals';

import { filtrarPorFazenda, filtrarPorTalhoes, listarFazendas } from './modelo';

describe('fazenda única do tenant', () => {
  test('deduplica e ordena nomes encontrados nas válvulas', () => {
    const talhoes = [
      { id: 1, fazenda: ' Santa Luzia ' },
      { id: 2, fazenda: 'Santa Luzia' },
      { id: 3, fazenda: 'Boa Vista' },
      { id: 4, fazenda: '  ' },
    ] as Talhao[];

    expect(listarFazendas(talhoes)).toEqual(['Boa Vista', 'Santa Luzia']);
  });

  test('não considera válvulas sem fazenda como uma fazenda adicional', () => {
    expect(listarFazendas([{ id: 1 }, { id: 2, fazenda: null }] as Talhao[])).toEqual([]);
  });

  test('mantém serviços abertos apenas da fazenda selecionada', () => {
    const itens = [
      { id: 1, fazenda: 'Fazenda Santa Luzia' },
      { id: 2, fazenda: 'Fazenda Boa Vista' },
      { id: 3, fazenda: null },
    ];

    expect(filtrarPorFazenda(itens, 'Fazenda Santa Luzia')).toEqual([itens[0]]);
    expect(filtrarPorFazenda(itens, null)).toEqual([]);
  });

  test('associa itens locais somente a válvulas conhecidas da fazenda', () => {
    const itens = [
      { id: 'na-fazenda', carga: { talhao_id: 10 } },
      { id: 'outra-fazenda', carga: { talhao_id: 20 } },
      { id: 'sem-valvula', carga: {} },
    ];

    expect(filtrarPorTalhoes(itens, new Set([10]))).toEqual([itens[0]]);
  });
});
