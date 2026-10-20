/**
 * Packing House — o ponto de entrada dos processos de pós-colheita no aparelho.
 *
 * No VERO web o Packing abre um painel de leitura (recebido, fila do relógio de
 * frio, gates, embalado × colhido). No campo o valor é outro: **fazer** — bipar
 * crachá, receber carga, achar o romaneio. Por isso a tela é organizada como o
 * site organiza suas ações: o que se faz agora em destaque, a consulta logo
 * abaixo. O painel de indicadores completo continua no VERO web, onde os dados
 * de recepção e frio vivem.
 */
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';

import { useSessao } from '@/sessao';
import { CabecalhoPagina } from '@/ui/componentes';
import { FaixaSinc } from '@/ui/FaixaSinc';
import { cor, espaco, familia, fonte, raio, sombra, toque } from '@/ui/tema';

type Entrada = {
  titulo: string;
  detalhe: string;
  rota: '/packing-apontar' | '/packing-recepcao' | '/packing-romaneio' | '/relogio-frio';
  icone: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  destaque?: boolean;
};

export default function Packing() {
  const { pode } = useSessao();

  const operacao: Entrada[] = [
    ...(pode('packing.apontar.ver') || pode('packing.apontar.editar')
      ? [{ titulo: 'Posto de caixas', detalhe: 'Bipagem de crachás e produção do dia', rota: '/packing-apontar' as const, icone: 'barcode-scan' as const, destaque: true }]
      : []),
    ...(pode('packing.recepcao.ver')
      ? [{ titulo: 'Recepção de cargas', detalhe: 'Pendências, rastreabilidade e gates de qualidade', rota: '/packing-recepcao' as const, icone: 'truck-delivery-outline' as const }]
      : []),
  ];
  const consulta: Entrada[] = [
    ...(pode('packing.recepcao.ver')
      ? [{ titulo: 'Relógio de frio', detalhe: 'Tempo desde a colheita e janela de SO₂', rota: '/relogio-frio' as const, icone: 'clock-alert-outline' as const }]
      : []),
    ...(pode('packing.apontar.ver')
      ? [{ titulo: 'Consultar romaneio', detalhe: 'Localize a carga e configure o posto', rota: '/packing-romaneio' as const, icone: 'file-search-outline' as const }]
      : []),
  ];

  const vazio = operacao.length === 0 && consulta.length === 0;

  return (
    <View style={e.tela}>
      <FaixaSinc />
      <ScrollView contentContainerStyle={e.conteudo}>
        <CabecalhoPagina
          etiqueta="Operação pós-colheita"
          titulo="Packing House"
          subtitulo="Da chegada da carga à caixa embalada."
        />

        {vazio ? (
          <View style={e.vazio}>
            <Text style={e.vazioTexto}>Seu perfil não possui acesso aos processos do Packing House.</Text>
          </View>
        ) : (
          <>
            {operacao.length > 0 && (
              <>
                <Text style={e.sobreTitulo}>OPERAÇÃO</Text>
                <View style={e.lista}>
                  {operacao.map((item) => <ItemProcesso key={item.rota} item={item} />)}
                </View>
              </>
            )}
            {consulta.length > 0 && (
              <>
                <Text style={e.sobreTitulo}>CONSULTA</Text>
                <View style={e.lista}>
                  {consulta.map((item) => <ItemProcesso key={item.rota} item={item} />)}
                </View>
              </>
            )}
            <Text style={e.nota}>
              SKUs, embalagens, mercados e certificações continuam no VERO web.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function ItemProcesso({ item }: { item: Entrada }) {
  const destaque = item.destaque === true;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(item.rota)}
      style={({ pressed }) => [e.item, destaque && e.itemDestaque, pressed && e.itemPressionado]}
    >
      <View style={[e.icone, destaque && e.iconeDestaque]}>
        <MaterialCommunityIcons name={item.icone} size={25} color={destaque ? cor.acaoTexto : cor.acao} />
      </View>
      <View style={e.itemTexto}>
        <Text style={[e.itemTitulo, destaque && e.itemTituloDestaque]}>{item.titulo}</Text>
        <Text style={[e.itemDetalhe, destaque && e.itemDetalheDestaque]}>{item.detalhe}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={26} color={destaque ? cor.acaoTexto : cor.acao} />
    </Pressable>
  );
}

const e = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cor.fundo },
  conteudo: { padding: espaco.md, paddingBottom: espaco.xl },
  sobreTitulo: { color: cor.textoDesativado, fontSize: 12, fontWeight: '800', letterSpacing: 1.1, marginTop: espaco.lg, marginBottom: espaco.sm },
  lista: { gap: espaco.sm },
  item: { minHeight: 96, flexDirection: 'row', alignItems: 'center', gap: espaco.md, backgroundColor: cor.superficie, borderWidth: 1, borderColor: cor.borda, borderRadius: raio.lg, padding: espaco.md, ...sombra.cartao },
  itemDestaque: { backgroundColor: cor.acao, borderColor: cor.acao },
  itemPressionado: { opacity: 0.84 },
  icone: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: cor.okFundo, borderRadius: raio.md },
  iconeDestaque: { backgroundColor: 'rgba(255,255,255,0.12)' },
  itemTexto: { flex: 1 },
  itemTitulo: { color: cor.textoForte, fontFamily: familia.titulo, fontSize: fonte.media, fontWeight: '800' },
  itemTituloDestaque: { color: cor.acaoTexto },
  itemDetalhe: { color: cor.textoSuave, fontSize: fonte.pequena, lineHeight: 21, marginTop: espaco.xs },
  itemDetalheDestaque: { color: cor.textoLateral },
  nota: { color: cor.textoSuave, fontFamily: familia.corpo, fontSize: fonte.pequena, lineHeight: 20, marginTop: espaco.lg },
  vazio: { minHeight: toque.alvo, backgroundColor: cor.superficie, borderRadius: raio.lg, padding: espaco.lg, marginTop: espaco.md },
  vazioTexto: { color: cor.textoSuave, fontSize: fonte.normal, lineHeight: 24 },
});
