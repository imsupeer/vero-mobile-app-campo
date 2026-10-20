import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { situacaoEstoque } from '@/estoque/regras';
import type { EstoqueMovimentacao, ItemSincronizado } from '@/api/tipos';
import { lerCache } from '@/db/banco';
import { useSessao } from '@/sessao';
import { CabecalhoPagina, Carregando, Vazio } from '@/ui/componentes';
import { FaixaSinc } from '@/ui/FaixaSinc';
import { GradeIndicadores, Indicador } from '@/ui/Indicador';
import { Paginacao } from '@/ui/Paginacao';
import { cor, espaco, familia, fonte, raio, sombra, toque } from '@/ui/tema';

type Produto = ItemSincronizado & {
  id: number;
  codigo?: string | null;
  nome?: string | null;
  unidade?: string | null;
  estoque_minimo?: number | string | null;
  saldo?: number | string | null;
  grupo?: string | null;
  grupo_id?: number | null;
  classe_toxicologica?: string | null;
  carencia_dias?: number | string | null;
};

const POR_PAGINA = 5;

const numero = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : '—';
};

export default function Estoque() {
  const { pode } = useSessao();
  const podeProdutos = pode('estoque.ver') || pode('estoque.produtos_insumos.ver');
  const podeMovimentos = pode('estoque.ver') || pode('estoque.historico_movimentacoes.ver');
  const [produtos, setProdutos] = useState<Produto[] | null>(null);
  const [movimentos, setMovimentos] = useState<EstoqueMovimentacao[]>([]);
  const [aba, setAba] = useState<'criticos' | 'todos'>('criticos');
  const [grupo, setGrupo] = useState<string | null>(null);
  const [pagina, setPagina] = useState(0);

  useFocusEffect(useCallback(() => {
    void (async () => {
      try {
        const [lista, extrato] = await Promise.all([
          lerCache<Produto>('estoque'),
          lerCache<EstoqueMovimentacao>('estoque_movimentacoes').catch(() => []),
        ]);
        setProdutos(lista);
        setMovimentos(extrato);
      } catch { setProdutos([]); setMovimentos([]); }
    })();
  }, []));

  const grupos = useMemo(() => {
    const nomes = new Set<string>();
    (produtos ?? []).forEach((p) => { if (p.grupo != null && p.grupo !== '') nomes.add(p.grupo); });
    return [...nomes].sort((a, b) => a.localeCompare(b));
  }, [produtos]);

  const criticos = useMemo(() => (produtos ?? []).filter((p) => situacaoEstoque(p.saldo, p.estoque_minimo) !== 'ok'), [produtos]);
  const abaixoMinimo = useMemo(() => (produtos ?? []).filter((p) => situacaoEstoque(p.saldo, p.estoque_minimo) === 'abaixo'), [produtos]);
  const zerados = useMemo(() => (produtos ?? []).filter((p) => situacaoEstoque(p.saldo, p.estoque_minimo) === 'zerado'), [produtos]);

  const lista = useMemo(() => {
    const base = aba === 'criticos' ? criticos : (produtos ?? []);
    const porGrupo = grupo == null ? base : base.filter((p) => (p.grupo ?? '') === grupo);
    const peso = (p: Produto) => (situacaoEstoque(p.saldo, p.estoque_minimo) === 'zerado' ? 0 : situacaoEstoque(p.saldo, p.estoque_minimo) === 'abaixo' ? 1 : 2);
    return [...porGrupo].sort((a, b) => peso(a) - peso(b) || (a.nome ?? '').localeCompare(b.nome ?? ''));
  }, [aba, criticos, produtos, grupo]);

  useEffect(() => { setPagina(0); }, [aba, grupo]);
  const listaPagina = lista.slice(pagina * POR_PAGINA, pagina * POR_PAGINA + POR_PAGINA);

  if (!podeProdutos && !podeMovimentos) return <View style={e.tela}><Vazio titulo="Sem permissão" detalhe="Seu perfil não pode consultar o estoque." /></View>;
  if (produtos === null) return <View style={e.tela}><Carregando /></View>;

  return (
    <View style={e.tela}>
      <FaixaSinc />
      <FlatList
        data={podeProdutos ? listaPagina : []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={e.conteudo}
        ListHeaderComponent={
          <View>
            <CabecalhoPagina etiqueta="Insumos" titulo="Estoque" subtitulo="Saldo e ponto de reposição — sem custos, como no ERP." />
            {podeProdutos && <View style={e.indicadores}>
              <GradeIndicadores>
                <Indicador rotulo="Produtos" valor={String((produtos ?? []).length)} detalhe="ativos no aparelho" />
                <Indicador rotulo="Abaixo do mínimo" valor={String(abaixoMinimo.length)} detalhe="precisam de reposição" tom={abaixoMinimo.length > 0 ? 'alerta' : 'neutro'} />
                <Indicador rotulo="Zerados" valor={String(zerados.length)} detalhe="sem saldo" tom={zerados.length > 0 ? 'erro' : 'neutro'} />
              </GradeIndicadores>
            </View>}
            {podeProdutos && <>
            <View style={e.abas}>
              {(['criticos', 'todos'] as const).map((op) => (
                <Pressable key={op} onPress={() => setAba(op)} style={[e.aba, aba === op && e.abaAtiva]}>
                  <Text style={[e.abaTexto, aba === op && e.abaTextoAtivo]}>{op === 'criticos' ? `Repor (${criticos.length})` : 'Todos'}</Text>
                </Pressable>
              ))}
            </View>
            {grupos.length > 0 && (
              <View style={e.grupos}>
                <Pressable onPress={() => setGrupo(null)} style={[e.chip, grupo === null && e.chipAtivo]}><Text style={[e.chipTexto, grupo === null && e.chipTextoAtivo]}>Todos os grupos</Text></Pressable>
                {grupos.map((g) => (
                  <Pressable key={g} onPress={() => setGrupo(g)} style={[e.chip, grupo === g && e.chipAtivo]}><Text style={[e.chipTexto, grupo === g && e.chipTextoAtivo]}>{g}</Text></Pressable>
                ))}
              </View>
            )}
            </>}
          </View>
        }
        renderItem={({ item }) => {
          const s = situacaoEstoque(item.saldo, item.estoque_minimo);
          return (
            <View style={e.cartao}>
              <View style={e.textoFlex}>
                <Text style={e.nome} numberOfLines={2}>{item.nome ?? item.codigo ?? `Produto ${item.id}`}</Text>
                <Text style={e.meta}>{[item.grupo, item.classe_toxicologica ? `classe ${item.classe_toxicologica}` : null, item.carencia_dias != null ? `carência ${String(item.carencia_dias)}d` : null].filter(Boolean).join(' · ') || 'Sem grupo'}</Text>
                <Text style={e.minimo}>Mínimo: {numero(item.estoque_minimo)} {item.unidade ?? ''}</Text>
              </View>
              <View style={e.saldoBloco}>
                <Text style={[e.saldo, s === 'zerado' && { color: cor.erro }, s === 'abaixo' && { color: cor.alerta }]}>{numero(item.saldo)}</Text>
                <Text style={e.unidade}>{item.unidade ?? ''}</Text>
                {s !== 'ok' && <Text style={[e.selo, s === 'zerado' ? e.seloErro : e.seloAlerta]}>{s === 'zerado' ? 'Zerado' : 'Repor'}</Text>}
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          <>
            {podeProdutos && <Paginacao pagina={pagina} porPagina={POR_PAGINA} total={lista.length} aoTrocar={setPagina} />}
            {podeMovimentos && <>
            <Text style={e.tituloExtrato}>Movimentações recentes</Text>
            {movimentos
              .slice()
              .sort((a, b) => String(b.data_movimento ?? b.updated_at ?? '').localeCompare(String(a.data_movimento ?? a.updated_at ?? '')))
              .slice(0, 10)
              .map((m) => (
                <View key={m.id} style={e.movimento}>
                  <View style={e.textoFlex}>
                    <Text style={e.nome}>{m.produto ?? `Produto ${m.produto_id ?? ''}`}</Text>
                    <Text style={e.meta}>{[m.data_movimento?.slice(0, 10), m.tipo, m.origem_tipo?.replace(/_/g, ' '), m.observacao].filter(Boolean).join(' · ')}</Text>
                  </View>
                  <Text style={e.qtdMov}>{numero(m.quantidade)} {m.unidade ?? ''}</Text>
                </View>
            ))}
            {movimentos.length === 0 && <Text style={e.meta}>Sincronize para consultar o extrato de estoque.</Text>}
            </>}
          </>
        }
        ListEmptyComponent={podeProdutos ? (
          aba === 'criticos'
            ? <Vazio titulo="Estoque em dia" detalhe="Nenhum produto abaixo do mínimo neste filtro." />
            : <Vazio titulo="Sem produtos" detalhe="Sincronize para trazer a posição de estoque." acao={undefined} />
        ) : null}
      />
    </View>
  );
}

const e = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cor.fundo },
  conteudo: { padding: espaco.md, paddingBottom: espaco.xl },
  indicadores: { marginTop: espaco.sm, marginBottom: espaco.sm },
  abas: { flexDirection: 'row', gap: espaco.sm, marginTop: espaco.sm, marginBottom: espaco.sm },
  aba: { flex: 1, minHeight: toque.alvoPequeno, alignItems: 'center', justifyContent: 'center', borderRadius: raio.md, borderWidth: 1, borderColor: cor.borda, backgroundColor: cor.superficie },
  abaAtiva: { backgroundColor: cor.acao, borderColor: cor.acao },
  abaTexto: { color: cor.texto, fontSize: fonte.pequena, fontWeight: '700' }, abaTextoAtivo: { color: cor.acaoTexto },
  grupos: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm, marginBottom: espaco.sm },
  chip: { minHeight: toque.alvoPequeno, justifyContent: 'center', borderWidth: 1, borderColor: cor.borda, borderRadius: raio.md, paddingHorizontal: espaco.md, backgroundColor: cor.superficie },
  chipAtivo: { backgroundColor: cor.acaoApoio, borderColor: cor.acaoApoio },
  chipTexto: { color: cor.texto, fontSize: fonte.pequena }, chipTextoAtivo: { color: cor.acaoTexto, fontWeight: '700' },
  cartao: { flexDirection: 'row', alignItems: 'center', gap: espaco.md, backgroundColor: cor.superficie, borderWidth: 1, borderColor: cor.borda, borderRadius: raio.lg, padding: espaco.md, marginBottom: espaco.sm, ...sombra.cartao },
  tituloExtrato: { color: cor.textoForte, fontFamily: familia.titulo, fontSize: fonte.media, fontWeight: '800', marginTop: espaco.lg, marginBottom: espaco.sm },
  movimento: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm, backgroundColor: cor.superficie, borderWidth: 1, borderColor: cor.borda, borderRadius: raio.md, padding: espaco.md, marginBottom: espaco.xs },
  textoFlex: { flex: 1 },
  qtdMov: { color: cor.textoForte, fontFamily: familia.numero, fontWeight: '700', fontSize: fonte.pequena },
  nome: { color: cor.textoForte, fontFamily: familia.titulo, fontSize: fonte.normal, fontWeight: '800' },
  meta: { color: cor.textoSuave, fontSize: fonte.pequena, marginTop: espaco.xs },
  minimo: { color: cor.textoDesativado, fontFamily: familia.numero, fontSize: 12, marginTop: espaco.xs },
  saldoBloco: { alignItems: 'flex-end', minWidth: 84 },
  saldo: { color: cor.textoForte, fontFamily: familia.numero, fontSize: fonte.grande, fontWeight: '800' },
  unidade: { color: cor.textoSuave, fontSize: fonte.pequena },
  selo: { overflow: 'hidden', marginTop: espaco.xs, borderRadius: raio.sm, paddingHorizontal: espaco.sm, paddingVertical: 2, fontSize: 11, fontWeight: '800' },
  seloAlerta: { color: cor.alerta, backgroundColor: cor.alertaFundo }, seloErro: { color: cor.erro, backgroundColor: cor.erroFundo },
});
