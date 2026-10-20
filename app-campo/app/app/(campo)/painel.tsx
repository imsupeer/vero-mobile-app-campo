/**
 * Painel operacional — espelho de campo do dashboard operacional do VERO web.
 *
 * Tudo sai do cache do aparelho (funciona sem sinal). Sem custos: por decisão
 * do ERP (P-75/CSO), valores financeiros de custo/venda não descem ao campo —
 * mostramos volume (kg, apontamentos, alertas), não dinheiro de custeio.
 */
import { useCallback, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";

import type {
  Alerta,
  ApontamentoHistorico,
  Atividade,
  EstoqueLote,
  MipRecebido,
  Produtividade,
  Talhao,
} from "@/api/tipos";
import { lerCache } from "@/db/banco";
import { useFazenda } from "@/fazenda/contexto";
import {
  resumirAtividades,
  resumirCargas,
  resumirColheitaPorSafra,
  resumirEstoque,
  resumirLotesVencendo,
} from "@/painel/modelo";
import { useSessao } from "@/sessao";
import { useSinc } from "@/sinc/useSinc";
import { CabecalhoPagina, Carregando } from "@/ui/componentes";
import { FaixaSinc } from "@/ui/FaixaSinc";
import { GradeIndicadores, Indicador } from "@/ui/Indicador";
import { cor, espaco, familia, fonte, raio, sombra } from "@/ui/tema";

type Carga = {
  peso_kg?: number | string | null;
  classificacao?: string | null;
  data_carga?: string | null;
  fazenda?: string | null;
};
type Produto = {
  codigo?: string | null;
  nome?: string | null;
  unidade?: string | null;
  estoque_minimo?: number | string | null;
  saldo?: number | string | null;
};

function diasAtras(dias: number): string {
  const data = new Date();
  data.setDate(data.getDate() - dias);
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}
const kg = (n: number) =>
  `${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kg`;

export default function Painel() {
  const { agora } = useSinc();
  const { pode } = useSessao();
  const { selecionada, filtrar } = useFazenda();
  const [talhoes, setTalhoes] = useState<Talhao[]>([]);
  const [apontamentos, setApontamentos] = useState<ApontamentoHistorico[]>([]);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [mip, setMip] = useState<MipRecebido[]>([]);
  const [cargas, setCargas] = useState<Carga[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [lotes, setLotes] = useState<EstoqueLote[]>([]);
  const [produtividade, setProdutividade] = useState<Produtividade[]>([]);
  const podeEstoque = pode("estoque.ver") || pode("estoque.produtos_insumos.ver");
  const podeLotesValidade = pode("estoque.lotes_validade.ver");
  const podeProdutividade = pode("agro.produtividade.ver");
  const [carregado, setCarregado] = useState(false);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async () => {
    const [t, ap, at, al, mp, cg, es, lt, pr] = await Promise.all([
      lerCache<Talhao>("talhoes").catch(() => []),
      lerCache<ApontamentoHistorico>("apontamentos").catch(() => []),
      lerCache<Atividade>("atividades").catch(() => []),
      lerCache<Alerta>("alertas").catch(() => []),
      lerCache<MipRecebido>("mip_recebidos").catch(() => []),
      lerCache<Carga>("cargas_colheita").catch(() => []),
      podeEstoque ? lerCache<Produto>("estoque").catch(() => []) : Promise.resolve([]),
      podeLotesValidade ? lerCache<EstoqueLote>("estoque_lotes").catch(() => []) : Promise.resolve([]),
      podeProdutividade ? lerCache<Produtividade>("produtividade").catch(() => []) : Promise.resolve([]),
    ]);
    setTalhoes(t);
    setApontamentos(ap);
    setAtividades(at);
    setAlertas(al.filter((x) => x.status == null || x.status === "aberto"));
    setMip(mp);
    setCargas(cg);
    setProdutos(es);
    setLotes(lt);
    setProdutividade(pr);
    setCarregado(true);
  }, [podeEstoque, podeLotesValidade, podeProdutividade]);
  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar]),
  );

  const atualizar = useCallback(async () => {
    setAtualizando(true);
    await agora();
    await carregar();
    setAtualizando(false);
  }, [agora, carregar]);

  const cutoff = diasAtras(30);
  const naFazenda = useCallback(
    <T extends { fazenda?: string | null }>(itens: T[]) =>
      selecionada == null
        ? itens
        : itens.filter((i) => (i.fazenda ?? "").trim() === selecionada),
    [selecionada],
  );

  const talhoesFoco = filtrar(talhoes);
  const areaTotal = talhoesFoco.reduce(
    (s, t) => s + (Number(t.area_ha) || 0),
    0,
  );
  const alertasFoco = naFazenda(alertas);
  const atividadesFoco = naFazenda(atividades);
  const apont30 = naFazenda(apontamentos).filter(
    (a) => String(a.data ?? "") >= cutoff,
  );
  const mip30 = naFazenda(mip).filter(
    (m) => String(m.data_monitoramento ?? "").slice(0, 10) >= cutoff,
  );

  const ativ = useMemo(
    () => resumirAtividades(atividadesFoco, diasAtras(0), cutoff),
    [atividadesFoco, cutoff],
  );

  const alertasPorCategoria = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const a of alertasFoco) {
      const c = a.categoria ?? "outros";
      mapa.set(c, (mapa.get(c) ?? 0) + 1);
    }
    return [...mapa.entries()].sort((x, y) => y[1] - x[1]);
  }, [alertasFoco]);
  const criticos = alertasFoco.filter((a) =>
    String(a.severidade ?? "")
      .toLowerCase()
      .includes("critic"),
  ).length;

  const colheita = useMemo(
    () => resumirCargas(cargas, selecionada, cutoff, diasAtras(0)),
    [cargas, cutoff, selecionada],
  );
  const estoqueBaixo = useMemo(() => resumirEstoque(produtos), [produtos]);
  const lotesVencendo = useMemo(
    () => resumirLotesVencendo(lotes, diasAtras(0), diasAtras(-30)),
    [lotes],
  );
  const colheitaSafra = useMemo(
    () => resumirColheitaPorSafra(produtividade, selecionada),
    [produtividade, selecionada],
  );

  const ultimos = useMemo(
    () =>
      [...naFazenda(apontamentos)]
        .sort((a, b) =>
          String(b.data ?? "").localeCompare(String(a.data ?? "")),
        )
        .slice(0, 5),
    [apontamentos, naFazenda],
  );

  if (!carregado)
    return (
      <View style={e.tela}>
        <Carregando />
      </View>
    );

  return (
    <View style={e.tela}>
      <FaixaSinc />
      <ScrollView
        contentContainerStyle={e.conteudo}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={() => void atualizar()}
            tintColor={cor.acao}
          />
        }
      >
        <CabecalhoPagina
          etiqueta="Visão operacional"
          titulo="Painel"
          subtitulo="Últimos 30 dias, com os dados do aparelho. Sem custos — como no ERP."
        />

        <GradeIndicadores>
          <Indicador
            rotulo="Área"
            valor={areaTotal.toLocaleString("pt-BR", {
              maximumFractionDigits: 1,
            })}
            detalhe={`ha · ${talhoesFoco.length} válvulas`}
          />
          <Indicador
            rotulo="Apontamentos"
            valor={String(apont30.length)}
            detalhe="nos últimos 30 dias"
          />
          <Indicador
            rotulo="Monitoramentos"
            valor={String(mip30.length)}
            detalhe="MIP/MID em 30 dias"
          />
          <Indicador
            rotulo="Alertas"
            valor={String(alertasFoco.length)}
            detalhe={`${criticos} crítico(s)`}
            tom={
              criticos > 0
                ? "erro"
                : alertasFoco.length > 0
                  ? "alerta"
                  : "neutro"
            }
          />
        </GradeIndicadores>

        {podeEstoque && (
          <>
            <Text style={e.secao}>Estoque abaixo do mínimo ({estoqueBaixo.total})</Text>
            <View style={e.cartao}>
              {estoqueBaixo.itens.length === 0 ? (
                <Text style={e.vazio}>Nenhum produto abaixo do mínimo.</Text>
              ) : (
                estoqueBaixo.itens.map((produto, i) => (
                  <View key={produto.codigo ?? produto.nome ?? i} style={[e.itemEstoque, i > 0 && e.apontBorda]}>
                    <View style={e.textoFlex}>
                      <Text style={e.apontTitulo} numberOfLines={1}>{produto.nome ?? produto.codigo ?? "Produto"}</Text>
                      <Text style={e.apontMeta}>
                        {`Saldo ${produto.saldoNumero.toLocaleString("pt-BR")} · mínimo ${produto.minimoNumero.toLocaleString("pt-BR")} ${produto.unidade ?? ""}`}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        {podeLotesValidade && (
          <>
            <Text style={e.secao}>Lotes vencidos ou próximos do vencimento ({lotesVencendo.total})</Text>
            <View style={e.cartao}>
              {lotesVencendo.itens.length === 0 ? (
                <Text style={e.vazio}>Nenhum lote vencido ou com validade nos próximos 30 dias.</Text>
              ) : (
                lotesVencendo.itens.map((lote, i) => {
                  const vencido = Boolean(lote.validade && lote.validade.slice(0, 10) < diasAtras(0));
                  const validade = lote.validade
                    ? new Date(`${lote.validade.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR")
                    : "—";
                  return (
                    <View key={lote.id} style={[e.itemEstoque, i > 0 && e.apontBorda]}>
                      <View style={e.textoFlex}>
                        <Text style={e.apontTitulo} numberOfLines={1}>
                          {lote.produto ?? lote.codigo ?? "Produto"}{lote.codigo_lote ? ` · Lote ${lote.codigo_lote}` : ""}
                        </Text>
                        <Text style={[e.apontMeta, vencido && { color: cor.erro }]}>
                          {`${Number(lote.quantidade ?? 0).toLocaleString("pt-BR")} ${lote.unidade ?? "un."} · ${vencido ? "vencido" : "vence"} ${validade}`}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}


        <Text style={e.secao}>Atividades (ordens de serviço)</Text>
        <View style={e.cartao}>
          <View style={e.linhaKpi}>
            <Bloco rotulo="Planejadas" valor={ativ.planejadas} />
            <Bloco rotulo="Em execução" valor={ativ.execucao} tom={cor.acao} />
            <Bloco rotulo="Concluídas" valor={ativ.concluidas} tom={cor.ok} />
            <Bloco
              rotulo="Atrasadas"
              valor={ativ.atrasadas}
              tom={ativ.atrasadas > 0 ? cor.erro : undefined}
            />
          </View>
        </View>

        {podeProdutividade && (
          <>
            <Text style={e.secao}>Colheita por safra · previsto × realizado</Text>
            <View style={e.cartao}>
              {colheitaSafra.length === 0 ? (
                <Text style={e.vazio}>Sem dados de produtividade sincronizados.</Text>
              ) : (
                colheitaSafra.map((safra, i) => (
                  <View key={safra.safra} style={[e.safraLinha, i > 0 && e.apontBorda]}>
                    <Text style={e.apontTitulo}>{safra.safra}</Text>
                    <Text style={e.apontMeta}>{`Previsto ${kg(safra.previsto)} · realizado ${kg(safra.realizado)}`}</Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        <Text style={e.secao}>Alertas por categoria</Text>
        <View style={e.cartao}>
          {alertasPorCategoria.length === 0 ? (
            <Text style={e.vazio}>Nenhum alerta aberto.</Text>
          ) : (
            alertasPorCategoria.map(([categoria, n]) => (
              <View key={categoria} style={e.barraLinha}>
                <Text style={e.barraRotulo} numberOfLines={1}>
                  {categoria}
                </Text>
                <View style={e.barraTrilho}>
                  <View
                    style={[
                      e.barraFill,
                      {
                        width: `${Math.max(6, Math.min(100, (n / (alertasPorCategoria[0]?.[1] ?? 1)) * 100))}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={e.barraNum}>{n}</Text>
              </View>
            ))
          )}
        </View>

        <Text style={e.secao}>Colheita — cargas ({kg(colheita.total)})</Text>
        <View style={e.cartao}>
          {colheita.porClasse.length === 0 ? (
            <Text style={e.vazio}>Nenhuma carga registrada.</Text>
          ) : (
            colheita.porClasse.map(([classe, peso]) => (
              <View key={classe} style={e.barraLinha}>
                <Text style={e.barraRotulo} numberOfLines={1}>
                  {classe}
                </Text>
                <View style={e.barraTrilho}>
                  <View
                    style={[
                      e.barraFill,
                      {
                        width: `${Math.max(6, Math.min(100, (peso / (colheita.porClasse[0]?.[1] ?? 1)) * 100))}%`,
                        backgroundColor: cor.acaoApoio,
                      },
                    ]}
                  />
                </View>
                <Text style={e.barraNum}>{kg(peso)}</Text>
              </View>
            ))
          )}
        </View>

        <Text style={e.secao}>Últimos apontamentos</Text>
        <View style={e.cartao}>
          {ultimos.length === 0 ? (
            <Text style={e.vazio}>Nenhum apontamento no cache.</Text>
          ) : (
            ultimos.map((a, i) => (
              <View
                key={a.id ?? i}
                style={[e.apontLinha, i > 0 && e.apontBorda]}
              >
                <View style={e.textoFlex}>
                  <Text style={e.apontTitulo} numberOfLines={1}>
                    {a.atividade ?? a.tipo ?? "Apontamento"}
                  </Text>
                  <Text style={e.apontMeta} numberOfLines={1}>
                    {[
                      a.valvula ?? a.talhao_nome,
                      a.responsavel,
                      a.pessoas != null ? `${a.pessoas} pessoa(s)` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </View>
                <Text style={e.apontData}>{a.data ?? ""}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function Bloco({
  rotulo,
  valor,
  tom,
}: {
  rotulo: string;
  valor: number;
  tom?: string;
}) {
  return (
    <View style={e.bloco}>
      <Text style={[e.blocoValor, tom != null && { color: tom }]}>{valor}</Text>
      <Text style={e.blocoRotulo}>{rotulo}</Text>
    </View>
  );
}

const e = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cor.fundo },
  conteudo: { padding: espaco.md, paddingBottom: espaco.xl, gap: espaco.sm },
  secao: {
    color: cor.textoForte,
    fontFamily: familia.titulo,
    fontSize: fonte.media,
    fontWeight: "800",
    marginTop: espaco.md,
  },
  cartao: {
    backgroundColor: cor.superficie,
    borderWidth: 1,
    borderColor: cor.borda,
    borderRadius: raio.lg,
    padding: espaco.md,
    ...sombra.cartao,
  },
  linhaKpi: { flexDirection: "row", gap: espaco.sm },
  bloco: { flex: 1, alignItems: "center" },
  blocoValor: {
    color: cor.textoForte,
    fontFamily: familia.numero,
    fontSize: fonte.grande,
    fontWeight: "800",
  },
  blocoRotulo: {
    color: cor.textoSuave,
    fontSize: 11,
    textAlign: "center",
    marginTop: 2,
  },
  vazio: { color: cor.textoSuave, fontSize: fonte.pequena },
  barraLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaco.sm,
    marginVertical: espaco.xs,
  },
  barraRotulo: {
    width: 96,
    color: cor.texto,
    fontSize: fonte.pequena,
    textTransform: "capitalize",
  },
  barraTrilho: {
    flex: 1,
    height: 10,
    backgroundColor: cor.campo,
    borderRadius: raio.sm,
    overflow: "hidden",
  },
  barraFill: { height: 10, backgroundColor: cor.alerta, borderRadius: raio.sm },
  barraNum: {
    minWidth: 64,
    textAlign: "right",
    color: cor.textoSuave,
    fontFamily: familia.numero,
    fontSize: 12,
  },
  apontLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaco.sm,
    paddingVertical: espaco.sm,
  },
  itemEstoque: { flexDirection: "row", alignItems: "center", paddingVertical: espaco.sm },
  safraLinha: { paddingVertical: espaco.sm },
  apontBorda: { borderTopWidth: 1, borderTopColor: cor.borda },
  textoFlex: { flex: 1 },
  apontTitulo: {
    color: cor.textoForte,
    fontSize: fonte.normal,
    fontWeight: "700",
  },
  apontMeta: { color: cor.textoSuave, fontSize: fonte.pequena, marginTop: 2 },
  apontData: {
    color: cor.textoDesativado,
    fontFamily: familia.numero,
    fontSize: 12,
  },
});
