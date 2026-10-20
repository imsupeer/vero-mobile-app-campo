import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';

import { useSessao } from '@/sessao';
import { CabecalhoPagina, Vazio } from '@/ui/componentes';
import { cor, espaco, fonte, raio, sombra } from '@/ui/tema';

type NomeIcone = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
type Item = { rota: string; titulo: string; detalhe: string; icone: NomeIcone; liberado: boolean };

export default function Consultas() {
  const { pode } = useSessao();
  const itens: Item[] = [
    { rota: '/painel', titulo: 'Painel operacional', detalhe: 'Indicadores dos últimos 30 dias.', icone: 'view-dashboard-variant-outline', liberado: true },
    { rota: '/estoque', titulo: 'Estoque', detalhe: 'Saldo, mínimo e itens a repor.', icone: 'warehouse', liberado: pode('estoque.ver') || pode('estoque.produtos_insumos.ver') },
    { rota: '/produtividade', titulo: 'Produtividade', detalhe: 'kg/ha realizado por válvula.', icone: 'chart-line', liberado: pode('agro.produtividade.ver') },
    { rota: '/irrigacao-consulta', titulo: 'Irrigação', detalhe: 'Planejado × realizado e consumo.', icone: 'water-percent', liberado: pode('irrigacao.ver') || pode('irrigacao.planejado_realizado.ver') || pode('irrigacao.planejamento_irrigacao.ver') || pode('irrigacao.consumo_agua.ver') || pode('irrigacao.consumo_energia.ver') || pode('irrigacao.custo_irrigacao.ver') },
    { rota: '/nutricao', titulo: 'Nutrição', detalhe: 'Análises de solo e foliar.', icone: 'leaf', liberado: pode('nutricao.analise_solo.ver') || pode('nutricao.analise_foliar.ver') },
  ];
  const liberadas = itens.filter((i) => i.liberado);

  return (
    <ScrollView style={e.tela} contentContainerStyle={e.conteudo}>
      <CabecalhoPagina etiqueta="Análise operacional" titulo="Consultas" subtitulo="Painéis e relatórios de campo — leitura dos dados do aparelho." />
      {liberadas.length === 0 ? <Vazio titulo="Nenhuma consulta disponível" detalhe="Seu perfil não tem acesso aos painéis." /> : liberadas.map((o) => (
        <Pressable key={o.rota} accessibilityRole="button" onPress={() => router.push(o.rota as never)} style={({ pressed }) => [e.cartao, pressed && e.pressionado]}>
          <View style={e.icone}><MaterialCommunityIcons name={o.icone} size={24} color={cor.acao} /></View>
          <View style={e.texto}><Text style={e.titulo}>{o.titulo}</Text><Text style={e.detalhe}>{o.detalhe}</Text></View>
          <MaterialCommunityIcons name="chevron-right" size={26} color={cor.acao} />
        </Pressable>
      ))}
    </ScrollView>
  );
}

const e = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cor.fundo }, conteudo: { padding: espaco.md, paddingBottom: espaco.xl },
  cartao: { minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: espaco.md, backgroundColor: cor.superficie, borderWidth: 1, borderColor: cor.borda, borderRadius: raio.lg, padding: espaco.md, marginBottom: espaco.sm, ...sombra.cartao },
  pressionado: { borderColor: cor.acaoApoio, backgroundColor: cor.fundoSuave },
  icone: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: cor.okFundo, borderRadius: raio.md },
  texto: { flex: 1 }, titulo: { color: cor.textoForte, fontSize: fonte.normal, fontWeight: '800' }, detalhe: { color: cor.textoSuave, fontSize: fonte.pequena, lineHeight: 20, marginTop: espaco.xs },
});
