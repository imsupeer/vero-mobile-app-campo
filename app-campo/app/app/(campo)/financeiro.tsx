import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";

import type { TituloFinanceiro } from "@/api/tipos";
import { lerCache } from "@/db/banco";
import {
  filtrarTitulosPermitidos,
  filtrarTitulos,
  formatarData,
  formatarReais,
  situacao,
} from "@/financeiro/regras";
import type { PeriodoFiltro, TipoFiltro } from "@/financeiro/regras";
import { useSessao } from "@/sessao";
import { useSinc } from "@/sinc/useSinc";
import { CabecalhoPagina, Carregando, Faixa, Vazio } from "@/ui/componentes";
import { FaixaSinc } from "@/ui/FaixaSinc";
import { GradeIndicadores, Indicador } from "@/ui/Indicador";
import { Paginacao } from "@/ui/Paginacao";

const POR_PAGINA = 5;
import { cor, espaco, familia, fonte, raio, sombra, toque } from "@/ui/tema";

const PERIODOS: Array<{ valor: PeriodoFiltro; rotulo: string }> = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "mes_atual", rotulo: "Este mês" },
  { valor: "30_dias", rotulo: "Próximos 30 dias" },
  { valor: "vencidos", rotulo: "Vencidos" },
];

export default function Financeiro() {
  const { pode } = useSessao();
  const { agora, ultima } = useSinc();
  const podePagar = pode("financeiro.contas_pagar.ver");
  const podeReceber = pode("financeiro.contas_receber.ver");
  const abas = useMemo(
    () => [
      ...(podePagar ? [{ valor: "pagar" as const, rotulo: "A pagar" }] : []),
      ...(podeReceber
        ? [{ valor: "receber" as const, rotulo: "A receber" }]
        : []),
    ],
    [podePagar, podeReceber],
  );
  const [titulos, setTitulos] = useState<TituloFinanceiro[] | null>(null);
  const [tipo, setTipo] = useState<TipoFiltro>(abas[0]?.valor ?? "pagar");
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("todos");
  const [paginaFin, setPaginaFin] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);
  useEffect(() => {
    if (!abas.some((item) => item.valor === tipo) && abas[0] != null)
      setTipo(abas[0].valor);
  }, [abas, tipo]);
  const carregar = useCallback(async () => {
    try {
      setTitulos(await lerCache<TituloFinanceiro>("financeiro"));
      setErro(null);
    } catch (e) {
      setErro(
        e instanceof Error ? e.message : "Não foi possível abrir os títulos.",
      );
      setTitulos([]);
    }
  }, []);
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
  const titulosPermitidos = useMemo(
    () => filtrarTitulosPermitidos(titulos ?? [], podePagar, podeReceber),
    [titulos, podePagar, podeReceber],
  );
  const lista = useMemo(
    () => filtrarTitulos(titulosPermitidos, tipo, periodo),
    [periodo, tipo, titulosPermitidos],
  );
  useEffect(() => {
    setPaginaFin(0);
  }, [tipo, periodo]);
  const listaPagina = lista.slice(
    paginaFin * POR_PAGINA,
    paginaFin * POR_PAGINA + POR_PAGINA,
  );

  /* faixa de KPIs no topo, como abre o painel financeiro do site: resume TODOS
     os títulos (não o filtro da tabela abaixo) — a visão de gerência primeiro,
     o detalhe filtrado depois */
  const todos = titulosPermitidos;
  const emAberto = (t: TituloFinanceiro) => situacao(t) !== "quitado";
  const totalReceber = todos
    .filter((t) => t.tipo === "receber" && emAberto(t))
    .reduce((s, t) => s + (Number(t.valor) || 0), 0);
  const totalPagar = todos
    .filter((t) => t.tipo === "pagar" && emAberto(t))
    .reduce((s, t) => s + (Number(t.valor) || 0), 0);
  const vencidosGeral = todos.filter((t) => situacao(t) === "vencido").length;

  if (titulos === null)
    return (
      <View style={e.tela}>
        <FaixaSinc />
        <Carregando />
      </View>
    );
  if (abas.length === 0)
    return (
      <View style={e.tela}>
        <FaixaSinc />
        <Vazio
          titulo="Sem acesso ao financeiro"
          detalhe="Seu perfil não possui permissão para consultar contas a pagar ou receber."
        />
      </View>
    );
  return (
    <View style={e.tela}>
      <FaixaSinc />
      <FlatList
        data={listaPagina}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[
          e.conteudo,
          lista.length === 0 && e.conteudoVazio,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={() => void atualizar()}
            tintColor={cor.acao}
          />
        }
        ListFooterComponent={
          <Paginacao
            pagina={paginaFin}
            porPagina={POR_PAGINA}
            total={lista.length}
            aoTrocar={setPaginaFin}
          />
        }
        ListHeaderComponent={
          <View style={e.cabecalho}>
            <CabecalhoPagina
              etiqueta="Visão financeira"
              titulo="Financeiro"
              subtitulo="Títulos sincronizados com o ERP."
            />
            {erro !== null && <Faixa texto={erro} tom="erro" />}
            {ultima?.modulosPulados.includes("financeiro") && (
              <Faixa
                texto="O módulo financeiro não foi atualizado nesta sincronização. Confira sua conexão ou permissão."
                tom="alerta"
              />
            )}
            <View style={e.indicadores}>
              <GradeIndicadores>
                {podeReceber && (
                  <Indicador
                    rotulo="A receber"
                    valor={formatarReais(totalReceber)}
                    detalhe="títulos em aberto"
                    tom="ok"
                  />
                )}
                {podePagar && (
                  <Indicador
                    rotulo="A pagar"
                    valor={formatarReais(totalPagar)}
                    detalhe="títulos em aberto"
                  />
                )}
                <Indicador
                  rotulo="Vencidos"
                  valor={String(vencidosGeral)}
                  detalhe="exigem atenção"
                  tom={vencidosGeral > 0 ? "erro" : "neutro"}
                />
              </GradeIndicadores>
            </View>
            <View style={e.aviso}>
              <Text style={e.avisoTitulo}>Somente consulta</Text>
              <Text style={e.avisoTexto}>
                Valores individuais são exibidos abaixo. Saldo e movimentações
                financeiras permanecem no ERP.
              </Text>
            </View>
            {abas.length > 1 && (
              <View style={e.filtros}>
                {abas.map((item) => (
                  <Filtro
                    key={item.valor}
                    ativo={tipo === item.valor}
                    rotulo={item.rotulo}
                    aoTocar={() => setTipo(item.valor)}
                  />
                ))}
              </View>
            )}
            <Text style={e.rotuloFiltro}>Período</Text>
            <View style={e.filtros}>
              {PERIODOS.map((item) => (
                <Filtro
                  key={item.valor}
                  ativo={periodo === item.valor}
                  rotulo={item.rotulo}
                  aoTocar={() => setPeriodo(item.valor)}
                />
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          <Vazio
            titulo="Sem títulos no período"
            detalhe={`Nenhuma conta ${tipo === "receber" ? "a receber" : "a pagar"} corresponde ao filtro selecionado.`}
          />
        }
        renderItem={({ item }) => <Titulo item={item} tipo={tipo} />}
      />
    </View>
  );
}

function Filtro({
  ativo,
  rotulo,
  aoTocar,
}: {
  ativo: boolean;
  rotulo: string;
  aoTocar: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: ativo }}
      onPress={aoTocar}
      style={[e.filtro, ativo && e.filtroAtivo]}
    >
      <Text style={[e.filtroTexto, ativo && e.filtroTextoAtivo]}>{rotulo}</Text>
    </Pressable>
  );
}
/** origem_tipo do ERP → rótulo curto para a pessoa. */
function rotuloOrigem(origem: string | null | undefined): string | null {
  if (origem == null || origem === "") return null;
  const mapa: Record<string, string> = {
    compras_pedido: "Compra",
    comercial_venda: "Venda",
    manual: "Manual",
    rh_producao_item: "Mão de obra",
    estoque_movimentacao: "Estoque",
  };
  return mapa[origem] ?? origem.replace(/_/g, " ");
}

function Titulo({ item, tipo }: { item: TituloFinanceiro; tipo: TipoFiltro }) {
  const estado = situacao(item);
  const nome =
    item.descricao ??
    item.fornecedor ??
    item.cliente ??
    item.origem_tipo?.replace(/_/g, " ") ??
    "Título";
  const origem = rotuloOrigem(item.origem_tipo);
  const classificacoes = [
    item.centro_custo ? `CC ${item.centro_custo}` : null,
    item.plano_conta ? `Plano ${item.plano_conta}` : null,
    item.conta_bancaria ? `Conta ${item.conta_bancaria}` : null,
    item.fazenda ? `Fazenda ${item.fazenda}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const formaPagamento =
    item.forma_pagamento == null
      ? null
      : ((
          {
            pix: "PIX",
            boleto: "Boleto",
            transferencia: "Transferência",
            dinheiro: "Dinheiro",
            cheque: "Cheque",
            cartao: "Cartão",
            outro: "Outro",
          } as Record<string, string>
        )[item.forma_pagamento] ?? item.forma_pagamento.replace(/_/g, " "));
  return (
    <View style={[e.cartao, estado === "vencido" && e.cartaoVencido]}>
      <View style={e.linhaPrincipal}>
        <View style={e.textoFlex}>
          <Text style={e.nome} numberOfLines={2}>
            {nome}
          </Text>
          <View style={e.tags}>
            {origem != null && <Text style={e.tag}>{origem}</Text>}
            {item.documento != null && (
              <Text style={e.detalhe}>{item.documento}</Text>
            )}
          </View>
          {classificacoes !== "" && (
            <Text style={e.detalhe}>{classificacoes}</Text>
          )}
          {formaPagamento != null && (
            <Text style={e.detalhe}>Pagamento: {formaPagamento}</Text>
          )}
          {item.fornecedor != null && item.fornecedor !== nome && (
            <Text style={e.detalhe}>{item.fornecedor}</Text>
          )}
          {item.cliente != null && item.cliente !== nome && (
            <Text style={e.detalhe}>{item.cliente}</Text>
          )}
        </View>
        <Text style={[e.valor, tipo === "receber" && { color: cor.ok }]}>
          {formatarReais(item.valor)}
        </Text>
      </View>
      <View style={e.rodape}>
        <Text style={e.vencimento}>
          {estado === "quitado" && item.data_pagamento != null
            ? `Pago em ${formatarData(item.data_pagamento)}`
            : `Vencimento ${formatarData(item.data_vencimento)}`}
        </Text>
        <Text
          style={[
            e.estado,
            estado === "vencido"
              ? e.estadoVencido
              : estado === "quitado"
                ? e.estadoQuitado
                : e.estadoAberto,
          ]}
        >
          {estado === "vencido"
            ? "Vencido"
            : estado === "quitado"
              ? "Quitado"
              : "Em aberto"}
        </Text>
      </View>
    </View>
  );
}

const e = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cor.fundo },
  conteudo: { padding: espaco.md, paddingBottom: espaco.xl },
  conteudoVazio: { flexGrow: 1 },
  cabecalho: { gap: espaco.md, marginBottom: espaco.sm },
  aviso: {
    backgroundColor: cor.okFundo,
    borderRadius: raio.md,
    padding: espaco.md,
  },
  avisoTitulo: { color: cor.ok, fontSize: fonte.pequena, fontWeight: "800" },
  avisoTexto: {
    color: cor.texto,
    fontSize: fonte.pequena,
    lineHeight: 21,
    marginTop: espaco.xs,
  },
  indicadores: { flexDirection: "row", gap: espaco.sm },
  indicador: {
    flex: 1,
    minHeight: 116,
    backgroundColor: cor.superficie,
    borderWidth: 1,
    borderColor: cor.borda,
    borderRadius: raio.lg,
    padding: espaco.md,
    ...sombra.cartao,
  },
  indicadorRotulo: {
    color: cor.textoDesativado,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  indicadorValor: {
    color: cor.textoForte,
    fontFamily: familia.numero,
    fontSize: 20,
    fontWeight: "700",
    marginTop: espaco.sm,
  },
  indicadorDetalhe: {
    color: cor.textoSuave,
    fontSize: 12,
    marginTop: espaco.xs,
  },
  filtros: { flexDirection: "row", flexWrap: "wrap", gap: espaco.sm },
  rotuloFiltro: {
    color: cor.textoSuave,
    fontSize: fonte.pequena,
    fontWeight: "700",
  },
  filtro: {
    minHeight: toque.alvo,
    justifyContent: "center",
    backgroundColor: cor.superficie,
    borderWidth: 1,
    borderColor: cor.borda,
    borderRadius: raio.md,
    paddingHorizontal: espaco.md,
  },
  filtroAtivo: { backgroundColor: cor.acao, borderColor: cor.acao },
  filtroTexto: { color: cor.texto, fontSize: fonte.pequena },
  filtroTextoAtivo: { color: cor.acaoTexto, fontWeight: "800" },
  cartao: {
    backgroundColor: cor.superficie,
    borderWidth: 1,
    borderColor: cor.borda,
    borderRadius: raio.lg,
    padding: espaco.md,
    marginTop: espaco.sm,
    ...sombra.cartao,
  },
  cartaoVencido: { borderLeftWidth: 4, borderLeftColor: cor.erro },
  linhaPrincipal: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: espaco.md,
  },
  textoFlex: { flex: 1 },
  nome: { color: cor.texto, fontSize: fonte.normal, fontWeight: "800" },
  detalhe: {
    color: cor.textoSuave,
    fontSize: fonte.pequena,
    marginTop: espaco.xs,
  },
  tags: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: espaco.sm,
    marginTop: espaco.xs,
  },
  tag: {
    overflow: "hidden",
    color: cor.acao,
    backgroundColor: cor.okFundo,
    borderRadius: raio.sm,
    paddingHorizontal: espaco.sm,
    paddingVertical: 2,
    fontSize: 12,
    fontWeight: "700",
  },
  valor: {
    color: cor.textoForte,
    fontFamily: familia.numero,
    fontSize: fonte.normal,
    fontWeight: "800",
  },
  rodape: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: espaco.sm,
    marginTop: espaco.md,
  },
  vencimento: { flex: 1, color: cor.textoDesativado, fontSize: fonte.pequena },
  estado: {
    overflow: "hidden",
    borderRadius: raio.sm,
    paddingHorizontal: espaco.sm,
    paddingVertical: espaco.xs,
    fontSize: fonte.pequena,
    fontWeight: "800",
  },
  estadoVencido: { color: cor.erro, backgroundColor: cor.erroFundo },
  estadoAberto: { color: cor.alerta, backgroundColor: cor.alertaFundo },
  estadoQuitado: { color: cor.textoSuave, backgroundColor: cor.campo },
});
