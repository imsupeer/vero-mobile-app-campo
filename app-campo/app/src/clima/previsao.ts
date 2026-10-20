/**
 * Previsão do tempo.
 *
 * O mesmo que o Mapa da Fazenda mostra no VERO web: a previsão da Open-Meteo
 * para o ponto de referência da fazenda (o centro das válvulas). É modelo
 * global, sem estação local — por isso o card diz de onde vem o dado, como no
 * site.
 *
 * A rede aqui é oportunista: buscamos quando há sinal e guardamos a última
 * resposta. No campo sem sinal a tela mostra a última previsão conhecida, com a
 * hora em que foi obtida — nunca uma tela vazia, nunca um erro no lugar do que
 * já se sabia. Esse é o princípio do aplicativo inteiro: a tela lê do que está
 * guardado; a rede só reabastece.
 */
import { lerCache, gravarCache } from '@/db/banco';
import type { Fazenda, Talhao } from '@/api/tipos';

export type DiaPrevisao = {
  data: string; // ISO yyyy-mm-dd
  codigo: number; // weather code WMO
  tempMax: number;
  tempMin: number;
  chuva: number; // probabilidade máxima %
};

export type Previsao = {
  latitude: number;
  longitude: number;
  atualizadoEm: string; // ISO
  atual: { temp: number; codigo: number };
  hoje: { chuva: number; ventoMax: number; uvMax: number; nascer: string; ocaso: string };
  dias: DiaPrevisao[];
};

const MODULO_CACHE = 'clima_previsao';

/**
 * Ponto de referência do clima: prioriza o centroide das válvulas e, quando
 * não existe, usa as coordenadas da fazenda sincronizadas junto com elas.
 * Coordenadas individuais das válvulas ficam como último recurso.
 */
export function centroFazenda(talhoes: Talhao[], fazendas: Fazenda[] = []): { lat: number; lng: number } | null {
  const pontos = talhoes
    .map((t) => coordenadaValida(t.centroide_lat, t.centroide_lng))
    .filter((p): p is { lat: number; lng: number } => p !== null);
  if (pontos.length > 0) return media(pontos);

  const coordenadasFazenda = fazendas
    .map((fazenda) => coordenadaValida(fazenda.latitude, fazenda.longitude))
    .filter((p): p is { lat: number; lng: number } => p !== null);
  if (coordenadasFazenda.length > 0) return media(coordenadasFazenda);

  const coordenadasValvulas = talhoes
    .map((talhao) => coordenadaValida(talhao.latitude, talhao.longitude))
    .filter((p): p is { lat: number; lng: number } => p !== null);
  return coordenadasValvulas.length > 0 ? media(coordenadasValvulas) : null;
}

function coordenadaValida(
  latitude: number | string | null | undefined,
  longitude: number | string | null | undefined,
): { lat: number; lng: number } | null {
  if (latitude == null || longitude == null || latitude === '' || longitude === '') return null;
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180 || (lat === 0 && lng === 0)) return null;
  return { lat, lng };
}

function media(pontos: { lat: number; lng: number }[]): { lat: number; lng: number } {
  return {
    lat: pontos.reduce((soma, ponto) => soma + ponto.lat, 0) / pontos.length,
    lng: pontos.reduce((soma, ponto) => soma + ponto.lng, 0) / pontos.length,
  };
}

/** A última previsão guardada no aparelho, se houver. */
export async function previsaoGuardada(): Promise<Previsao | null> {
  try {
    const itens = await lerCache<Previsao & { id: string }>(MODULO_CACHE);
    return itens[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Busca a previsão na Open-Meteo e guarda. Se a rede falhar, devolve a última
 * guardada em vez de estourar — a tela nunca fica sem nada por causa de sinal.
 */
export async function buscarPrevisao(lat: number, lng: number): Promise<Previsao | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}` +
    `&current=temperature_2m,weather_code` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,uv_index_max,sunrise,sunset` +
    `&timezone=auto&forecast_days=7`;

  try {
    const controle = new AbortController();
    const prazo = setTimeout(() => controle.abort(), 12000);
    const resposta = await fetch(url, { signal: controle.signal });
    clearTimeout(prazo);
    if (!resposta.ok) return previsaoGuardada();
    const bruto = (await resposta.json()) as RespostaOpenMeteo;

    const dias: DiaPrevisao[] = (bruto.daily?.time ?? []).map((data, i) => ({
      data,
      codigo: num(bruto.daily?.weather_code?.[i]),
      tempMax: num(bruto.daily?.temperature_2m_max?.[i]),
      tempMin: num(bruto.daily?.temperature_2m_min?.[i]),
      chuva: num(bruto.daily?.precipitation_probability_max?.[i]),
    }));

    const previsao: Previsao = {
      latitude: lat,
      longitude: lng,
      atualizadoEm: new Date().toISOString(),
      atual: {
        temp: num(bruto.current?.temperature_2m),
        codigo: num(bruto.current?.weather_code),
      },
      hoje: {
        chuva: num(bruto.daily?.precipitation_probability_max?.[0]),
        ventoMax: num(bruto.daily?.wind_speed_10m_max?.[0]),
        uvMax: num(bruto.daily?.uv_index_max?.[0]),
        nascer: horaDe(bruto.daily?.sunrise?.[0]),
        ocaso: horaDe(bruto.daily?.sunset?.[0]),
      },
      dias,
    };

    try {
      await gravarCache(MODULO_CACHE, [{ ...previsao, id: 'atual' }]);
    } catch {
      /* guardar é melhor-esforço: sem cache a tela ainda funciona nesta sessão */
    }
    return previsao;
  } catch {
    return previsaoGuardada();
  }
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** "2026-09-26T05:29" → "05:29" */
function horaDe(iso: string | undefined): string {
  if (typeof iso !== 'string') return '—';
  const t = iso.split('T')[1];
  return t != null ? t.slice(0, 5) : '—';
}

type RespostaOpenMeteo = {
  current?: { temperature_2m?: number; weather_code?: number };
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
    wind_speed_10m_max?: number[];
    uv_index_max?: number[];
    sunrise?: string[];
    sunset?: string[];
  };
};
