import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import type { IrrigacaoConsumo, IrrigacaoPlanejado } from '@/api/tipos';
import { lerCache } from '@/db/banco';
import { useFazenda } from '@/fazenda/contexto';
import { useSessao } from '@/sessao';
import { CabecalhoPagina, Carregando, Vazio } from '@/ui/componentes';
import { FaixaSinc } from '@/ui/FaixaSinc';
import { GradeIndicadores, Indicador } from '@/ui/Indicador';
import { Paginacao } from '@/ui/Paginacao';
import { SeletorTexto } from '@/ui/Seletor';
import { cor, espaco, familia, fonte, raio, sombra } from '@/ui/tema';

const POR_PAGINA = 5;
const MODOS = [{ valor: 'plano', rotulo: 'Planejado × realizado' }, { valor: 'consumo', rotulo: 'Consumo' }];
const PERIODOS = [{ valor: 'todos', rotulo: 'Todo o período' }, { valor: '30', rotulo: '30 dias' }, { valor: '60', rotulo: '60 dias' }, { valor: '90', rotulo: '90 dias' }, { valor: '180', rotulo: '180 dias' }, { valor: '365', rotulo: '12 meses' }];
const n0 = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '—'; };
const n1 = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '—'; };
const n2 = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'; };

export default function IrrigacaoConsulta() {
  const { selecionada } = useFazenda();
  const { pode } = useSessao();
  const podePlanejado = pode('irrigacao.ver') || pode('irrigacao.planejado_realizado.ver') || pode('irrigacao.planejamento_irrigacao.ver');
  const podeAgua = pode('irrigacao.ver') || pode('irrigacao.consumo_agua.ver');
  const podeEnergia = pode('irrigacao.ver') || pode('irrigacao.consumo_energia.ver');
  const podeCusto = podeAgua || podeEnergia || pode('irrigacao.custo_irrigacao.ver');
  const modos = useMemo(() => MODOS.filter((m) => m.valor === 'plano' ? podePlanejado : podeAgua || podeEnergia || podeCusto), [podePlanejado, podeAgua, podeEnergia, podeCusto]);
  const [modo, setModo] = useState('plano');
  const [planos, setPlanos] = useState<IrrigacaoPlanejado[] | null>(null);
  const [consumos, setConsumos] = useState<IrrigacaoConsumo[]>([]);
  const [pagina, setPagina] = useState(0);
  const [periodo, setPeriodo] = useState('todos');

  useEffect(() => {
    const primeiroModo = modos[0]?.valor;
    if (primeiroModo && !modos.some((m) => m.valor === modo)) setModo(primeiroModo);
  }, [modo, modos]);

  useFocusEffect(useCallback(() => {
    void (async () => {
      try {
        const [pl, co] = await Promise.all([lerCache<IrrigacaoPlanejado>('irrigacao_planejado'), lerCache<IrrigacaoConsumo>('irrigacao_consumo')]);
        setPlanos(pl); setConsumos(co);
      } catch { setPlanos([]); }
    })();
  }, []));

  const planosF = useMemo(() => {
    const limite = new Date();
    if (periodo !== 'todos') limite.setDate(limite.getDate() - Number(periodo));
    const isoLimite = `${limite.getFullYear()}-${String(limite.getMonth() + 1).padStart(2, '0')}-${String(limite.getDate()).padStart(2, '0')}`;
    return (planos ?? []).filter((p) => {
      if (selecionada == null || (p.fazenda ?? '').trim() !== selecionada) return false;
      if (periodo === 'todos') return true;
      const data = String(p.data_fim ?? p.data_inicio ?? '').slice(0, 10);
      return data === '' || data >= isoLimite;
    });
  }, [planos, selecionada, periodo]);
  const consumosF = useMemo(() => consumos.filter((c) => selecionada == null || (c.fazenda ?? '').trim() === selecionada), [consumos, selecionada]);

  useEffect(() => { setPagina(0); }, [modo, selecionada, periodo]);
  const dados = modo === 'plano' ? planosF : consumosF;
  const dadosPagina = dados.slice(pagina * POR_PAGINA, pagina * POR_PAGINA + POR_PAGINA);

  const aguaTotal = consumosF.reduce((s, c) => s + (Number(c.agua_m3) || 0), 0);
  const energiaTotal = consumosF.reduce((s, c) => s + (Number(c.energia_kwh) || 0), 0);
  const horasTotal = consumosF.reduce((s, c) => s + (Number(c.horas) || 0), 0);
  const custoTotal = consumosF.reduce((s, c) => s + (Number(c.custo_total) || 0), 0);

  if (planos === null) return <View style={e.tela}><Carregando /></View>;
  if (modos.length === 0) return <View style={e.tela}><Vazio titulo="Sem permissão" detalhe="Seu perfil não pode consultar dados de irrigação." /></View>;

  return (
    <View style={e.tela}>
      <FaixaSinc />
      <FlatList
        data={dadosPagina as Array<IrrigacaoPlanejado | IrrigacaoConsumo>}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={e.conteudo}
        ListHeaderComponent={
          <View>
            <CabecalhoPagina etiqueta="Irrigação" titulo="Consumo e metas" subtitulo="Lâmina planejada × aplicada e consumo de água, energia e custos." />
            {modos.length > 1 && <SeletorTexto rotulo="Consulta" opcoes={modos} valor={modo} aoMudar={setModo} />}
            {modo === 'plano' && <SeletorTexto rotulo="Período do planejamento" opcoes={PERIODOS} valor={periodo} aoMudar={setPeriodo} />}
            {modo === 'consumo' && (
              <View style={e.indic}>
                <GradeIndicadores>
                  {podeAgua && <Indicador rotulo="Água" valor={n0(aguaTotal)} detalhe="m³ no total" />}
                  {podeEnergia && <Indicador rotulo="Energia" valor={n0(energiaTotal)} detalhe="kWh no total" />}
                  <Indicador rotulo="Horas" valor={n0(horasTotal)} detalhe="de bomba" />
                  {podeCusto && <Indicador rotulo="Custo" valor={`R$ ${n2(custoTotal)}`} detalhe="consumos registrados" />}
                </GradeIndicadores>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => modo === 'plano' ? <CartaoPlano p={item as IrrigacaoPlanejado} /> : <CartaoConsumo c={item as IrrigacaoConsumo} podeAgua={podeAgua} podeEnergia={podeEnergia} podeCusto={podeCusto} />}
        ListFooterComponent={<Paginacao pagina={pagina} porPagina={POR_PAGINA} total={dados.length} aoTrocar={setPagina} />}
        ListEmptyComponent={<Vazio titulo="Sem dados de irrigação" detalhe="Sincronize para trazer os planejamentos e consumos." />}
      />
    </View>
  );
}

function CartaoPlano({ p }: { p: IrrigacaoPlanejado }) {
  const alvo = Number(p.lamina_alvo) || 0;
  const apont = Number(p.lamina_apontada) || 0;
  const pct = alvo > 0 ? Math.round((apont / alvo) * 100) : null;
  const area = Number(p.area_ha) || 0;
  const aguaM3 = Number(p.agua_m3) || 0;
  const laminaConsumo = area > 0 ? aguaM3 / (area * 10) : null;
  const divergente = laminaConsumo != null && apont > 0 && Math.abs(laminaConsumo - apont) > 0.05;
  const tinta = pct == null ? cor.textoSuave : pct >= 100 ? cor.ok : pct >= 70 ? cor.alerta : cor.erro;
  return (
    <View style={e.cartao}>
      <View style={e.topo}>
        <View style={e.textoFlex}>
          <Text style={e.titulo}>{p.talhao ?? `Válvula ${p.talhao_id ?? p.id}`}{p.pivo ? ` · ${p.pivo}` : ''}</Text>
          <Text style={e.meta}>{[p.fazenda, `${p.data_inicio ?? ''}${p.data_fim ? ` → ${p.data_fim}` : ' → aberto'}`].filter(Boolean).join(' · ')}</Text>
        </View>
        <View style={e.dirBloco}><Text style={e.num}>{n1(apont)}</Text><Text style={e.numUn}>mm</Text></View>
      </View>
      {pct != null && (
        <>
          <View style={e.trilho}><View style={[e.fill, { width: `${Math.max(4, Math.min(100, pct))}%`, backgroundColor: tinta }]} /></View>
          <Text style={[e.atingimento, { color: tinta }]}>{pct}% da lâmina-alvo ({n1(alvo)} mm)</Text>
        </>
      )}
      <Text style={e.rodape}>{[`${n0(aguaM3)} m³`, `${n1(p.horas)} h`, p.area_ha != null ? `${n1(p.area_ha)} ha` : null, p.eventos != null ? `${n0(p.eventos)} eventos` : null].filter(Boolean).join(' · ')}</Text>
      {laminaConsumo != null && <Text style={[e.rodape, divergente && e.alerta]}>{`Lâmina pelo consumo: ${n1(laminaConsumo)} mm${divergente ? ` · diverge ${n1(Math.abs(laminaConsumo - apont))} mm do apontado` : ''}`}</Text>}
    </View>
  );
}

function CartaoConsumo({ c, podeAgua, podeEnergia, podeCusto }: { c: IrrigacaoConsumo; podeAgua: boolean; podeEnergia: boolean; podeCusto: boolean }) {
  const area = Number(c.area_ha) || 0;
  const m3ha = area > 0 ? (Number(c.agua_m3) || 0) / area : null;
  return (
    <View style={e.cartao}>
      <View style={e.topo}>
        <View style={e.textoFlex}>
          <Text style={e.titulo}>{c.talhao ?? `Válvula ${c.id}`}</Text>
          <Text style={e.meta}>{[c.fazenda, area > 0 ? `${n1(area)} ha` : null].filter(Boolean).join(' · ')}</Text>
        </View>
        {podeAgua && <View style={e.dirBloco}><Text style={e.num}>{n0(c.agua_m3)}</Text><Text style={e.numUn}>m³</Text></View>}
      </View>
      <Text style={e.rodape}>{[podeEnergia ? `${n0(c.energia_kwh)} kWh` : null, `${n1(c.horas)} h de bomba`, podeAgua && m3ha != null ? `${n0(m3ha)} m³/ha` : null, podeCusto ? `R$ ${n2(c.custo_total)}` : null].filter(Boolean).join(' · ')}</Text>
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
  titulo: { color: cor.textoForte, fontFamily: familia.titulo, fontSize: fonte.normal, fontWeight: '800' },
  meta: { color: cor.textoSuave, fontSize: fonte.pequena, marginTop: espaco.xs },
  dirBloco: { alignItems: 'flex-end' },
  num: { color: cor.textoForte, fontFamily: familia.numero, fontSize: fonte.grande, fontWeight: '800' },
  numUn: { color: cor.textoSuave, fontSize: fonte.pequena },
  trilho: { height: 8, backgroundColor: cor.campo, borderRadius: raio.sm, overflow: 'hidden', marginTop: espaco.md },
  fill: { height: 8, borderRadius: raio.sm },
  atingimento: { fontFamily: familia.numero, fontSize: 12, fontWeight: '700', marginTop: espaco.xs },
  rodape: { color: cor.textoSuave, fontSize: fonte.pequena, marginTop: espaco.sm },
  alerta: { color: cor.erro, fontWeight: '700' },
});
