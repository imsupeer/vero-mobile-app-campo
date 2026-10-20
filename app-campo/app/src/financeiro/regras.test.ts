import { describe, expect, test } from '@jest/globals';

import type { TituloFinanceiro } from '@/api/tipos';
import { filtrarTitulos, filtrarTitulosPermitidos, intervalo, situacao } from '@/financeiro/regras';

const titulo = (id: number, dados: Partial<TituloFinanceiro>): TituloFinanceiro => ({ id, ...dados });

describe('regras da consulta financeira', () => {
  test('usa o campo vencido do ERP, sem recalcular pela data local', () => {
    expect(situacao(titulo(1, { data_vencimento: '2020-01-01', vencido: false, status: 'aberto' }))).toBe('aberto');
    expect(situacao(titulo(2, { data_vencimento: '2099-01-01', vencido: 1, status: 'aberto' }))).toBe('vencido');
  });

  test('um título quitado não aparece como vencido', () => {
    expect(situacao(titulo(1, { vencido: true, status: 'baixado' }))).toBe('quitado');
  });

  test('filtra por tipo e intervalo sem somar ou inventar saldo', () => {
    const itens = [titulo(1, { tipo: 'pagar', data_vencimento: '2026-09-10' }), titulo(2, { tipo: 'receber', data_vencimento: '2026-09-12' }), titulo(3, { tipo: 'pagar', data_vencimento: '2026-10-02' })];
    expect(filtrarTitulos(itens, 'pagar', 'mes_atual', new Date(2026, 8, 25)).map((item) => item.id)).toEqual([1]);
    expect(intervalo('30_dias', new Date(2026, 8, 25))).toEqual({ inicio: '2026-09-25', fim: '2026-10-25' });
  });

  test('cache financeiro obedece às permissões separadas de pagar e receber', () => {
    const itens = [titulo(1, { tipo: 'pagar' }), titulo(2, { tipo: 'receber' })];
    expect(filtrarTitulosPermitidos(itens, true, false).map((item) => item.id)).toEqual([1]);
    expect(filtrarTitulosPermitidos(itens, false, true).map((item) => item.id)).toEqual([2]);
    expect(filtrarTitulosPermitidos(itens, false, false)).toEqual([]);
  });
});
