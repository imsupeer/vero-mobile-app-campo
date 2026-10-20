import { describe, expect, test } from '@jest/globals';

import { CATALOGO_RELATORIOS, formatarCelula, larguraTabela, podeAcessarRelatorio, relatoriosDisponiveis, valorColuna } from '@/relatorios/catalogo';

describe('tabela genérica de relatórios', () => {
  test('preserva códigos numéricos declarados como texto', () => {
    expect(formatarCelula('001234567', 'texto')).toBe('001234567');
  });

  test('formata cada valor pelo tipo explícito da coluna', () => {
    expect(formatarCelula(1234.5, 'numero')).toBe('1.234,5');
    expect(formatarCelula('2026-09-25 08:30:00', 'data')).toBe('25/09/2026 08:30');
    expect(formatarCelula('recebido_parcial', 'status')).toBe('recebido parcial');
  });

  test('usa data prevista como alternativa quando a aplicação ainda não foi executada', () => {
    const coluna = CATALOGO_RELATORIOS.find((item) => item.id === 'aplicacoes')!.colunas[0]!;
    expect(valorColuna({ data: null, data_prevista: '2026-10-07' }, coluna)).toBe('2026-10-07');
    expect(formatarCelula(valorColuna({ data: null, data_prevista: '2026-10-07' }, coluna), coluna.tipo)).toBe('07/10/2026');
  });

  test('todos os relatórios têm colunas tipadas e largura de tabela', () => {
    expect(CATALOGO_RELATORIOS).toHaveLength(7);
    CATALOGO_RELATORIOS.forEach((relatorio) => {
      expect(relatorio.colunas.every((coluna) => coluna.tipo !== undefined)).toBe(true);
      expect(larguraTabela(relatorio)).toBeGreaterThan(0);
    });
  });

  test('usa os mesmos slugs de leitura do VERO web', () => {
    expect(CATALOGO_RELATORIOS.find((item) => item.id === 'estoque')?.permissoes).toContain('estoque.produtos_insumos.ver');
    expect(CATALOGO_RELATORIOS.find((item) => item.id === 'movimentacoes')?.permissoes).toContain('estoque.historico_movimentacoes.ver');
    expect(CATALOGO_RELATORIOS.find((item) => item.id === 'compras')?.permissoes).toContain('compras.pedidos_compra.ver');
  });

  test('relatorios.ver sozinho não libera todos os datasets; o micro ou a permissão-fonte libera o correspondente', () => {
    const estoque = CATALOGO_RELATORIOS.find((item) => item.id === 'estoque')!;
    const compras = CATALOGO_RELATORIOS.find((item) => item.id === 'compras')!;
    const soHub = (permissao: string) => permissao === 'relatorios.ver';
    const relatorioEstoque = (permissao: string) => permissao === 'relatorios.relatorios_estoque.ver';
    const fonteCompras = (permissao: string) => permissao === 'compras.pedidos_compra.ver';

    expect(podeAcessarRelatorio(estoque, soHub)).toBe(false);
    expect(podeAcessarRelatorio(estoque, relatorioEstoque)).toBe(true);
    expect(podeAcessarRelatorio(compras, relatorioEstoque)).toBe(false);
    expect(podeAcessarRelatorio(compras, fonteCompras)).toBe(true);
  });

  test('relatórios operacionais usam módulos sincronizados e mantêm custos fora do app', () => {
    const apontamentos = CATALOGO_RELATORIOS.find((item) => item.id === 'apontamentos')!;
    const atividades = CATALOGO_RELATORIOS.find((item) => item.id === 'atividades')!;
    expect(apontamentos.modulo).toBe('apontamentos');
    expect(apontamentos.colunas.map((coluna) => coluna.campo)).not.toContain('valor');
    expect(atividades.modulo).toBe('atividades');
    expect(podeAcessarRelatorio(atividades, (permissao) => permissao === 'relatorios.relatorios_operacionais.ver')).toBe(true);
    expect(relatoriosDisponiveis((permissao) => permissao === 'relatorios.ver')).toEqual([]);

    const aplicacoes = CATALOGO_RELATORIOS.find((item) => item.id === 'aplicacoes')!;
    expect(aplicacoes.modulo).toBe('aplicacoes');
    expect(aplicacoes.colunas.map((coluna) => coluna.campo)).not.toContain('custo_total');
    expect(podeAcessarRelatorio(aplicacoes, (permissao) => permissao === 'mip.ver')).toBe(true);
  });
});
