import { describe, expect, test } from '@jest/globals';

import { ErroApi } from '@/api/cliente';
import { dataValida, mensagemErroBipe, numeroDecimal } from '@/packing/regras';

describe('regras do Packing House', () => {
  test('converte números informados no formato brasileiro', () => {
    expect(numeroDecimal('1.234,50')).toBe(1234.5);
    expect(numeroDecimal('')).toBeNull();
  });

  test('recusa datas inexistentes', () => {
    expect(dataValida('2026-09-25')).toBe(true);
    expect(dataValida('2026-02-30')).toBe(false);
  });

  test.each([
    ['cracha_invalido', 'Crachá não reconhecido'],
    ['posto_sem_atividade', 'sem atividade'],
    ['sem_recepcao', 'Não existe recepção'],
  ])('traduz o erro %s em uma orientação operacional', (codigo, trecho) => {
    expect(mensagemErroBipe(new ErroApi(codigo, 'Mensagem genérica', 422))).toContain(trecho);
  });
});
