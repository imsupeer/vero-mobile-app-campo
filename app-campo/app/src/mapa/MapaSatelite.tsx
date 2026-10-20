/**
 * Mapa de satélite — versão NATIVA (Android/iOS).
 *
 * Um WebView carrega o HTML do Leaflet com as imagens de satélite do Esri, o
 * mesmo do VERO web. Precisa de rede para as tiles; sem rede a tela do mapa cai
 * para o desenho offline (`MapaOffline`), quem decide isso é a tela do mapa.
 */
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { htmlDoMapa } from '@/mapa/leafletHtml';
import type { FeicaoMapa, ItemLegendaMapa } from '@/mapa/leafletHtml';
import { cor, espaco, fonte, raio, sombra } from '@/ui/tema';

export function MapaSatelite({
  feicoes,
  legenda,
  aviso,
  titulo = 'Mapa da fazenda',
  altura = 300,
  aoSelecionar,
}: {
  feicoes: FeicaoMapa[];
  legenda: ItemLegendaMapa[];
  aviso?: string;
  titulo?: string;
  altura?: number;
  aoSelecionar?: (id: string) => void;
}) {
  const html = htmlDoMapa(feicoes, legenda);
  return (
    <View style={e.cartao}>
      <Text style={e.titulo}>{titulo}</Text>
      <View style={[e.quadro, { height: altura }]}>
        <WebView
          source={{ html }}
          originWhitelist={['*']}
          style={e.web}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
          onMessage={(evento) => {
            try {
              const dado = JSON.parse(evento.nativeEvent.data) as { tipo?: string; id?: string };
              if (dado.tipo === 'talhao' && dado.id != null) aoSelecionar?.(String(dado.id));
            } catch {
              /* mensagem inesperada — ignora */
            }
          }}
        />
      </View>
      {aviso != null && <Text style={e.aviso}>{aviso}</Text>}
    </View>
  );
}

const e = StyleSheet.create({
  cartao: { backgroundColor: cor.superficie, borderRadius: raio.lg, borderWidth: 1, borderColor: cor.borda, padding: espaco.md, ...sombra.cartao },
  titulo: { color: cor.textoForte, fontSize: fonte.normal, fontWeight: '800', marginBottom: espaco.sm },
  aviso: { color: cor.textoSuave, fontSize: fonte.pequena, lineHeight: 19, marginTop: espaco.sm },
  quadro: { overflow: 'hidden', borderRadius: raio.md, backgroundColor: cor.cabecalho, borderWidth: 1, borderColor: cor.borda },
  web: { flex: 1, backgroundColor: 'transparent' },
});
