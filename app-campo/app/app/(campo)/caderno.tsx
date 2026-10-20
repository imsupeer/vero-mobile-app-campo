import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import type { ApontamentoAberto, ApontamentoHistorico, Talhao } from '@/api/tipos';
import { lerCarga, rotuloEstado, rotuloTipo } from '@/caderno/modelo';
import { lerCache } from '@/db/banco';
import { useFazenda } from '@/fazenda/contexto';
import { filtrarPorTalhoes } from '@/fazenda/modelo';
import { todos } from '@/sinc/fila';
import type { ItemFila } from '@/sinc/fila';
import { useSinc } from '@/sinc/useSinc';
import { Botao, CabecalhoPagina, Carregando, Faixa, Vazio } from '@/ui/componentes';
import { GradeIndicadores, Indicador } from '@/ui/Indicador';
import { Paginacao } from '@/ui/Paginacao';
import { FaixaSinc } from '@/ui/FaixaSinc';

const POR_PAGINA = 5;
import { cor, espaco, familia, fonte, raio, sombra, toque } from '@/ui/tema';

type ItemLocal = { fila: ItemFila; carga: NonNullable<ReturnType<typeof lerCarga>> };

export default function Caderno() {
  const { agora } = useSinc();
  const { filtrar } = useFazenda();
  const [abertos, setAbertos] = useState<ApontamentoAberto[] | null>(null);
  const [locais, setLocais] = useState<ItemLocal[]>([]);
  const [historico, setHistorico] = useState<ApontamentoHistorico[]>([]);
  const [aba, setAba] = useState<'todos' | 'colheita' | 'tratos'>('todos');
  const [periodo, setPeriodo] = useState<'tudo' | '90' | '30'>('tudo');
  const [valvulaSel, setValvulaSel] = useState<string | null>(null);
  const [paginaHist, setPaginaHist] = useState(0);
  const [talhoes, setTalhoes] = useState<Map<number, string>>(new Map());
  const [erro, setErro] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const [itensServidor, itensFila, cadastroTalhoes, hist] = await Promise.all([
        lerCache<ApontamentoAberto>('apontamentos_abertos'),
        todos(),
        lerCache<Talhao>('talhoes'),
        lerCache<ApontamentoHistorico>('apontamentos'),
      ]);
      setAbertos(itensServidor);
      hist.sort((a, b) => String(b.data ?? '').localeCompare(String(a.data ?? '')));
      setHistorico(hist);
      const uuidsNoServidor = new Set(itensServidor.map((item) => item.client_uuid).filter((uuid): uuid is string => typeof uuid === 'string'));
      setLocais(
        itensFila
          .filter((item) => item.tipo === 'apontamento' && item.estado !== 'confirmado' && !uuidsNoServidor.has(item.clientUuid))
          .map((fila) => ({ fila, carga: lerCarga(fila) }))
          .filter((item): item is ItemLocal => item.carga !== null),
      );
      setTalhoes(new Map(filtrar(cadastroTalhoes).map((item) => [item.id, item.nome ?? item.codigo ?? `Válvula ${item.id}`])));
      setErro(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível abrir o caderno.');
    }
  }, [filtrar]);

  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));

  /* trocar de aba/período/válvula recomeça o histórico da primeira página */
  useEffect(() => { setPaginaHist(0); }, [aba, periodo, valvulaSel]);

  const atualizar = useCallback(async () => {
    setAtualizando(true);
    await agora();
    await carregar();
    setAtualizando(false);
  }, [agora, carregar]);

  if (abertos === null && erro === null) return <View style={e.tela}><FaixaSinc /><Carregando /></View>;

  const abertosDaFazenda = filtrar(abertos ?? []);
  const locaisDaFazenda = filtrarPorTalhoes(locais, new Set(talhoes.keys()));
  const emFila = locaisDaFazenda.length > 0 || abertosDaFazenda.length > 0;
  const semNada = !emFila && historico.length === 0;

  const ABAS: Array<{ valor: typeof aba; rotulo: string }> = [
    { valor: 'todos', rotulo: 'Todos' },
    { valor: 'colheita', rotulo: 'Colheita' },
    { valor: 'tratos', rotulo: 'Tratos' },
  ];
  const PERIODOS: Array<{ valor: typeof periodo; rotulo: string }> = [
    { valor: 'tudo', rotulo: 'Tudo' },
    { valor: '90', rotulo: '90 dias' },
    { valor: '30', rotulo: '30 dias' },
  ];

  /* a fazenda em foco vale para o histórico também (o item traz `fazenda`). */
  const daFazenda = filtrar(historico);
  /* as válvulas do chip de filtro saem do que sobrou após a fazenda. */
  const valvulas = Array.from(new Set(daFazenda.map((h) => h.valvula).filter((v): v is string => v != null && v !== ''))).sort();
  /* janela de período: N dias atrás de hoje (data em ISO compara como texto). */
  const hoje = new Date();
  const limiteIso = periodo === 'tudo' ? null : (() => { const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - Number(periodo)); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();

  const filtrada = daFazenda.filter((h) => {
    if (limiteIso != null && String(h.data ?? '') < limiteIso) return false;
    if (valvulaSel != null && h.valvula !== valvulaSel) return false;
    if (aba === 'colheita') return h.tipo === 'colheita';
    if (aba === 'tratos') return h.tipo === 'tratos_culturais' || String(h.categoria ?? '').startsWith('trato');
    return true;
  });
  const visivel = filtrada.slice(paginaHist * POR_PAGINA, paginaHist * POR_PAGINA + POR_PAGINA);

  return (
    <View style={e.tela}>
      <FaixaSinc />
      <ScrollView contentContainerStyle={[e.conteudo, semNada && e.conteudoVazio]} refreshControl={<RefreshControl refreshing={atualizando} onRefresh={() => void atualizar()} tintColor={cor.acao} />}>
        <CabecalhoPagina etiqueta="Operação agrícola" titulo="Caderno de campo" subtitulo="O que aconteceu no campo e o que ainda precisa subir." acao={<Botao titulo="Novo apontamento" aoTocar={() => router.push('/novo-apontamento')} />} />

        {erro !== null && <Faixa texto={erro} tom="erro" />}

        {semNada ? (
          <Vazio titulo="Nenhum apontamento ainda" detalhe="Você pode começar agora, mesmo sem internet. O registro ficará salvo no aparelho." acao={<Botao titulo="Criar apontamento" aoTocar={() => router.push('/novo-apontamento')} />} />
        ) : (
          <>
            <View style={e.indicadores}>
              <GradeIndicadores>
                <Indicador rotulo="Apontamentos" valor={String(daFazenda.length)} detalhe="registrados no aparelho" />
                <Indicador rotulo="Em campo agora" valor={String(abertosDaFazenda.length)} detalhe={abertosDaFazenda.length === 0 ? 'nenhum em campo' : 'serviço(s) aberto(s)'} tom={abertosDaFazenda.length > 0 ? 'alerta' : 'neutro'} />
                <Indicador rotulo="A enviar" valor={String(locaisDaFazenda.length)} detalhe={locaisDaFazenda.length === 0 ? 'nada na fila' : 'aguardando sincronização'} tom={locaisDaFazenda.some((l) => l.fila.estado === 'falha') ? 'erro' : locaisDaFazenda.length > 0 ? 'alerta' : 'neutro'} />
              </GradeIndicadores>
            </View>

            {emFila && (
              <>
                <Text style={e.secao}>Em campo e a enviar</Text>
                <View style={e.lista}>
                  {locaisDaFazenda.map(({ fila, carga }) => (
                    <Pressable key={fila.clientUuid} accessibilityRole="button" onPress={() => router.push({ pathname: '/apontamento', params: { origem: 'local', chave: fila.clientUuid } })} style={({ pressed }) => [e.cartao, pressed && e.cartaoPressionado]}>
                      <View style={e.linhaTitulo}>
                        <Text style={e.cartaoTitulo}>{rotuloTipo(carga.tipo)}</Text>
                        <Text style={[e.estado, fila.estado === 'falha' ? e.estadoErro : e.estadoPendente]}>{rotuloEstado(fila.estado)}</Text>
                      </View>
                      <Text style={e.detalhe}>{carga.talhao_id == null ? 'Válvula não informada' : talhoes.get(carga.talhao_id) ?? `Válvula ${carga.talhao_id}`}</Text>
                      <Text style={e.data}>{carga.data ?? fila.criadoEm.slice(0, 10)}</Text>
                    </Pressable>
                  ))}
                  {abertosDaFazenda.map((item) => (
                    <Pressable key={`servidor-${item.id}`} accessibilityRole="button" onPress={() => router.push({ pathname: '/apontamento', params: { origem: 'servidor', chave: String(item.id) } })} style={({ pressed }) => [e.cartao, pressed && e.cartaoPressionado]}>
                      <View style={e.linhaTitulo}>
                        <Text style={e.cartaoTitulo}>{rotuloTipo(item.tipo)}</Text>
                        <Text style={[e.estado, e.estadoAberto]}>Aberto</Text>
                      </View>
                      <Text style={e.detalhe}>{item.talhao_nome ?? (item.talhao_id == null ? 'Válvula não informada' : talhoes.get(item.talhao_id) ?? `Válvula ${item.talhao_id}`)}</Text>
                      {item.atividade != null && <Text style={e.detalhe}>{item.atividade}</Text>}
                      <Text style={e.data}>{item.data_apontamento ?? item.iniciado_em?.slice(0, 10) ?? 'Data não informada'}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {historico.length > 0 && (
              <>
                <Text style={e.secao}>Histórico</Text>
                <View style={e.abas}>
                  {ABAS.map((item) => (
                    <Pressable key={item.valor} accessibilityRole="button" accessibilityState={{ selected: aba === item.valor }} onPress={() => setAba(item.valor)} style={[e.aba, aba === item.valor && e.abaAtiva]}>
                      <Text style={[e.abaTexto, aba === item.valor && e.abaTextoAtivo]}>{item.rotulo}</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={e.abas}>
                  {PERIODOS.map((item) => (
                    <Pressable key={item.valor} accessibilityRole="button" accessibilityState={{ selected: periodo === item.valor }} onPress={() => setPeriodo(item.valor)} style={[e.aba, periodo === item.valor && e.abaAtiva]}>
                      <Text style={[e.abaTexto, periodo === item.valor && e.abaTextoAtivo]}>{item.rotulo}</Text>
                    </Pressable>
                  ))}
                </View>
                {valvulas.length > 1 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={e.valvulas}>
                    <Pressable accessibilityRole="button" accessibilityState={{ selected: valvulaSel == null }} onPress={() => setValvulaSel(null)} style={[e.aba, valvulaSel == null && e.abaAtiva]}>
                      <Text style={[e.abaTexto, valvulaSel == null && e.abaTextoAtivo]}>Todas</Text>
                    </Pressable>
                    {valvulas.map((v) => (
                      <Pressable key={v} accessibilityRole="button" accessibilityState={{ selected: valvulaSel === v }} onPress={() => setValvulaSel(v)} style={[e.aba, valvulaSel === v && e.abaAtiva]}>
                        <Text style={[e.abaTexto, valvulaSel === v && e.abaTextoAtivo]}>Válvula {v}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
                {visivel.length === 0 ? (
                  <Text style={e.notaHist}>Nenhum apontamento nesta aba.</Text>
                ) : (
                  <View style={e.lista}>
                    {visivel.map((h) => <CartaoHistorico key={h.id} h={h} />)}
                  </View>
                )}
                <Paginacao pagina={paginaHist} porPagina={POR_PAGINA} total={filtrada.length} aoTrocar={setPaginaHist} />
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

/** Formata "2026-09-24" → "24/09/2026". */
function dataBr(iso: string | null | undefined): string {
  const m = String(iso ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m == null ? '—' : `${m[3]}/${m[2]}/${m[1]}`;
}

function CartaoHistorico({ h }: { h: ApontamentoHistorico }) {
  const validado = String(h.status ?? '').toLowerCase() === 'validado';
  const emCampo = String(h.status ?? '').toLowerCase() === 'iniciado';
  const producao = Number(h.producao);
  const pessoas = Number(h.pessoas);
  const meta = [
    dataBr(h.data),
    Number.isFinite(pessoas) && pessoas > 0 ? `${pessoas} pessoa(s)` : null,
    Number.isFinite(producao) && producao > 0 ? `prod. ${producao.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}` : null,
  ].filter(Boolean).join(' · ');
  return (
    <View style={e.cartao}>
      <View style={e.linhaTitulo}>
        <Text style={e.cartaoTitulo} numberOfLines={1}>{h.valvula != null ? `Válvula ${h.valvula}` : h.talhao_nome ?? 'Válvula'}</Text>
        <Text style={[e.estado, validado ? e.estadoAberto : emCampo ? e.estadoPendente : e.estadoNeutro]}>
          {validado ? 'Validado' : emCampo ? 'Em campo' : (h.status ?? '—')}
        </Text>
      </View>
      <Text style={e.detalhe} numberOfLines={1}>{h.atividade ?? rotuloTipo(h.tipo ?? '')}</Text>
      <Text style={e.data}>{meta}</Text>
    </View>
  );
}

const e = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cor.fundo },
  conteudo: { padding: espaco.md, paddingBottom: espaco.xl },
  conteudoVazio: { flexGrow: 1 },
  indicadores: { marginBottom: espaco.md },
  cabecalho: { gap: espaco.md, marginBottom: espaco.lg },
  cabecalhoTexto: { gap: espaco.xs },
  titulo: { color: cor.textoForte, fontSize: fonte.grande, fontWeight: '800' },
  subtitulo: { color: cor.textoSuave, fontSize: fonte.normal, lineHeight: 24 },
  lista: { gap: espaco.sm },
  cartao: { minHeight: toque.alvo, backgroundColor: cor.superficie, borderColor: cor.borda, borderWidth: 1, borderRadius: raio.lg, padding: espaco.md, ...sombra.cartao },
  cartaoPressionado: { borderColor: cor.acaoApoio, backgroundColor: cor.fundoSuave },
  linhaTitulo: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: espaco.sm },
  cartaoTitulo: { flex: 1, color: cor.texto, fontFamily: familia.titulo, fontSize: fonte.media, fontWeight: '700' },
  detalhe: { color: cor.textoSuave, fontSize: fonte.normal, marginTop: espaco.xs },
  data: { color: cor.textoDesativado, fontSize: fonte.pequena, marginTop: espaco.sm },
  estado: { overflow: 'hidden', borderRadius: raio.sm, paddingHorizontal: espaco.sm, paddingVertical: espaco.xs, fontSize: fonte.pequena, fontWeight: '700' },
  estadoAberto: { color: cor.ok, backgroundColor: cor.okFundo },
  estadoPendente: { color: cor.alerta, backgroundColor: cor.alertaFundo },
  estadoErro: { color: cor.erro, backgroundColor: cor.erroFundo },
  estadoNeutro: { color: cor.textoSuave, backgroundColor: cor.campo },
  secao: { color: cor.textoForte, fontFamily: familia.titulo, fontSize: fonte.media, fontWeight: '800', marginTop: espaco.lg, marginBottom: espaco.sm },
  abas: { flexDirection: 'row', gap: espaco.sm, marginBottom: espaco.sm },
  valvulas: { flexDirection: 'row', gap: espaco.sm, marginBottom: espaco.sm, paddingRight: espaco.md },
  aba: { minHeight: 38, paddingHorizontal: espaco.md, alignItems: 'center', justifyContent: 'center', borderRadius: raio.md, borderWidth: 1, borderColor: cor.borda, backgroundColor: cor.superficie },
  abaAtiva: { backgroundColor: cor.acao, borderColor: cor.acao },
  abaTexto: { color: cor.textoSuave, fontFamily: familia.corpo, fontSize: fonte.pequena, fontWeight: '700' },
  abaTextoAtivo: { color: cor.acaoTexto },
  notaHist: { color: cor.textoDesativado, fontFamily: familia.corpo, fontSize: fonte.pequena, marginTop: espaco.sm },
});
