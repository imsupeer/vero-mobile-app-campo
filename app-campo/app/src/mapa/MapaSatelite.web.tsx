/**
 * Mapa de satélite — versão WEB.
 *
 * Na web o WebView não existe; um `<iframe>` com o HTML do Leaflet faz o mesmo
 * papel e roda direto no navegador. O `<iframe>` é um elemento do DOM, não um
 * componente do React Native, por isso o cast — só compila e roda na web.
 */
import type { ComponentType } from 'react';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { htmlDoMapa } from '@/mapa/leafletHtml';
import type { FeicaoMapa, ItemLegendaMapa } from '@/mapa/leafletHtml';
import { cor, espaco, fonte, raio, sombra } from '@/ui/tema';

const Iframe = 'iframe' as unknown as ComponentType<{ srcDoc: string; title: string; style: object }>;

export function MapaSatelite({
  feicoes,
  legenda,
  titulo = 'Mapa da fazenda',
  altura = 300,
  aoSelecionar,
}: {
  feicoes: FeicaoMapa[];
  legenda: ItemLegendaMapa[];
  titulo?: string;
  altura?: number;
  aoSelecionar?: (id: string) => void;
}) {
  const html = htmlDoMapa(feicoes, legenda);

  /* o iframe (srcDoc) manda o id da válvula clicada por postMessage; ouvimos e
     repassamos ao app. Só reagimos à nossa própria mensagem ({tipo:'talhao'}). */
  useEffect(() => {
    if (aoSelecionar == null) return;
    const ouvir = (ev: MessageEvent) => {
      const dado = ev.data as { tipo?: string; id?: string } | null;
      if (dado != null && dado.tipo === 'talhao' && dado.id != null) aoSelecionar(String(dado.id));
    };
    window.addEventListener('message', ouvir);
    return () => window.removeEventListener('message', ouvir);
  }, [aoSelecionar]);
  return (
    <View style={e.cartao}>
      <Text style={e.titulo}>{titulo}</Text>
      <View style={[e.quadro, { height: altura }]}>
        <Iframe title="Mapa da fazenda" srcDoc={html} style={{ width: '100%', height: '100%', border: '0', display: 'block' }} />
      </View>
    </View>
  );
}

const e = StyleSheet.create({
  cartao: { backgroundColor: cor.superficie, borderRadius: raio.lg, borderWidth: 1, borderColor: cor.borda, padding: espaco.md, ...sombra.cartao },
  titulo: { color: cor.textoForte, fontSize: fonte.normal, fontWeight: '800', marginBottom: espaco.sm },
  quadro: { overflow: 'hidden', borderRadius: raio.md, backgroundColor: cor.cabecalho, borderWidth: 1, borderColor: cor.borda },
});
