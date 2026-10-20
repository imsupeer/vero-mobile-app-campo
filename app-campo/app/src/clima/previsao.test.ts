import type { Fazenda, Talhao } from '@/api/tipos';
import { describe, expect, test } from '@jest/globals';

import { centroFazenda } from './previsao';

describe('coordenadas da previsão da fazenda', () => {
  test('prioriza a média dos centroides das válvulas', () => {
    const talhoes = [
      { id: 1, centroide_lat: '-9.2', centroide_lng: '-40.4' },
      { id: 2, centroide_lat: '-9.4', centroide_lng: '-40.6' },
    ] as Talhao[];

    expect(centroFazenda(talhoes)).toEqual({ lat: -9.3, lng: -40.5 });
  });

  test('usa as coordenadas da fazenda quando não há centroides', () => {
    expect(
      centroFazenda(
        [{ id: 1, centroide_lat: null, centroide_lng: null }] as Talhao[],
        [{ id: 5, nome: 'Fazenda', latitude: '-9.089305', longitude: '-40.523403' }] as Fazenda[],
      ),
    ).toEqual({ lat: -9.089305, lng: -40.523403 });
  });

  test('usa coordenadas próprias da válvula como último fallback', () => {
    expect(centroFazenda([{ id: 1, latitude: '-9.2', longitude: '-40.4' }] as Talhao[]))
      .toEqual({ lat: -9.2, lng: -40.4 });
  });

  test('ignora coordenadas incompletas, fora dos limites e nulas', () => {
    const talhoes = [
      { id: 1, centroide_lat: null, centroide_lng: null, latitude: null, longitude: null },
      { id: 4, centroide_lat: '0', centroide_lng: '0' },
    ] as Talhao[];

    const fazendas = [
      { id: 5, nome: 'Fora', latitude: '91', longitude: '-40' },
      { id: 6, nome: 'Incompleta', latitude: '-9', longitude: null },
    ] as Fazenda[];

    expect(centroFazenda(talhoes, fazendas)).toBeNull();
  });
});
