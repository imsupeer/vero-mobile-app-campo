import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import type { Produtividade } from '@/api/tipos';
import { lerCache } from '@/db/banco';
import { useFazenda } from '@/fazenda/contexto';
import { consolidarPorValvula } from '@/produtividade/modelo';
import { CabecalhoPagina, Campo, Carregando, Vazio } from '@/ui/componentes';
import { FaixaSinc } from '@/ui/FaixaSinc';
import { GradeIndicadores, Indicador } from '@/ui/Indicador';
import { Paginacao } from '@/ui/Paginacao';
import { SeletorTexto } from '@/ui/Seletor';
import { cor, espaco, familia, fonte, raio, sombra } from '@/ui/tema';

const POR_PAGINA = 5;
const n0 = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '—'; };
const n1 = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '—'; };

export default function ProdutividadeTela() {
  const { selecionada } = useFazenda();
  const [dados, setDados] = useState<Produtividade[] | null>(null);
  const [pagina, setPagina] = useState(0);
  const [busca, setBusca] = useState('');
  const [safraFiltro, setSafraFiltro] = useState('__mais_recente__');
  const [culturaFiltro, setCulturaFiltro] = useState('todas');

  useFocusEffect(useCallback(() => {
    void (async () => { try { setDados(await lerCache<Produtividade>('produtividade')); } catch { setDados([]); } })();
  }, []));

  const opcoesSafra = useMemo(() => {
    const unicas = new Map<string, string>();
    for (const item of dados ?? []) {
      if (item.safra_id == null || item.safra == null || String(item.safra).trim() === '') continue;
      unicas.set(String(item.safra_id), String(item.safra));
    }
    return [...unicas.entries()]
      .sort((a, b) => b[1].localeCompare(a[1], 'pt-BR', { numeric: true }))
      .map(([valor, rotulo]) => ({ valor, rotulo }));
  }, [dados]);
  const opcoesCultura = useMemo(() => {
    const unicas = new Map<string, string>();
    for (const item of dados ?? []) {
      if (item.cultura == null || item.cultura.trim() === '') continue;
      unicas.set(item.cultura_id == null ? `nome:${item.cultura}` : String(item.cultura_id), item.cultura);
    }
    return [...unicas.entries()].sort((a, b) => a[1].localeCompare(b[1], 'pt-BR')).map(([valor, rotulo]) => ({ valor, rotulo }));
  }, [dados]);
  const safraMaisRecente = opcoesSafra[0]?.valor;
  const safraSelecionada = safraFiltro === '__mais_recente__' ? safraMaisRecente : safraFiltro;
  const opcoesSafraTela = [{ valor: 'todas', rotulo: 'Todas as safras' }, ...opcoesSafra];
  const opcoesCulturaTela = [{ valor: 'todas', rotulo: 'Todas as culturas' }, ...opcoesCultura];

  const lista = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    const base = (dados ?? []).filter((d) => {
      if (selecionada == null || (d.fazenda ?? '').trim() !== selecionada) return false;
      if (safraSelecionada != null && safraSelecionada !== 'todas' && String(d.safra_id ?? '') !== safraSelecionada) return false;
      const culturaId = d.cultura_id == null ? `nome:${d.cultura ?? ''}` : String(d.cultura_id);
      if (culturaFiltro !== 'todas' && culturaId !== culturaFiltro) return false;
      return termo === '' || [d.valvula, d.variedade, d.cultura].some((v) => String(v ?? '').toLocaleLowerCase('pt-BR').includes(termo));
    });
    return consolidarPorValvula(base);
  }, [dados, selecionada, busca, safraSelecionada, culturaFiltro]);

  useEffect(() => { setPagina(0); }, [selecionada, busca, safraFiltro, culturaFiltro]);
  const listaPagina = lista.slice(pagina * POR_PAGINA, pagina * POR_PAGINA + POR_PAGINA);

  const totalKg = lista.reduce((s, d) => s + (Number(d.kg_realizado) || 0), 0);
  const totalArea = lista.reduce((s, d) => s + (Number(d.area_ha) || 0), 0);
  const mediaKgHa = totalArea > 0 ? totalKg / totalArea : 0;

  if (dados === null) return <View style={e.tela}><Carregando /></View>;

  return (
    <View style={e.tela}>
      <FaixaSinc />
      <FlatList
        data={listaPagina}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={e.conteudo}
        ListHeaderComponent={
          <View>
            <CabecalhoPagina etiqueta="Colheita" titulo="Produtividade" subtitulo="kg/ha realizado por válvula, com o atingimento da meta. Sem dinheiro, como no ERP." />
            <SeletorTexto rotulo="Safra" opcoes={opcoesSafraTela} valor={safraSelecionada ?? 'todas'} aoMudar={setSafraFiltro} />
            <SeletorTexto rotulo="Cultura" opcoes={opcoesCulturaTela} valor={culturaFiltro} aoMudar={setCulturaFiltro} />
            <Campo rotulo="Buscar válvula, cultura ou variedade" value={busca} onChangeText={setBusca} placeholder="Filtrar resultados" />
            <View style={e.indic}>
              <GradeIndicadores>
                <Indicador rotulo="Colhido" valor={`${n0(totalKg)}`} detalhe="kg no total" />
                <Indicador rotulo="Área" valor={n1(totalArea)} detalhe="ha somados" />
                <Indicador rotulo="Média" valor={n0(mediaKgHa)} detalhe="kg/ha" />
              </GradeIndicadores>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const kgHa = Number(item.kg_ha) || 0;
          const meta = Number(item.produtividade_planejada) || 0;
          const pct = meta > 0 ? Math.round((kgHa / meta) * 100) : null;
          const tinta = pct == null ? cor.textoSuave : pct >= 100 ? cor.ok : pct >= 70 ? cor.alerta : cor.erro;
          return (
            <View style={e.cartao}>
              <View style={e.topo}>
                <View style={e.textoFlex}>
                  <Text style={e.valvula}>{item.valvula ?? `Válvula ${item.id}`}</Text>
                  <Text style={e.meta}>{[item.variedade ?? item.cultura, item.fazenda].filter(Boolean).join(' · ')}</Text>
                </View>
                <View style={e.kgHaBloco}>
                  <Text style={e.kgHa}>{n0(kgHa)}</Text>
                  <Text style={e.kgHaUn}>kg/ha</Text>
                </View>
              </View>
              {pct != null && (
                <>
                  <View style={e.trilho}><View style={[e.fill, { width: `${Math.max(4, Math.min(100, pct))}%`, backgroundColor: tinta }]} /></View>
                  <Text style={[e.atingimento, { color: tinta }]}>{pct}% da meta ({n0(meta)} kg/ha)</Text>
                </>
              )}
              <Text style={e.rodape}>{[`${n0(item.kg_realizado)} kg`, `${n1(item.area_ha)} ha`, `${n0(item.colheitas)} colheita(s)`, item.ultima_colheita ? `última ${item.ultima_colheita}` : null].filter(Boolean).join(' · ')}</Text>
            </View>
          );
        }}
        ListFooterComponent={<Paginacao pagina={pagina} porPagina={POR_PAGINA} total={lista.length} aoTrocar={setPagina} />}
        ListEmptyComponent={<Vazio titulo="Sem produtividade" detalhe="Sincronize para trazer a colheita realizada por válvula." />}
      />
    </View>
  );
}

const e = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cor.fundo },
  conteudo: { padding: espaco.md, paddingBottom: espaco.xl },
  indic: { marginTop: espaco.sm, marginBottom: espaco.sm },
  cartao: { backgroundColor: cor.superficie, borderWidth: 1, borderColor: cor.borda, borderRadius: raio.lg, padding: espaco.md, marginBottom: espaco.sm, ...sombra.cartao },
  topo: { flexDirection: 'row', alignItems: 'flex-start', gap: espaco.sm },
  textoFlex: { flex: 1 },
  valvula: { color: cor.textoForte, fontFamily: familia.titulo, fontSize: fonte.media, fontWeight: '800' },
  meta: { color: cor.textoSuave, fontSize: fonte.pequena, marginTop: espaco.xs },
  kgHaBloco: { alignItems: 'flex-end' },
  kgHa: { color: cor.textoForte, fontFamily: familia.numero, fontSize: fonte.grande, fontWeight: '800' },
  kgHaUn: { color: cor.textoSuave, fontSize: fonte.pequena },
  trilho: { height: 8, backgroundColor: cor.campo, borderRadius: raio.sm, overflow: 'hidden', marginTop: espaco.md },
  fill: { height: 8, borderRadius: raio.sm },
  atingimento: { fontFamily: familia.numero, fontSize: 12, fontWeight: '700', marginTop: espaco.xs },
  rodape: { color: cor.textoSuave, fontSize: fonte.pequena, marginTop: espaco.sm },
});
