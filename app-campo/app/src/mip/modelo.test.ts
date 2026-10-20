import { describe, expect, test } from '@jest/globals';

import { espacoAmostral, faixaPressao, indiceCalculado, pressaoCalculada, validarAlvosMonitorados } from './modelo';

describe('formulário de monitoramento MIP', () => {
  test('aplica unidades por planta ao cálculo do espaço amostral', () => {
    expect(espacoAmostral('20', '15')).toBe(300);
    expect(espacoAmostral('', '15')).toBeNull();
  });

  test('calcula a prévia percentual quando há quantidade e espaço amostral', () => {
    expect(indiceCalculado('3', 300)).toBe(1);
    expect(indiceCalculado('3', 300, 'un')).toBe(3);
    expect(indiceCalculado('3', null)).toBe(3);
    expect(indiceCalculado('', 300)).toBeNull();
  });

  test('calcula pressão e classifica a faixa como no painel Web', () => {
    expect(pressaoCalculada(2, 1)).toBe(200);
    expect(faixaPressao(200)).toBe('Crítico');
    expect(faixaPressao(100)).toBe('Alerta');
    expect(faixaPressao(50)).toBe('Atenção');
    expect(faixaPressao(49.9)).toBe('Controlado');
    expect(pressaoCalculada(2, 0)).toBeNull();
  });

  test('exige alvo e quantidade ou índice em cada linha', () => {
    expect(validarAlvosMonitorados([]).erro).toMatch(/ao menos um alvo/);
    expect(validarAlvosMonitorados([{ alvo_id: null, quantidade: '', local: '', severidade: '' }]).erro).toMatch(/Selecione um alvo/);
    expect(validarAlvosMonitorados([{ alvo_id: 1, quantidade: '', local: '', severidade: '' }]).erro).toMatch(/quantidade/);
  });

  test('permite repetir o mesmo alvo em locais distintos e envia quantidade e severidade', () => {
    const resultado = validarAlvosMonitorados([
      { alvo_id: 2, quantidade: '3', local: 'folha', severidade: 'media' },
      { alvo_id: 2, quantidade: '4,5', local: 'ramo', severidade: 'alta' },
    ], 300);
    expect(resultado.erro).toBeNull();
    expect(resultado.alvos).toEqual([
      { alvo_id: 2, quantidade_encontrada: 3, nivel_infestacao: 1, local_infestacao: 'folha', severidade_qualitativa: 'media' },
      { alvo_id: 2, quantidade_encontrada: 4.5, nivel_infestacao: 1.5, local_infestacao: 'ramo', severidade_qualitativa: 'alta' },
    ]);
  });

  test('rejeita o mesmo alvo duplicado no mesmo local e quantidades negativas', () => {
    const linha = { alvo_id: 2, quantidade: '1', local: 'folha', severidade: '' };
    expect(validarAlvosMonitorados([linha, { ...linha }]).erro).toMatch(/Alvo repetido/);
    expect(validarAlvosMonitorados([{ ...linha, quantidade: '-1', local: 'ramo' }]).erro).toMatch(/igual ou maior/);
  });

  test('envia índice já calculado para a unidade escolhida e avisa acima do limite', () => {
    const entrada = [{ alvo_id: 1, quantidade: '15', local: '', severidade: '' }];
    expect(validarAlvosMonitorados(entrada, 10, '%').alvos[0]).toMatchObject({ quantidade_encontrada: 15, nivel_infestacao: 150 });
    expect(validarAlvosMonitorados(entrada, 10, 'un').alvos[0]).toMatchObject({ quantidade_encontrada: 15, nivel_infestacao: 15 });
  });
});
