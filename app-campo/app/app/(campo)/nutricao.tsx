import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import type { AnaliseNutricional, ResultadoAnalise } from '@/api/tipos';
import { lerCache } from '@/db/banco';
import { useFazenda } from '@/fazenda/contexto';
import { Botao, CabecalhoPagina, Campo, Carregando, Vazio } from '@/ui/componentes';
import { FaixaSinc } from '@/ui/FaixaSinc';
import { Paginacao } from '@/ui/Paginacao';
import { SeletorTexto } from '@/ui/Seletor';
import { useSessao } from '@/sessao';
import { cor, espaco, familia, fonte, raio, sombra } from '@/ui/tema';

const POR_PAGINA = 5;
const MODOS = [{ valor: 'solo', rotulo: 'Solo' }, { valor: 'foliar', rotulo: 'Foliar' }];

/** Cor da classificação do laudo (mesma leitura do painel do site). */
function corClasse(c?: string | null): string {
  switch (c) {
    case 'adequado': return cor.ok;
    case 'baixo': case 'muito_baixo': return cor.erro;
    case 'alto': case 'excessivo': return cor.alerta;
    default: return cor.textoDesativado;
  }
}
function rotuloClasse(c?: string | null): string {
  if (c == null || c === '') return '—';
  return c.replace('_', ' ');
}
const valorTexto = (r: ResultadoAnalise) => { const x = Number(r.valor); return Number.isFinite(x) ? x.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : String(r.valor ?? '—'); };

export default function Nutricao() {
  const { pode } = useSessao();
  const { selecionada } = useFazenda();
  const [modo, setModo] = useState('solo');
  const [solo, setSolo] = useState<AnaliseNutricional[] | null>(null);
  const [foliar, setFoliar] = useState<AnaliseNutricional[]>([]);
  const [pagina, setPagina] = useState(0);
  const [safra, setSafra] = useState<string | null>(null);
  const [valvula, setValvula] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const modos = useMemo(() => MODOS.filter((item) => pode(`nutricao.analise_${item.valor}.ver`) || pode(`nutricao.analise_${item.valor}.editar`)), [pode]);

  useFocusEffect(useCallback(() => {
    void (async () => {
      try {
        const [s, f] = await Promise.all([lerCache<AnaliseNutricional>('analise_solo'), lerCache<AnaliseNutricional>('analise_foliar')]);
        setSolo(s); setFoliar(f);
      } catch { setSolo([]); }
    })();
  }, []));

  const lista = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    const base = (modo === 'solo' ? (solo ?? []) : foliar).filter((a) => {
      if (selecionada == null || (a.fazenda ?? '').trim() !== selecionada) return false;
      if (safra != null && a.safra !== safra) return false;
      if (valvula != null && (a.valvula ?? a.talhao ?? '') !== valvula) return false;
      if (termo === '') return true;
      return [a.valvula, a.talhao, a.safra, a.contexto, ...(a.resultados ?? []).flatMap((r) => [r.nome, r.simbolo, r.classificacao])]
        .some((v) => String(v ?? '').toLocaleLowerCase('pt-BR').includes(termo));
    });
    return [...base].sort((a, b) => String(b.data_amostra ?? '').localeCompare(String(a.data_amostra ?? '')));
  }, [modo, solo, foliar, selecionada, safra, valvula, busca]);

  const baseModo = modo === 'solo' ? (solo ?? []) : foliar;
  const safras = [...new Set(baseModo.map((a) => a.safra).filter((v): v is string => Boolean(v)))].sort().reverse();
  const valvulas = [...new Set(baseModo.map((a) => a.valvula ?? a.talhao).filter((v): v is string => Boolean(v)))].sort();

  useEffect(() => { setPagina(0); setSafra(null); setValvula(null); }, [modo, selecionada]);
  useEffect(() => { setPagina(0); }, [safra, valvula, busca]);
  useEffect(() => {
    const primeiro = modos[0]?.valor;
    if (primeiro && !modos.some((item) => item.valor === modo)) setModo(primeiro);
  }, [modo, modos]);
  const listaPagina = lista.slice(pagina * POR_PAGINA, pagina * POR_PAGINA + POR_PAGINA);

  if (solo === null) return <View style={e.tela}><Carregando /></View>;
  if (modos.length === 0) return <View style={e.tela}><Vazio titulo="Sem permissão" detalhe="Seu perfil não pode consultar análises nutricionais." /></View>;

  return (
    <View style={e.tela}>
      <FaixaSinc />
      <FlatList
        data={listaPagina}
        keyExtractor={(item) => `${modo}-${item.id}`}
        contentContainerStyle={e.conteudo}
        ListHeaderComponent={
          <View>
            <CabecalhoPagina etiqueta="Nutrição" titulo="Análises" subtitulo="Laudos de solo e foliar com o resultado por nutriente e a classificação do RT." />
            {modos.length > 1 && <SeletorTexto rotulo="Tipo de análise" opcoes={modos} valor={modo} aoMudar={setModo} />}
            {pode(`nutricao.analise_${modo}.editar`) && <View style={e.nova}><Botao titulo={`Nova análise ${modo === 'solo' ? 'de solo' : 'foliar'}`} aoTocar={() => router.push({ pathname: '/novo-analise-nutricao', params: { tipo: modo } })} /></View>}
            <Campo rotulo="Buscar válvula ou nutriente" value={busca} onChangeText={setBusca} placeholder="Ex.: 03, nitrogênio, baixo" />
            {safras.length > 0 && <View style={e.filtros}>
              <Filtro rotulo="Todas as safras" ativo={safra === null} aoTocar={() => setSafra(null)} />
              {safras.map((item) => <Filtro key={item} rotulo={item} ativo={safra === item} aoTocar={() => setSafra(item)} />)}
            </View>}
            {valvulas.length > 1 && <View style={e.filtros}>
              <Filtro rotulo="Todas as válvulas" ativo={valvula === null} aoTocar={() => setValvula(null)} />
              {valvulas.map((item) => <Filtro key={item} rotulo={item} ativo={valvula === item} aoTocar={() => setValvula(item)} />)}
            </View>}
          </View>
        }
        renderItem={({ item }) => (
          <View style={e.cartao}>
            <View style={e.topo}>
              <View style={e.textoFlex}>
                <Text style={e.titulo}>{item.valvula ?? item.talhao ?? `Análise ${item.id}`}</Text>
                <Text style={e.meta}>{[item.fazenda, item.data_amostra, item.safra ? `safra ${item.safra}` : null, item.contexto].filter(Boolean).join(' · ')}</Text>
              </View>
              {item.status != null && <Text style={[e.status, item.status === 'validado' ? e.statusOk : e.statusRascunho]}>{item.status}</Text>}
            </View>
            <View style={e.resultados}>
              {(item.resultados ?? []).length === 0 ? <Text style={e.vazioMini}>Sem resultados neste laudo.</Text> : (item.resultados ?? []).map((r, i) => (
                <View key={i} style={e.resLinha}>
                  <Text style={e.resNome} numberOfLines={1}>{r.simbolo ? `${r.simbolo} · ` : ''}{r.nome ?? ''}</Text>
                  <Text style={e.resValor}>{valorTexto(r)}{r.unidade ? ` ${r.unidade}` : ''}</Text>
                  <Text style={[e.resClasse, { color: corClasse(r.classificacao) }]} numberOfLines={1}>{rotuloClasse(r.classificacao)}</Text>
                </View>
              ))}
            </View>
            {item.observacao != null && item.observacao !== '' && <Text style={e.obs}>{item.observacao}</Text>}
          </View>
        )}
        ListFooterComponent={<Paginacao pagina={pagina} porPagina={POR_PAGINA} total={lista.length} aoTrocar={setPagina} />}
        ListEmptyComponent={<Vazio titulo="Sem análises" detalhe="Sincronize para trazer os laudos de solo e foliar." />}
      />
    </View>
  );
}

function Filtro({ rotulo, ativo, aoTocar }: { rotulo: string; ativo: boolean; aoTocar: () => void }) {
  return <Text accessibilityRole="button" onPress={aoTocar} style={[e.filtro, ativo && e.filtroAtivo]}>{rotulo}</Text>;
}

const e = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cor.fundo },
  nova: { marginTop: espaco.sm },
  conteudo: { padding: espaco.md, paddingBottom: espaco.xl },
  cartao: { backgroundColor: cor.superficie, borderWidth: 1, borderColor: cor.borda, borderRadius: raio.lg, padding: espaco.md, marginBottom: espaco.sm, ...sombra.cartao },
  topo: { flexDirection: 'row', alignItems: 'flex-start', gap: espaco.sm },
  textoFlex: { flex: 1 },
  titulo: { color: cor.textoForte, fontFamily: familia.titulo, fontSize: fonte.normal, fontWeight: '800' },
  meta: { color: cor.textoSuave, fontSize: fonte.pequena, marginTop: espaco.xs },
  status: { overflow: 'hidden', borderRadius: raio.sm, paddingHorizontal: espaco.sm, paddingVertical: 2, fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },
  statusOk: { color: cor.ok, backgroundColor: cor.okFundo }, statusRascunho: { color: cor.textoSuave, backgroundColor: cor.campo },
  resultados: { marginTop: espaco.md, gap: espaco.xs },
  resLinha: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm, paddingVertical: 4, borderTopWidth: 1, borderTopColor: cor.borda },
  resNome: { flex: 1, color: cor.texto, fontSize: fonte.pequena },
  resValor: { color: cor.textoForte, fontFamily: familia.numero, fontSize: fonte.pequena, fontWeight: '700' },
  resClasse: { width: 84, textAlign: 'right', fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  vazioMini: { color: cor.textoSuave, fontSize: fonte.pequena },
  obs: { color: cor.textoSuave, fontSize: fonte.pequena, marginTop: espaco.sm, fontStyle: 'italic' },
  filtros: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.xs, marginBottom: espaco.sm },
  filtro: { overflow: 'hidden', borderRadius: raio.md, borderWidth: 1, borderColor: cor.borda, backgroundColor: cor.superficie, color: cor.texto, fontSize: fonte.pequena, paddingHorizontal: espaco.sm, paddingVertical: espaco.xs },
  filtroAtivo: { color: cor.acaoTexto, backgroundColor: cor.acao, borderColor: cor.acao, fontWeight: '700' },
});
