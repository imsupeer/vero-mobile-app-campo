import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, Pressable, View } from 'react-native';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProvedorFazenda } from '@/fazenda/contexto';
import { useSessao } from '@/sessao';
import { relatoriosDisponiveis } from '@/relatorios/catalogo';
import { ProvedorSinc } from '@/sinc/useSinc';
import { BotaoSair } from '@/ui/BotaoSair';
import { MarcaVero } from '@/ui/MarcaVero';
import { SeletorFazenda } from '@/ui/SeletorFazenda';
import { cor, familia, fonte } from '@/ui/tema';

type NomeIcone = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

function IconeAba({ nome, corIcone, tamanho }: { nome: NomeIcone; corIcone: ColorValue; tamanho: number }) {
  return <MaterialCommunityIcons name={nome} size={tamanho} color={corIcone} />;
}

export default function LayoutCampo() {
  const { pode } = useSessao();
  const insets = useSafeAreaInsets();
  const insetoInferior =
    Platform.OS === 'android' ? Math.max(insets.bottom, 32) : insets.bottom;
  const podePacking = pode('packing.ver') || pode('packing.apontar.ver') || pode('packing.apontar.editar') || pode('packing.recepcao.ver') || pode('packing.recepcao.editar') || pode('agro.romaneios_colheita.ver') || pode('agro.romaneios_colheita.editar');
  const podeFinanceiro = pode('financeiro.ver') || pode('financeiro.contas_pagar.ver') || pode('financeiro.contas_receber.ver');
  const podeRelatorios = relatoriosDisponiveis(pode).length > 0;

  return (
    <ProvedorSinc>
    <ProvedorFazenda>
      <StatusBar style="dark" />
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: cor.fundo },
          headerShadowVisible: false,
          headerLeftContainerStyle: { paddingLeft: 12 },
          headerLeft: () => <MarcaVero compacta />,
          headerTitle: () => <SeletorFazenda />,
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: 8 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Buscar"
                onPress={() => router.push('/busca')}
                hitSlop={8}
                style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
              >
                <MaterialCommunityIcons name="magnify" size={24} color={cor.texto} />
              </Pressable>
              <BotaoSair />
            </View>
          ),
          headerTitleAlign: 'left',
          headerTitleStyle: { fontFamily: familia.titulo, fontSize: fonte.media, color: cor.texto },
          tabBarActiveTintColor: cor.acaoTexto,
          tabBarInactiveTintColor: cor.textoLateral,
          tabBarLabelStyle: { fontFamily: familia.corpo, fontSize: 11, fontWeight: '600' },
          tabBarStyle: {
            height: 70 + insetoInferior,
            paddingBottom: Math.max(insetoInferior, 8),
            paddingTop: 7,
            backgroundColor: cor.cabecalho,
            borderTopWidth: 0,
            elevation: 0,
          },
          tabBarItemStyle: { borderRadius: 8, marginHorizontal: 1 },
        }}
      >
        <Tabs.Screen name="inicio" options={{ title: 'Início', tabBarIcon: ({ color, size }) => <IconeAba nome="view-dashboard-outline" corIcone={color} tamanho={size} /> }} />
        <Tabs.Screen name="caderno" options={{ title: 'Caderno', href: pode('caderno.ver') ? undefined : null, tabBarIcon: ({ color, size }) => <IconeAba nome="notebook-outline" corIcone={color} tamanho={size} /> }} />
        <Tabs.Screen name="mapa" options={{ title: 'Mapa', href: pode('mapa.ver') ? undefined : null, tabBarIcon: ({ color, size }) => <IconeAba nome="map-outline" corIcone={color} tamanho={size} /> }} />
        <Tabs.Screen name="packing" options={{ title: 'Packing', href: podePacking ? undefined : null, tabBarIcon: ({ color, size }) => <IconeAba nome="package-variant-closed" corIcone={color} tamanho={size} /> }} />
        <Tabs.Screen name="financeiro" options={{ title: 'Financeiro', href: podeFinanceiro ? undefined : null, tabBarIcon: ({ color, size }) => <IconeAba nome="cash-multiple" corIcone={color} tamanho={size} /> }} />
        <Tabs.Screen name="relatorios" options={{ title: 'Relatórios', href: podeRelatorios ? undefined : null, tabBarIcon: ({ color, size }) => <IconeAba nome="chart-box-outline" corIcone={color} tamanho={size} /> }} />
        <Tabs.Screen name="fila" options={{ title: 'Fila de envio', href: null }} />
        <Tabs.Screen name="novo-apontamento" options={{ title: 'Novo apontamento', href: null }} />
        <Tabs.Screen name="apontamento" options={{ title: 'Detalhes do apontamento', href: null }} />
        <Tabs.Screen name="talhao" options={{ title: 'Ficha da válvula', href: null }} />
        <Tabs.Screen name="packing-apontar" options={{ title: 'Posto de caixas', href: null }} />
        <Tabs.Screen name="packing-recepcao" options={{ title: 'Recepção de cargas', href: null }} />
        <Tabs.Screen name="packing-romaneio" options={{ title: 'Consultar romaneio', href: null }} />
        <Tabs.Screen name="relatorio" options={{ title: 'Consulta', href: null }} />
        <Tabs.Screen name="operacoes" options={{ title: 'Operações', href: null }} />
        <Tabs.Screen name="mip-monitorar" options={{ title: 'Monitoramento MIP', href: null }} />
        <Tabs.Screen name="aplicacoes" options={{ title: 'Aplicações', href: null }} />
        <Tabs.Screen name="aplicacao" options={{ title: 'Aplicação', href: null }} />
        <Tabs.Screen name="irrigacao" options={{ title: 'Irrigação', href: null }} />
        <Tabs.Screen name="colheita" options={{ title: 'Colheita', href: null }} />
        <Tabs.Screen name="atividades" options={{ title: 'Atividades', href: null }} />
        <Tabs.Screen name="maquinas" options={{ title: 'Máquinas', href: null }} />
        <Tabs.Screen name="compras" options={{ title: 'Compras', href: null }} />
        <Tabs.Screen name="estoque" options={{ title: 'Estoque', href: null }} />
        <Tabs.Screen name="painel" options={{ title: 'Painel', href: null }} />
        <Tabs.Screen name="consultas" options={{ title: 'Consultas', href: null }} />
        <Tabs.Screen name="produtividade" options={{ title: 'Produtividade', href: null }} />
        <Tabs.Screen name="irrigacao-consulta" options={{ title: 'Irrigação', href: null }} />
        <Tabs.Screen name="nutricao" options={{ title: 'Nutrição', href: null }} />
        <Tabs.Screen name="novo-analise-nutricao" options={{ title: 'Nova análise nutricional', href: null }} />
        <Tabs.Screen name="relogio-frio" options={{ title: 'Relógio de frio', href: null }} />
        <Tabs.Screen name="busca" options={{ title: 'Buscar', href: null }} />
      </Tabs>
    </ProvedorFazenda>
    </ProvedorSinc>
  );
}
