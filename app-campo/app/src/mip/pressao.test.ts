import { describe, expect, test } from '@jest/globals';

import { classificar, pressaoDoTalhao } from '@/mip/pressao';
import type { MipRecebido, MipReferencia } from '@/api/tipos';

const referencias: MipReferencia[] = [
  { id: 1, nome: 'Tripes da videira', tipo: 'praga', nivel_acao: '6' },
  { id: 3, nome: 'Míldio', tipo: 'doenca', nivel_acao: '8' },
];

function rec(p: Partial<MipRecebido>): MipRecebido {
  return { id: Math.random(), talhao_id: 2, ...p } as MipRecebido;
}

describe('classificar', () => {
  test('separa as quatro faixas do painel do site', () => {
    expect(classificar(0.4)).toBe('controlado');
    expect(classificar(0.5)).toBe('atencao');
    expect(classificar(0.99)).toBe('atencao');
    expect(classificar(1)).toBe('alerta');
    expect(classificar(1.99)).toBe('alerta');
    expect(classificar(2)).toBe('critico');
  });
});

describe('pressaoDoTalhao', () => {
  test('usa a última medição de cada alvo e calcula valor/nível de ação', () => {
    const recebidos: MipRecebido[] = [
      rec({ alvo_id: 3, alvo_nome: 'Míldio', nivel_acao: '8', nivel_infestacao: '2', data_monitoramento: '2026-09-01', local_infestacao: 'folha' }),
      rec({ alvo_id: 3, alvo_nome: 'Míldio', nivel_acao: '8', nivel_infestacao: '6', data_monitoramento: '2026-09-20', local_infestacao: 'folha' }),
      rec({ alvo_id: 1, alvo_nome: 'Tripes da videira', nivel_acao: '6', nivel_infestacao: '3', data_monitoramento: '2026-09-18', local_infestacao: 'folha' }),
    ];
    const { itens, totalMonitoramentos } = pressaoDoTalhao(recebidos, referencias, 2);
    expect(totalMonitoramentos).toBe(3);
    // ordenado por razão desc: Míldio 6/8=0.75 antes de Tripes 3/6=0.5
    expect(itens.map((i) => i.nome)).toEqual(['Míldio', 'Tripes da videira']);
    expect(itens[0]).toMatchObject({ valor: 6, nivelAcao: 8, razao: 0.75, classe: 'atencao', tipo: 'doenca', local: 'folha' });
    expect(itens[1]).toMatchObject({ valor: 3, nivelAcao: 6, razao: 0.5, classe: 'atencao', tipo: 'praga' });
  });

  test('ignora medições fora da janela de 12 semanas', () => {
    const recebidos: MipRecebido[] = [
      rec({ alvo_id: 3, alvo_nome: 'Míldio', nivel_acao: '8', nivel_infestacao: '6', data_monitoramento: '2026-09-20' }),
      rec({ alvo_id: 1, alvo_nome: 'Tripes', nivel_acao: '6', nivel_infestacao: '5', data_monitoramento: '2026-01-01' }), // >12 semanas antes
    ];
    const { itens, totalMonitoramentos } = pressaoDoTalhao(recebidos, referencias, 2);
    expect(totalMonitoramentos).toBe(1);
    expect(itens).toHaveLength(1);
    expect(itens[0]?.nome).toBe('Míldio');
  });

  test('devolve vazio quando a válvula não tem monitoramento', () => {
    expect(pressaoDoTalhao([], referencias, 99)).toEqual({ itens: [], totalMonitoramentos: 0, ultima: null });
  });
});
