import { describe, expect, test } from '@jest/globals';

import type { Talhao } from '@/api/tipos';
import { centroideDoTalhao, extrairAneis, geometriaOuPontoGeoJson, projetarTalhoes } from '@/mapa/geometria';

describe('geometria offline da fazenda', () => {
  test('lê Polygon em GeoJSON, inclusive dentro de Feature', () => {
    const geometria = JSON.stringify({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[-40, -9], [-39, -9], [-39, -8], [-40, -9]]] } });
    expect(extrairAneis(geometria)).toHaveLength(1);
    expect(extrairAneis(geometria)[0]?.[0]).toEqual([-40, -9]);
  });

  test('ignora geometria inválida sem derrubar o mapa', () => {
    expect(extrairAneis('{inválido')).toEqual([]);
    expect(extrairAneis({ type: 'Point', coordinates: [-40, -9] })).toEqual([]);
  });

  test('usa centroide cadastrado quando não há polígono', () => {
    const talhao = { id: 7, centroide_lat: '-9.25', centroide_lng: '-40.45' } as Talhao;
    expect(centroideDoTalhao(talhao)).toEqual([-40.45, -9.25]);
    expect(geometriaOuPontoGeoJson(talhao)).toEqual({ type: 'Point', coordinates: [-40.45, -9.25] });
    const mapa = projetarTalhoes([talhao], 340, 220);
    expect(mapa.formas).toHaveLength(1);
    expect(mapa.formas[0]?.caminho).toBeNull();
  });

  test('preserva os limites reais e não cria pontos com coordenadas inválidas', () => {
    const poligono = { type: 'Polygon', coordinates: [[[-40, -9], [-39, -9], [-39, -8], [-40, -9]]] };
    expect(geometriaOuPontoGeoJson({ id: 8, geometria: poligono } as Talhao)).toEqual(poligono);
    expect(geometriaOuPontoGeoJson({ id: 9, centroide_lat: 120, centroide_lng: -40 } as Talhao)).toBeNull();
  });
});
