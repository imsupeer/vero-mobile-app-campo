import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';

import type { Alerta, ApontamentoAberto, Fenologia, MipRecebido, MipReferencia, Produtividade, Talhao } from '@/api/tipos';
import { lerCache } from '@/db/banco';
import { geometriaOuPontoGeoJson } from '@/mapa/geometria';
import type { Coordenada } from '@/mapa/geometria';
import { corDoEstado, MapaOffline } from '@/mapa/MapaOffline';
import { MapaSatelite } from '@/mapa/MapaSatelite';
import type { FeicaoMapa, ItemLegendaMapa } from '@/mapa/leafletHtml';
import { pressaoDoTalhao } from '@/mip/pressao';
import type { Pressao, ResumoPressao } from '@/mip/pressao';
import { useSessao } from '@/sessao';
import { enfileirar } from '@/sinc/fila';
import { useSinc } from '@/sinc/useSinc';
import { Botao, CabecalhoPagina, Carregando, Faixa, Vazio } from '@/ui/componentes';
import { cor, espaco, familia, fonte, raio, sombra } from '@/ui/tema';

/** "2026-08-16" → "16/08/2026". Devolve o original se não reconhecer. */
function formatarData(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m == null ? iso : `${m[3]}/${m[2]}/${m[1]}`;
}

/** Cor da classe de pressão — a mesma leitura de cor do painel do site. */
function corClasse(classe: Pressao['classe']): string {
  if (classe === 'critico' || classe === 'alerta') return cor.erro;
  if (classe === 'atencao') return cor.alerta;
  return cor.ok;
}

const ROTULO_TIPO: Record<Pressao['tipo'], string> = { praga: 'praga', doenca: 'doença', outro: '—' };
const LEGENDA_MAPA: ItemLegendaMapa[] = [
  { cor: '#0E7E72', texto: 'Sem pendência' },
  { cor: '#8A5A12', texto: 'Serviço aberto' },
  { cor: '#B83A2F', texto: 'Alerta' },
];

function LinhaPressao({ p }: { p: Pressao }) {
  const tinta = corClasse(p.classe);
  const pct = Math.round(p.razao * 100);
  const contexto = [ROTULO_TIPO[p.tipo], p.local].filter((x) => x != null && x !== '—').join(' · ');
  const virgula = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');
  return (
    <View style={e.mipLinha}>
      <View style={e.mipCabeca}>
        <Text style={e.mipNome} numberOfLines={1}>
          {p.nome}
          {contexto !== '' ? <Text style={e.mipContexto}>{`  ${contexto}`}</Text> : null}
        </Text>
        <Text style={[e.mipPct, { color: tinta }]}>{pct}%</Text>
      </View>
      <View style={e.mipTrilho}>
        <View style={[e.mipBarra, { width: `${Math.max(4, Math.min(100, pct))}%`, backgroundColor: tinta }]} />
      </View>
      <Text style={e.mipMedida}>
        {virgula(p.valor)}/{virgula(p.nivelAcao)} · nível de ação
      </Text>
    </View>
  );
}

function ItemLegenda({ cor: c, rotulo }: { cor: string; rotulo: string }) {
  return (
    <View style={e.legendaItem}>
      <View style={[e.legendaPonto, { backgroundColor: c }]} />
      <Text style={e.legendaTexto}>{rotulo}</Text>
    </View>
  );
}

export default function FichaTalhao() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [talhao, setTalhao] = useState<Talhao | null>(null);
  const [fenologia, setFenologia] = useState<Fenologia | null>(null);
  const [servicos, setServicos] = useState<ApontamentoAberto[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [produtividade, setProdutividade] = useState<Produtividade[]>([]);
  const [mip, setMip] = useState<ResumoPressao>({ itens: [], totalMonitoramentos: 0, ultima: null });
  const [carregando, setCarregando] = useState(true);
  const [posicao, setPosicao] = useState<Coordenada | null>(null);
  const [precisao, setPrecisao] = useState<number | null>(null);
  const [procurando, setProcurando] = useState(false);
  const [erroGps, setErroGps] = useState<string | null>(null);
  const observador = useRef<Location.LocationSubscription | null>(null);
  const { pode } = useSessao();
  const { recontar, agora } = useSinc();
  const podeReconhecer = pode('mip.alertas_fitossanitarios.editar');
  const podeVerProdutividade = pode('agro.produtividade.ver');
  const [reconhecidos, setReconhecidos] = useState<Set<number>>(new Set());
  const [avisoAlerta, setAvisoAlerta] = useState<string | null>(null);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let ativo = true;
    void NetInfo.fetch().then((estado) => {
      if (ativo) setOnline(estado.isConnected !== false);
    });
    const inscricao = NetInfo.addEventListener((estado) => setOnline(estado.isConnected !== false));
    return () => {
      ativo = false;
      inscricao();
    };
  }, []);

  const reconhecer = useCallback(async (alertaId: number) => {
    setAvisoAlerta(null);
    try {
      await enfileirar({ tipo: 'alerta_reconhecer', rota: `/alertas/${alertaId}/reconhecer`, payload: {} });
      setReconhecidos((atual) => { const proximo = new Set(atual); proximo.add(alertaId); return proximo; });
      await recontar(); void agora();
      setAvisoAlerta('Alerta reconhecido — a baixa sobe na próxima sincronização.');
    } catch (e) { setAvisoAlerta(e instanceof Error ? e.message : 'Não foi possível reconhecer o alerta.'); }
  }, [agora, recontar]);

  useEffect(() => {
    void (async () => {
      const [talhoes, fases, abertos, avisos, recebidos, referencias, produtividadeCache] = await Promise.all([lerCache<Talhao>('talhoes'), lerCache<Fenologia>('fenologia'), lerCache<ApontamentoAberto>('apontamentos_abertos'), lerCache<Alerta>('alertas'), lerCache<MipRecebido>('mip_recebidos'), lerCache<MipReferencia>('mip_referencias'), lerCache<Produtividade>('produtividade').catch(() => [])]);
      const item = talhoes.find((registro) => String(registro.id) === id) ?? null;
      setTalhao(item);
      /* fenologia, serviços, alertas e MIP se ligam ao id da válvula-pai
         (agro_talhoes), que vem em `talhao_id` — não ao `id` do setor. */
      const chave = String(item?.talhao_id ?? item?.id);
      setFenologia(fases.find((registro) => String(registro.talhao_id) === chave) ?? null);
      setServicos(abertos.filter((registro) => String(registro.talhao_id) === chave));
      setAlertas(avisos.filter((registro) => String(registro.talhao_id) === chave && (registro.status == null || registro.status === 'aberto')));
      setProdutividade(produtividadeCache.filter((registro) => String(registro.id) === chave));
      if (item != null) setMip(pressaoDoTalhao(recebidos, referencias, item.talhao_id ?? item.id));
      setCarregando(false);
    })();
    return () => { observador.current?.remove(); };
  }, [id]);

  const marcarPosicao = useCallback(async () => {
    setErroGps(null); setProcurando(true); setPosicao(null); setPrecisao(null);
    observador.current?.remove(); observador.current = null;
    try {
      const permissao = await Location.requestForegroundPermissionsAsync();
      if (!permissao.granted) { setErroGps('Autorize a localização para marcar sua posição no mapa.'); setProcurando(false); return; }
      observador.current = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Highest, timeInterval: 1500, distanceInterval: 0 }, (local) => {
        setPosicao([local.coords.longitude, local.coords.latitude]);
        setPrecisao(local.coords.accuracy);
        setProcurando(false);
      });
    } catch (e) { setErroGps(e instanceof Error ? e.message : 'Não foi possível obter a posição.'); setProcurando(false); }
  }, []);

  const progresso = useMemo(() => {
    if (fenologia?.dia_inicio == null || fenologia.dia_fim == null || fenologia.dias_desde_poda == null) return null;
    const inicio = Number(fenologia.dia_inicio); const fim = Number(fenologia.dia_fim); const atual = Number(fenologia.dias_desde_poda);
    return fim <= inicio ? null : Math.max(0, Math.min(1, (atual - inicio) / (fim - inicio)));
  }, [fenologia]);

  if (carregando) return <View style={e.tela}><Carregando /></View>;
  if (talhao === null) return <View style={e.tela}><Vazio titulo="Válvula não encontrada" detalhe="Sincronize novamente para atualizar o cadastro." /></View>;
  const estado = alertas.length > 0 ? 'alerta' : servicos.length > 0 ? 'servico' : 'normal';
  const geojson = geometriaOuPontoGeoJson(talhao);
  const feicao: FeicaoMapa = {
    id: String(talhao.id),
    nome: talhao.codigo ?? talhao.nome ?? `Válvula ${talhao.id}`,
    cor: corDoEstado(estado),
    geojson,
  };
  const contexto = [talhao.variedade ?? talhao.cultura, talhao.porta_enxerto != null ? `porta-enxerto ${talhao.porta_enxerto}` : null, talhao.estrutura_sistema, talhao.area_ha != null ? `${Number(talhao.area_ha).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ha` : null, talhao.num_plantas != null ? `${talhao.num_plantas} plantas` : null].filter(Boolean);
  const numero = (valor: unknown, casas = 0) => {
    const n = Number(valor);
    return Number.isFinite(n) ? n.toLocaleString('pt-BR', { maximumFractionDigits: casas }) : '—';
  };

  return (
    <ScrollView style={e.tela} contentContainerStyle={e.conteudo}>
      <CabecalhoPagina etiqueta="Ficha agronômica" titulo={talhao.codigo ?? talhao.nome ?? `Válvula ${talhao.id}`} subtitulo={[talhao.nome !== talhao.codigo ? talhao.nome : null, talhao.fazenda].filter(Boolean).join(' · ') || 'Ficha da válvula'} />
      {online && geojson != null ? (
        <MapaSatelite feicoes={[feicao]} legenda={LEGENDA_MAPA} titulo="Mapa da válvula" altura={280} />
      ) : (
        <MapaOffline
          talhoes={[talhao]}
          estados={{ [String(talhao.id)]: estado }}
          selecionadoId={talhao.id}
          posicao={posicao}
          titulo={online ? 'Croqui da válvula · sem localização' : 'Croqui offline da válvula'}
          selo={online ? 'SEM LOCALIZAÇÃO' : 'SEM INTERNET'}
        />
      )}

      <View style={e.cartao}>
        <Text style={e.sobreTitulo}>VINHEDO</Text>
        <Text style={e.contexto}>{contexto.join(' · ') || 'Sem dados complementares cadastrados.'}</Text>
      </View>

      {podeVerProdutividade && <View style={e.cartao}>
        <Text style={e.sobreTitulo}>PRODUÇÃO POR SAFRA</Text>
        {produtividade.length === 0 ? <Text style={e.legenda}>Nenhuma produção sincronizada para esta válvula.</Text> : produtividade.map((item, indice) => {
          const meta = Number(item.produtividade_planejada) || 0;
          const realizado = Number(item.kg_ha) || 0;
          const atingimento = meta > 0 ? Math.round((realizado / meta) * 100) : null;
          return <View key={`${item.safra_id ?? item.safra ?? 'safra'}-${item.cultura_id ?? indice}`} style={e.safraProducao}>
            <Text style={e.safraTitulo}>{[item.safra ? `Safra ${item.safra}` : null, item.cultura].filter(Boolean).join(' · ') || `Safra ${indice + 1}`}</Text>
            <Text style={e.safraDados}>{`${numero(item.kg_realizado)} kg realizados · ${numero(item.kg_ha)} kg/ha`}</Text>
            {meta > 0 && <Text style={e.safraDados}>{`${atingimento}% da meta de ${numero(meta)} kg/ha`}</Text>}
          </View>;
        })}
      </View>}

      <View style={e.cartao}>
        <Text style={e.sobreTitulo}>FASE FENOLÓGICA</Text>
        {fenologia == null ? (
          <Text style={e.legenda}>Nenhuma fenologia sincronizada para esta válvula.</Text>
        ) : (
          <>
            {fenologia.fase_nome != null ? (
              <>
                <View style={e.faseLinha}>
                  <Text style={e.fase}>{fenologia.fase_nome}</Text>
                  {fenologia.dias_desde_poda != null && <Text style={e.dias}>Dia {fenologia.dias_desde_poda}</Text>}
                </View>
                {progresso !== null && <View style={e.trilho}><View style={[e.progresso, { width: `${Math.round(progresso * 100)}%` }]} /></View>}
              </>
            ) : (
              /* sem o calendário fenológico da variedade não dá para nomear a
                 fase; ainda assim mostramos os fatos que temos, em vez de um
                 vazio que parece falta de sincronização. */
              <Text style={e.faseSemNome}>Fase não nomeada — o calendário fenológico da variedade não está cadastrado no ERP.</Text>
            )}
            <Text style={e.contexto}>
              {[
                fenologia.variedade,
                fenologia.safra != null ? `safra ${fenologia.safra}` : null,
                fenologia.dias_desde_poda != null ? `${fenologia.dias_desde_poda} dias desde a poda` : null,
                fenologia.data_poda != null ? `poda em ${formatarData(String(fenologia.data_poda))}` : null,
              ].filter(Boolean).join(' · ') || 'Sem detalhes da fenologia.'}
            </Text>
            {fenologia.volume_mm_dia != null && (
              <View style={e.recomendacao}>
                <Text style={e.recomendacaoTitulo}>Irrigação recomendada</Text>
                <Text style={e.recomendacaoValor}>{String(fenologia.volume_mm_dia).replace('.', ',')} mm/dia</Text>
              </View>
            )}
          </>
        )}
      </View>

      {mip.itens.length > 0 && (
        <View style={e.cartao}>
          <View style={e.mipTopo}>
            <Text style={e.sobreTitulo}>PRESSÃO MIP/MID · 12 SEMANAS</Text>
            <Text style={e.mipResumo}>
              {mip.totalMonitoramentos} monitoramento(s){mip.ultima != null ? ` · último ${mip.ultima}` : ''}
            </Text>
          </View>
          <View style={e.mipLista}>
            {mip.itens.map((p) => <LinhaPressao key={p.alvoId} p={p} />)}
          </View>
          <View style={e.mipLegenda}>
            <ItemLegenda cor={cor.ok} rotulo="Controlado <50%" />
            <ItemLegenda cor={cor.alerta} rotulo="Atenção 50–99%" />
            <ItemLegenda cor={cor.erro} rotulo="Alerta ≥100%" />
          </View>
        </View>
      )}

      <View style={e.grade}><View style={[e.cartao, e.kpi]}><Text style={e.sobreTitulo}>SERVIÇOS ABERTOS</Text><Text style={e.kpiValor}>{servicos.length}</Text></View><View style={[e.cartao, e.kpi]}><Text style={e.sobreTitulo}>ALERTAS ATIVOS</Text><Text style={[e.kpiValor, alertas.length > 0 && { color: cor.erro }]}>{alertas.length}</Text></View></View>

      {alertas.length > 0 && (
        <View style={e.cartao}>
          <Text style={e.sobreTitulo}>ALERTAS ABERTOS</Text>
          {avisoAlerta !== null && <View style={e.faixa}><Faixa texto={avisoAlerta} /></View>}
          <View style={e.alertas}>
            {alertas.map((a) => {
              const critico = String(a.severidade ?? '').toLowerCase().includes('critic');
              const feito = reconhecidos.has(a.id) || a.status === 'reconhecido';
              return (
                <View key={a.id} style={[e.alerta, { borderLeftColor: critico ? cor.erro : cor.alerta }]}>
                  <View style={e.alertaTopo}>
                    <Text style={e.alertaTitulo} numberOfLines={2}>{a.titulo ?? 'Alerta'}</Text>
                    <Text style={[e.alertaSelo, { color: critico ? cor.erro : cor.alerta, backgroundColor: critico ? cor.erroFundo : cor.alertaFundo }]}>
                      {critico ? 'Crítico' : 'Atenção'}
                    </Text>
                  </View>
                  {a.mensagem != null && <Text style={e.alertaMsg}>{a.mensagem}</Text>}
                  {a.data != null && <Text style={e.alertaData}>{formatarData(a.data)}</Text>}
                  {feito ? (
                    <Text style={e.alertaReconhecido}>Reconhecido</Text>
                  ) : podeReconhecer ? (
                    <Pressable accessibilityRole="button" onPress={() => void reconhecer(a.id)} style={e.alertaBotao}>
                      <Text style={e.alertaBotaoTexto}>Reconhecer</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>
      )}

      <View style={e.cartao}>
        <Text style={e.sobreTitulo}>MINHA POSIÇÃO</Text>
        <Text style={e.contexto}>O GPS atualiza o ponto conforme encontra uma leitura mais precisa.</Text>
        {procurando && <View style={e.faixa}><Faixa texto="Procurando sinal de GPS…" tom="alerta" /></View>}
        {erroGps !== null && <View style={e.faixa}><Faixa texto={erroGps} tom="erro" /></View>}
        {posicao !== null && <View style={e.gpsDados}><Text style={e.precisao}>Precisão: ±{Math.round(precisao ?? 0)} m</Text><Text style={e.coordenadas}>{posicao[1].toFixed(6)}, {posicao[0].toFixed(6)}</Text><Text style={e.confianca}>{precisao != null && precisao <= 10 ? 'Boa precisão para identificação da válvula.' : precisao != null && precisao <= 30 ? 'Precisão moderada; aguarde para melhorar.' : 'Precisão baixa; não use este ponto como confirmação da válvula.'}</Text></View>}
        <View style={e.botao}><Botao titulo={posicao === null ? 'Marcar minha posição' : 'Atualizar posição'} ocupado={procurando} aoTocar={() => void marcarPosicao()} /></View>
      </View>
    </ScrollView>
  );
}

const e = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cor.fundo }, conteudo: { padding: espaco.md, paddingBottom: espaco.xl, gap: espaco.md }, titulo: { color: cor.textoForte, fontSize: fonte.grande, fontWeight: '800' }, subtitulo: { color: cor.textoSuave, fontSize: fonte.normal, marginTop: -espaco.sm }, cartao: { backgroundColor: cor.superficie, borderRadius: raio.lg, borderWidth: 1, borderColor: cor.borda, padding: espaco.md, ...sombra.cartao }, sobreTitulo: { color: cor.textoDesativado, fontSize: 12, fontWeight: '800', letterSpacing: 1.1 }, contexto: { color: cor.texto, fontSize: fonte.normal, lineHeight: 24, marginTop: espaco.sm }, faseLinha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: espaco.sm, marginTop: espaco.sm }, fase: { flex: 1, color: cor.textoForte, fontSize: fonte.media, fontWeight: '800' }, dias: { color: cor.acao, fontSize: fonte.pequena, fontWeight: '700' }, trilho: { height: 8, overflow: 'hidden', backgroundColor: cor.campo, borderRadius: raio.sm, marginTop: espaco.md }, progresso: { height: 8, backgroundColor: cor.acaoApoio, borderRadius: raio.sm }, legenda: { color: cor.textoSuave, fontSize: fonte.pequena, marginTop: espaco.sm }, faseSemNome: { color: cor.alerta, fontFamily: familia.corpo, fontSize: fonte.pequena, lineHeight: 20, marginTop: espaco.sm }, recomendacao: { backgroundColor: cor.okFundo, borderRadius: raio.md, padding: espaco.md, marginTop: espaco.md }, recomendacaoTitulo: { color: cor.ok, fontSize: fonte.pequena, fontWeight: '700' }, recomendacaoValor: { color: cor.textoForte, fontFamily: familia.numero, fontSize: fonte.media, fontWeight: '800', marginTop: espaco.xs }, grade: { flexDirection: 'row', gap: espaco.sm }, kpi: { flex: 1 }, kpiValor: { color: cor.textoForte, fontFamily: familia.numero, fontSize: fonte.grande, fontWeight: '800', marginTop: espaco.sm }, faixa: { marginTop: espaco.md }, gpsDados: { marginTop: espaco.md }, precisao: { color: cor.acao, fontSize: fonte.media, fontWeight: '800' }, coordenadas: { color: cor.textoSuave, fontFamily: familia.numero, fontSize: fonte.pequena, marginTop: espaco.xs }, confianca: { color: cor.texto, fontSize: fonte.pequena, lineHeight: 21, marginTop: espaco.sm }, botao: { marginTop: espaco.md },
  alertas: { gap: espaco.sm, marginTop: espaco.sm },
  alerta: { borderLeftWidth: 3, backgroundColor: cor.fundoSuave, borderRadius: raio.sm, paddingVertical: espaco.sm, paddingHorizontal: espaco.md },
  alertaTopo: { flexDirection: 'row', alignItems: 'flex-start', gap: espaco.sm },
  alertaTitulo: { flex: 1, color: cor.textoForte, fontFamily: familia.corpo, fontSize: fonte.pequena, fontWeight: '700', lineHeight: 20 },
  alertaSelo: { overflow: 'hidden', borderRadius: raio.sm, paddingHorizontal: espaco.sm, paddingVertical: 2, fontSize: 11, fontWeight: '800' },
  alertaMsg: { color: cor.textoSuave, fontFamily: familia.corpo, fontSize: fonte.pequena, lineHeight: 20, marginTop: espaco.xs },
  alertaData: { color: cor.textoDesativado, fontFamily: familia.numero, fontSize: 12, marginTop: espaco.xs },
  alertaBotao: { alignSelf: 'flex-start', minHeight: 40, justifyContent: 'center', marginTop: espaco.sm, borderWidth: 1, borderColor: cor.acao, borderRadius: raio.md, paddingHorizontal: espaco.md },
  alertaBotaoTexto: { color: cor.acao, fontFamily: familia.corpo, fontSize: fonte.pequena, fontWeight: '700' },
  alertaReconhecido: { color: cor.ok, fontFamily: familia.corpo, fontSize: fonte.pequena, fontWeight: '700', marginTop: espaco.sm },
  mipTopo: { gap: 2 },
  mipResumo: { color: cor.textoSuave, fontFamily: familia.corpo, fontSize: fonte.pequena },
  mipLista: { gap: espaco.md, marginTop: espaco.md },
  mipLinha: { gap: espaco.xs },
  mipCabeca: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: espaco.sm },
  mipNome: { flex: 1, color: cor.textoForte, fontFamily: familia.corpo, fontSize: fonte.pequena, fontWeight: '700' },
  mipContexto: { color: cor.textoSuave, fontWeight: '400' },
  mipPct: { fontFamily: familia.numero, fontSize: fonte.normal, fontWeight: '800' },
  mipTrilho: { height: 8, backgroundColor: cor.campo, borderRadius: raio.sm, overflow: 'hidden' },
  mipBarra: { height: 8, borderRadius: raio.sm },
  mipMedida: { color: cor.textoSuave, fontFamily: familia.numero, fontSize: 12 },
  safraProducao: { borderTopWidth: 1, borderTopColor: cor.borda, paddingTop: espaco.sm, marginTop: espaco.sm },
  safraTitulo: { color: cor.textoForte, fontSize: fonte.normal, fontWeight: '800' },
  safraDados: { color: cor.textoSuave, fontSize: fonte.pequena, marginTop: espaco.xs },
  mipLegenda: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.md, marginTop: espaco.md, paddingTop: espaco.md, borderTopWidth: 1, borderTopColor: cor.borda },
  legendaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendaPonto: { width: 8, height: 8, borderRadius: 4 },
  legendaTexto: { color: cor.textoSuave, fontFamily: familia.corpo, fontSize: 12 },
});
