import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';

import { useSessao } from '@/sessao';
import { CabecalhoPagina, Vazio } from '@/ui/componentes';
import { cor, espaco, fonte, raio, sombra } from '@/ui/tema';

type NomeIcone = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
type Op = { rota: string; titulo: string; detalhe: string; icone: NomeIcone; liberado: boolean };

export default function Operacoes() {
  const { pode } = useSessao();
  const ops: Op[] = [
    { rota: '/mip-monitorar', titulo: 'Monitoramento MIP/MID', detalhe: 'Amostragem de pragas e doenças e envio à análise.', icone: 'bug-outline', liberado: pode('mip.monitoramentos.editar') },
    { rota: '/aplicacoes', titulo: 'Aplicações (DF/IF)', detalhe: 'Consultar ordens e, conforme sua permissão, confirmar execução e assinar.', icone: 'spray', liberado: pode('mip.ver') || pode('mip.aplicacoes_defensivos.editar') },
    { rota: '/irrigacao', titulo: 'Irrigação', detalhe: 'Apontar horas, lâmina e consumo de água/energia.', icone: 'water-outline', liberado: pode('irrigacao.apontamentos_irrigacao.editar') },
    { rota: '/colheita', titulo: 'Colheita', detalhe: 'Colheita realizada, cargas e colheitas previstas.', icone: 'basket-outline', liberado: pode('agro.colheita.editar') || pode('agro.romaneios_colheita.editar') },
    { rota: '/atividades', titulo: 'Atividades (OS)', detalhe: 'Avançar o status das atividades planejadas.', icone: 'clipboard-check-outline', liberado: pode('agro.apontamentos_campo.editar') },
    { rota: '/maquinas', titulo: 'Máquinas', detalhe: 'Horímetro e abastecimento da frota.', icone: 'tractor-variant', liberado: pode('maquinas.horimetro.editar') || pode('maquinas.abastecimentos.editar') },
    { rota: '/compras', titulo: 'Compras', detalhe: 'Aprovar, receber, solicitar e dar entrada.', icone: 'cart-outline', liberado: pode('compras.aprovacoes.editar') || pode('compras.recebimentos.editar') || pode('compras.solicitacoes_compra.editar') || pode('estoque.entradas.editar') },
  ];
  const liberadas = ops.filter((o) => o.liberado);

  return (
    <ScrollView style={e.tela} contentContainerStyle={e.conteudo}>
      <CabecalhoPagina etiqueta="Registrar em campo" titulo="Operações" subtitulo="Fluxos que gravam no ERP — funcionam offline e sobem quando há rede." />
      {liberadas.length === 0 ? <Vazio titulo="Nenhuma operação disponível" detalhe="Seu perfil não tem permissão para os fluxos operacionais." /> : liberadas.map((o) => (
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
  cartao: { minHeight: 96, flexDirection: 'row', alignItems: 'center', gap: espaco.md, backgroundColor: cor.superficie, borderWidth: 1, borderColor: cor.borda, borderRadius: raio.lg, padding: espaco.md, marginBottom: espaco.sm, ...sombra.cartao },
  pressionado: { borderColor: cor.acaoApoio, backgroundColor: cor.fundoSuave },
  icone: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: cor.okFundo, borderRadius: raio.md },
  texto: { flex: 1 }, titulo: { color: cor.textoForte, fontSize: fonte.normal, fontWeight: '800' }, detalhe: { color: cor.textoSuave, fontSize: fonte.pequena, lineHeight: 20, marginTop: espaco.xs },
});
