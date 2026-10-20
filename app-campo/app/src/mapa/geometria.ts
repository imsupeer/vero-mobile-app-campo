import type { Talhao } from '@/api/tipos';

export type Coordenada = [longitude: number, latitude: number];
export type PontoMapa = { x: number; y: number };
export type FormaMapa = { id: number; caminho: string | null; centro: PontoMapa; nome: string };

type Geometria = { type?: string; coordinates?: unknown; geometry?: unknown };

function coordenada(valor: unknown): Coordenada | null {
  if (!Array.isArray(valor) || valor.length < 2) return null;
  const longitude = Number(valor[0]);
  const latitude = Number(valor[1]);
  return Number.isFinite(longitude) && Number.isFinite(latitude) ? [longitude, latitude] : null;
}

export function extrairAneis(valor: unknown): Coordenada[][] {
  if (valor == null || valor === '') return [];
  try {
    const objeto = (typeof valor === 'string' ? JSON.parse(valor) : valor) as Geometria;
    const geometria = objeto?.type === 'Feature' ? objeto.geometry as Geometria : objeto;
    if (geometria?.type === 'Polygon' && Array.isArray(geometria.coordinates)) {
      return geometria.coordinates.map((anel) => Array.isArray(anel) ? anel.map(coordenada).filter((p): p is Coordenada => p !== null) : []).filter((anel) => anel.length >= 3);
    }
    if (geometria?.type === 'MultiPolygon' && Array.isArray(geometria.coordinates)) {
      return geometria.coordinates.flatMap((poligono) => Array.isArray(poligono) ? poligono.map((anel) => Array.isArray(anel) ? anel.map(coordenada).filter((p): p is Coordenada => p !== null) : []) : []).filter((anel) => anel.length >= 3);
    }
  } catch {
    return [];
  }
  return [];
}

export function coordenadasDoTalhao(talhao: Talhao): Coordenada[][] {
  return extrairAneis(talhao.geometria ?? talhao.geometry);
}

/** A geometria GeoJSON (Polygon/MultiPolygon) da válvula, pronta para o Leaflet.
 *  Desembrulha o `Feature` e valida o tipo; devolve null quando não há polígono. */
export function geometriaGeoJson(talhao: Talhao): unknown | null {
  const bruto = talhao.geometria ?? talhao.geometry;
  if (bruto == null || bruto === '') return null;
  try {
    const objeto = (typeof bruto === 'string' ? JSON.parse(bruto) : bruto) as Geometria;
    const geometria = objeto?.type === 'Feature' ? (objeto.geometry as Geometria) : objeto;
    if (geometria?.type === 'Polygon' || geometria?.type === 'MultiPolygon') {
      return geometria;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Geometria desenhável no mapa conectado: prioriza os limites reais e, quando
 * o backend ainda não os fornece, usa o centroide como ponto — sem inventar
 * polígonos para representar limites que não conhecemos.
 */
export function geometriaOuPontoGeoJson(talhao: Talhao): unknown | null {
  const geometria = geometriaGeoJson(talhao);
  if (geometria !== null) return geometria;

  const centro = centroideDoTalhao(talhao);
  if (centro === null || centro[0] < -180 || centro[0] > 180 || centro[1] < -90 || centro[1] > 90) return null;
  return { type: 'Point', coordinates: centro };
}

function numero(valor: unknown): number | null {
  const resultado = Number(valor);
  return valor !== null && valor !== '' && Number.isFinite(resultado) && resultado !== 0 ? resultado : null;
}

export function centroideDoTalhao(talhao: Talhao): Coordenada | null {
  const aneis = coordenadasDoTalhao(talhao);
  const pontos = aneis.flat();
  if (pontos.length > 0) {
    return [pontos.reduce((s, p) => s + p[0], 0) / pontos.length, pontos.reduce((s, p) => s + p[1], 0) / pontos.length];
  }
  const lat = numero(talhao.centroide_lat);
  const lng = numero(talhao.centroide_lng);
  return lat === null || lng === null ? null : [lng, lat];
}

export function projetarTalhoes(talhoes: Talhao[], largura: number, altura: number, posicao?: Coordenada | null): { formas: FormaMapa[]; posicao: PontoMapa | null } {
  const dados = talhoes.map((talhao) => ({ talhao, aneis: coordenadasDoTalhao(talhao), centro: centroideDoTalhao(talhao) })).filter((item) => item.centro !== null);
  const pontos = dados.flatMap((item) => item.aneis.length > 0 ? item.aneis.flat() : [item.centro as Coordenada]);
  if (posicao != null) pontos.push(posicao);
  if (pontos.length === 0) return { formas: [], posicao: null };

  const longitudes = pontos.map((p) => p[0]);
  const latitudes = pontos.map((p) => p[1]);
  const minLng = Math.min(...longitudes); const maxLng = Math.max(...longitudes);
  const minLat = Math.min(...latitudes); const maxLat = Math.max(...latitudes);
  const margem = 24;
  const spanLng = Math.max(maxLng - minLng, 0.0004);
  const spanLat = Math.max(maxLat - minLat, 0.0004);
  const escala = Math.min((largura - margem * 2) / spanLng, (altura - margem * 2) / spanLat);
  const larguraUsada = spanLng * escala; const alturaUsada = spanLat * escala;
  const origemX = (largura - larguraUsada) / 2; const origemY = (altura - alturaUsada) / 2;
  const converter = ([lng, lat]: Coordenada): PontoMapa => ({ x: origemX + (lng - minLng) * escala, y: origemY + (maxLat - lat) * escala });

  const formas = dados.map(({ talhao, aneis, centro }) => ({
    id: talhao.id,
    nome: talhao.codigo ?? talhao.nome ?? `#${talhao.id}`,
    centro: converter(centro as Coordenada),
    caminho: aneis.length === 0 ? null : aneis.map((anel) => `${anel.map((p, i) => { const q = converter(p); return `${i === 0 ? 'M' : 'L'} ${q.x.toFixed(1)} ${q.y.toFixed(1)}`; }).join(' ')} Z`).join(' '),
  }));
  return { formas, posicao: posicao == null ? null : converter(posicao) };
}
