import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';

import type { Alerta, ApontamentoAberto, MipRecebido, MipReferencia, Talhao } from '@/api/tipos';
import { buscarPrevisao, centroFazenda, previsaoGuardada } from '@/clima/previsao';
import type { Previsao } from '@/clima/previsao';
import { useFazenda } from '@/fazenda/contexto';
import { lerCache } from '@/db/banco';
import { classePorTalhao } from '@/mip/pressao';
import type { ClasseMapa } from '@/mip/pressao';
import { corDoEstado, MapaOffline } from '@/mapa/MapaOffline';
import type { EstadoMapa } from '@/mapa/MapaOffline';
import { MapaSatelite } from '@/mapa/MapaSatelite';
import { geometriaGeoJson, geometriaOuPontoGeoJson } from '@/mapa/geometria';
import { estadosPorSetor } from '@/mapa/estados';
import type { FeicaoMapa, ItemLegendaMapa } from '@/mapa/leafletHtml';
import { Paginacao } from '@/ui/Paginacao';

const POR_PAGINA = 5;
import { ClimaCard } from '@/ui/ClimaCard';
import { CabecalhoPagina, Carregando, Faixa, Vazio } from '@/ui/componentes';
import { FaixaSinc } from '@/ui/FaixaSinc';
import { cor, espaco, familia, fonte, raio, sombra, toque } from '@/ui/tema';

/** Rótulo e cores do selo, a partir do estado do mapa (situação ou pressão). */
function rotuloEstado(estado: EstadoMapa): { texto: string; cor: string; fundo: string } {
  switch (estado) {
    case 'servico': return { texto: 'Serviço aberto', cor: cor.alerta, fundo: cor.alertaFundo };
    case 'alerta': return { texto: 'Alerta', cor: cor.erro, fundo: cor.erroFundo };
    case 'controlado': return { texto: 'Controlado', cor: cor.ok, fundo: cor.okFundo };
    case 'atencao': return { texto: 'Atenção', cor: cor.alerta, fundo: cor.alertaFundo };
    case 'critico': return { texto: 'Crítico', cor: '#FFFFFF', fundo: '#7A1D14' };
    case 'sem': return { texto: 'Sem monitoramento', cor: cor.textoSuave, fundo: cor.campo };
    default: return { texto: 'Sem pendência', cor: cor.ok, fundo: cor.okFundo };
  }
}

function Lente({ ativo, rotulo, aoTocar }: { ativo: boolean; rotulo: string; aoTocar: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: ativo }} onPress={aoTocar} style={[e.lente, ativo && e.lenteAtiva]}>
      <Text style={[e.lenteTexto, ativo && e.lenteTextoAtivo]}>{rotulo}</Text>
    </Pressable>
  );
}

export default function Mapa() {
  const { filtrar, recarregarFazendas, selecionada } = useFazenda();
  const [areas, setAreas] = useState<Talhao[] | null>(null);
  const [abertos, setAbertos] = useState<ApontamentoAberto[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [previsao, setPrevisao] = useState<Previsao | null>(null);
  const [previsaoOffline, setPrevisaoOffline] = useState(false);
  const [recebidosMip, setRecebidosMip] = useState<MipRecebido[]>([]);
  const [referenciasMip, setReferenciasMip] = useState<MipReferencia[]>([]);
  const [lente, setLente] = useState<'situacao' | 'mip'>('situacao');
  const [online, setOnline] = useState(true);
  const [paginaLista, setPaginaLista] = useState(0);
  const [erro, setErro] = useState<string | null>(null);

  /* o mapa de satélite (Leaflet + Esri) precisa de rede; sem ela, cai para o
     desenho offline. NetInfo diz qual dos dois mostrar. */
  useEffect(() => {
  const parar = NetInfo.addEventListener((estado) => setOnline(estado.isConnected !== false));
    return () => parar();
  }, []);

  /* trocar a fazenda em foco recomeça a lista de válvulas na primeira página */
  useEffect(() => { setPaginaLista(0); }, [selecionada]);

  const carregar = useCallback(async () => {
    try {
      const [talhoes, servicos, avisos, recebidos, referencias] = await Promise.all([lerCache<Talhao>('talhoes'), lerCache<ApontamentoAberto>('apontamentos_abertos'), lerCache<Alerta>('alertas'), lerCache<MipRecebido>('mip_recebidos'), lerCache<MipReferencia>('mip_referencias')]);
      talhoes.sort((a, b) => String(a.codigo ?? a.nome ?? '').localeCompare(String(b.codigo ?? b.nome ?? '')));
      setAreas(talhoes); setAbertos(servicos); setAlertas(avisos); setRecebidosMip(recebidos); setReferenciasMip(referencias); setErro(null);
      void recarregarFazendas();
      void carregarClima(talhoes);
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível abrir o mapa.'); setAreas([]); }
  }, []);
  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));

  /* clima: mostra na hora a última leitura guardada e, em paralelo, tenta
     atualizar pela rede. Sem centro de fazenda não há o que consultar. */
  const carregarClima = useCallback(async (talhoes: Talhao[]) => {
    const guardada = await previsaoGuardada();
    if (guardada != null) { setPrevisao(guardada); setPrevisaoOffline(true); }
    const centro = centroFazenda(talhoes);
    if (centro == null) return;
    const fresca = await buscarPrevisao(centro.lat, centro.lng);
    if (fresca != null) {
      setPrevisao(fresca);
      setPrevisaoOffline(guardada != null && fresca.atualizadoEm === guardada.atualizadoEm);
    }
  }, []);

  /* alertas e serviços referenciam o id da válvula-pai (agro_talhoes), mas o
     mapa e os cartões são chaveados pelo id do SETOR. Traduzimos um no outro
     por este mapa; sem isso o vínculo só acertava por coincidência de id. */
  const estados = useMemo(() => estadosPorSetor(areas ?? [], abertos, alertas), [abertos, alertas, areas]);

  /* pressão MIP/MID por SETOR: calcula a classe por válvula-pai e reindexa para
     o id do setor, que é a chave que o mapa e os cartões usam. */
  const pressoes = useMemo(() => {
    const porSetor: Record<string, EstadoMapa> = {};
    const alvos = (areas ?? []).map((t) => t.talhao_id ?? t.id);
    const porTalhao = classePorTalhao(recebidosMip, referenciasMip, alvos);
    (areas ?? []).forEach((t) => {
      /* ClasseMapa ('controlado'|'atencao'|'alerta'|'critico'|'sem') é um
         subconjunto de EstadoMapa, então serve direto como estado do mapa. */
      porSetor[String(t.id)] = porTalhao.get(String(t.talhao_id ?? t.id)) ?? 'sem';
    });
    return porSetor;
  }, [areas, recebidosMip, referenciasMip]);

  const temMip = recebidosMip.length > 0;
  const estadosMapa: Record<string, EstadoMapa> = lente === 'mip' ? pressoes : estados;
  const legendaMapa =
    lente === 'mip'
      ? [
          { cor: cor.ok, texto: 'Controlado' },
          { cor: cor.alerta, texto: 'Atenção' },
          { cor: cor.erro, texto: 'Alerta' },
          { cor: '#7A1D14', texto: 'Crítico' },
          { cor: cor.tenue, texto: 'Sem monitoramento' },
        ]
      : undefined;

  const abrir = (item: Talhao) => router.push({ pathname: '/talhao', params: { id: String(item.id) } });
  const visiveis = filtrar(areas ?? []);
  const listaPagina = visiveis.slice(paginaLista * POR_PAGINA, paginaLista * POR_PAGINA + POR_PAGINA);

  /* O tenant tem uma única fazenda; lista e mapas representam o mesmo conjunto. */
  const talhoesDoMapa = visiveis;

  /* O mapa de satélite conectado enquadra as válvulas dessa fazenda única. */
  const legendaSatelite: ItemLegendaMapa[] = legendaMapa ?? [
    { cor: cor.ok, texto: 'Sem pendência' },
    { cor: cor.alerta, texto: 'Serviço aberto' },
    { cor: cor.erro, texto: 'Alerta' },
  ];
  const feicoes: FeicaoMapa[] = talhoesDoMapa.map((t) => ({
    id: String(t.id),
    nome: t.codigo ?? t.nome ?? `#${t.id}`,
    cor: corDoEstado(estadosMapa[String(t.id)] ?? 'normal'),
    geojson: geometriaOuPontoGeoJson(t),
  }));
  const temLimites = talhoesDoMapa.some((t) => geometriaGeoJson(t) !== null);
  const temLocalizacoes = feicoes.some((f) => f.geojson != null);
  const usarSatelite = online && temLocalizacoes;

  if (areas === null) return <View style={e.tela}><FaixaSinc /><Carregando /></View>;
  return (
    <View style={e.tela}>
      <FaixaSinc />
      {visiveis.length === 0 ? <Vazio titulo="Nenhuma área disponível" detalhe="As válvulas e seus limites chegam pela sincronização. O ERP precisa disponibilizar a geometria em GeoJSON." /> : (
        <FlatList
          data={listaPagina}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={e.conteudo}
          ListFooterComponent={<Paginacao pagina={paginaLista} porPagina={POR_PAGINA} total={visiveis.length} aoTrocar={setPaginaLista} />}
          ListHeaderComponent={<View style={e.cabecalho}>{erro !== null && <Faixa texto={erro} tom="erro" />}{previsao !== null && <ClimaCard previsao={previsao} offline={previsaoOffline} />}<CabecalhoPagina etiqueta="Visão territorial" titulo="Mapa da fazenda" subtitulo="Válvulas, situação atual e localização cadastrada." />{temMip && (<View style={e.lentes}><Lente ativo={lente === 'situacao'} rotulo="Situação" aoTocar={() => setLente('situacao')} /><Lente ativo={lente === 'mip'} rotulo="Pressão MIP/MID" aoTocar={() => setLente('mip')} /></View>)}{usarSatelite ? <MapaSatelite feicoes={feicoes} legenda={legendaSatelite} aviso={temLimites ? undefined : 'Limites das válvulas não recebidos. Exibindo os pontos centrais disponíveis.'} aoSelecionar={(id) => router.push({ pathname: '/talhao', params: { id } })} /> : <MapaOffline talhoes={talhoesDoMapa} estados={estadosMapa} legenda={legendaMapa} titulo={online ? 'Localização das válvulas' : 'Mapa offline da fazenda'} selo={online ? (temLocalizacoes ? null : 'SEM LOCALIZAÇÃO') : 'SEM INTERNET'} aoSelecionar={abrir} />}<Text style={e.secao}>Válvulas</Text></View>}
          renderItem={({ item }) => {
            const selo = rotuloEstado(estadosMapa[String(item.id)] ?? 'normal');
            return <Pressable accessibilityRole="button" onPress={() => abrir(item)} style={({ pressed }) => [e.cartao, pressed && e.cartaoPressionado]}>
              <View style={e.cartaoLinha}><View style={e.cartaoTexto}><Text style={e.codigo}>{item.codigo ?? item.nome ?? `Válvula ${item.id}`}</Text><Text style={e.detalhe}>{[item.nome !== item.codigo ? item.nome : null, item.variedade ?? item.cultura, item.area_ha != null ? `${Number(item.area_ha).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ha` : null].filter(Boolean).join(' · ') || 'Sem detalhes cadastrados'}</Text></View><Text style={[e.estado, { color: selo.cor, backgroundColor: selo.fundo }]}>{selo.texto}</Text></View>
            </Pressable>;
          }}
        />
      )}
    </View>
  );
}

const e = StyleSheet.create({
  lentes: { flexDirection: 'row', gap: espaco.sm },
  lente: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: raio.md, borderWidth: 1, borderColor: cor.borda, backgroundColor: cor.superficie, paddingHorizontal: espaco.sm },
  lenteAtiva: { backgroundColor: cor.acao, borderColor: cor.acao },
  lenteTexto: { color: cor.textoSuave, fontFamily: familia.corpo, fontSize: fonte.pequena, fontWeight: '700' },
  lenteTextoAtivo: { color: cor.acaoTexto },
  notaMapa: { color: cor.textoSuave, fontFamily: familia.corpo, fontSize: fonte.pequena, lineHeight: 20, marginTop: -espaco.xs },
  notaMapaForte: { color: cor.texto, fontWeight: '700' },
  tela: { flex: 1, backgroundColor: cor.fundo }, conteudo: { padding: espaco.md, paddingBottom: espaco.xl }, cabecalho: { gap: espaco.md }, titulo: { color: cor.textoForte, fontSize: fonte.grande, fontWeight: '800' }, subtitulo: { color: cor.textoSuave, fontSize: fonte.normal, lineHeight: 24, marginTop: espaco.xs }, secao: { color: cor.textoForte, fontSize: fonte.media, fontWeight: '800', marginTop: espaco.sm },
  cartao: { minHeight: toque.alvo, backgroundColor: cor.superficie, borderWidth: 1, borderColor: cor.borda, borderRadius: raio.lg, padding: espaco.md, marginTop: espaco.sm, ...sombra.cartao }, cartaoPressionado: { borderColor: cor.acaoApoio, backgroundColor: cor.fundoSuave }, cartaoLinha: { flexDirection: 'row', alignItems: 'flex-start', gap: espaco.sm }, cartaoTexto: { flex: 1 }, codigo: { color: cor.texto, fontFamily: familia.titulo, fontSize: fonte.normal, fontWeight: '800' }, detalhe: { color: cor.textoSuave, fontSize: fonte.pequena, marginTop: espaco.xs, lineHeight: 21 }, estado: { overflow: 'hidden', borderRadius: raio.sm, paddingHorizontal: espaco.sm, paddingVertical: espaco.xs, fontSize: fonte.pequena, fontWeight: '700' }, normal: { color: cor.ok, backgroundColor: cor.okFundo }, servico: { color: cor.alerta, backgroundColor: cor.alertaFundo }, alerta: { color: cor.erro, backgroundColor: cor.erroFundo },
});
