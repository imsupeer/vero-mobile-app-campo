/**
 * Início — o painel que abre o aplicativo.
 *
 * É o espelho, em versão de campo, da tela que abre o VERO web: a previsão do
 * tempo em cima, uma faixa de indicadores do que pede atenção e os atalhos dos
 * módulos que o perfil enxerga. Tudo lê do banco do aparelho — funciona sem
 * sinal, como o resto do aplicativo; a previsão é o único bloco que busca rede,
 * e mesmo ela cai para a última leitura guardada quando não há conexão.
 */
import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router, useFocusEffect } from "expo-router";

import type {
  Alerta,
  ApontamentoAberto,
  Fazenda,
  Talhao,
  TituloFinanceiro,
} from "@/api/tipos";
import {
  buscarPrevisao,
  centroFazenda,
  previsaoGuardada,
} from "@/clima/previsao";
import type { Previsao } from "@/clima/previsao";
import { lerCache } from "@/db/banco";
import { useFazenda } from "@/fazenda/contexto";
import {
  filtrarTitulosPermitidos,
  formatarReais,
  situacao,
} from "@/financeiro/regras";
import { relatoriosDisponiveis } from "@/relatorios/catalogo";
import { useSessao } from "@/sessao";
import { useSinc } from "@/sinc/useSinc";
import { ClimaCard } from "@/ui/ClimaCard";
import { FaixaSinc } from "@/ui/FaixaSinc";
import { GradeIndicadores, Indicador } from "@/ui/Indicador";
import { cor, espaco, familia, fonte, raio, sombra, toque } from "@/ui/tema";

type Atalho = {
  titulo: string;
  detalhe: string;
  rota:
    | "/mapa"
    | "/caderno"
    | "/packing"
    | "/financeiro"
    | "/relatorios"
    | "/operacoes"
    | "/consultas";
  icone: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  liberado: boolean;
};

export default function Inicio() {
  const { usuario, pode } = useSessao();
  const { agora, ultima } = useSinc();
  const { filtrar, recarregarFazendas, selecionada } = useFazenda();

  const [talhoes, setTalhoes] = useState<Talhao[]>([]);
  const [abertos, setAbertos] = useState<ApontamentoAberto[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [titulos, setTitulos] = useState<TituloFinanceiro[]>([]);
  const [previsao, setPrevisao] = useState<Previsao | null>(null);
  const [previsaoOffline, setPrevisaoOffline] = useState(false);
  const [carregado, setCarregado] = useState(false);
  const [atualizando, setAtualizando] = useState(false);

  const podeReceber = pode("financeiro.contas_receber.ver");
  const podePagar = pode("financeiro.contas_pagar.ver");
  const podePacking =
    pode("packing.ver") ||
    pode("packing.apontar.ver") ||
    pode("packing.recepcao.ver") ||
    pode("agro.romaneios_colheita.ver");
  const podeRelatorios = relatoriosDisponiveis(pode).length > 0;
  const podeOperacoes =
    pode("mip.monitoramentos.editar") ||
    pode("mip.ver") ||
    pode("mip.aplicacoes_defensivos.editar") ||
    pode("irrigacao.apontamentos_irrigacao.editar") ||
    pode("agro.colheita.editar") ||
    pode("agro.romaneios_colheita.editar") ||
    pode("agro.apontamentos_campo.editar") ||
    pode("maquinas.horimetro.editar") ||
    pode("maquinas.abastecimentos.editar") ||
    pode("compras.aprovacoes.editar") ||
    pode("compras.recebimentos.editar") ||
    pode("compras.solicitacoes_compra.editar") ||
    pode("estoque.entradas.editar");

  const carregar = useCallback(async () => {
    const [t, a, al, f, fazendas] = await Promise.all([
      lerCache<Talhao>("talhoes").catch(() => []),
      lerCache<ApontamentoAberto>("apontamentos_abertos").catch(() => []),
      lerCache<Alerta>("alertas").catch(() => []),
      lerCache<TituloFinanceiro>("financeiro").catch(() => []),
      lerCache<Fazenda>("fazendas").catch(() => []),
    ]);
    setTalhoes(t);
    setAbertos(a);
    setAlertas(al.filter((x) => x.status == null || x.status === "aberto"));
    setTitulos(f);
    setCarregado(true);
    void recarregarFazendas();
    void carregarClima(t, fazendas);
  }, [recarregarFazendas, ultima]);

  const carregarClima = useCallback(async (t: Talhao[], fazendas: Fazenda[]) => {
    const guardada = await previsaoGuardada();
    if (guardada != null) {
      setPrevisao(guardada);
      setPrevisaoOffline(true);
    }
    const centro = centroFazenda(t, fazendas);
    if (centro == null) return;
    const fresca = await buscarPrevisao(centro.lat, centro.lng);
    if (fresca != null) {
      setPrevisao(fresca);
      setPrevisaoOffline(false);
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

  const titulosAutorizados = filtrarTitulosPermitidos(
    titulos,
    podePagar,
    podeReceber,
  );
  const titulosFoco =
    selecionada == null
      ? titulosAutorizados
      : titulosAutorizados.filter((x) => x.fazenda === selecionada);
  const aReceber = titulosFoco.filter(
    (x) => x.tipo === "receber" && situacao(x) !== "quitado",
  );
  const aPagar = titulosFoco.filter(
    (x) => x.tipo === "pagar" && situacao(x) !== "quitado",
  );
  const somaReceber = aReceber.reduce((s, x) => s + (Number(x.valor) || 0), 0);
  const somaPagar = aPagar.reduce((s, x) => s + (Number(x.valor) || 0), 0);
  const receberVencidos = aReceber.filter(
    (x) => situacao(x) === "vencido",
  ).length;
  const pagarVencidos = aPagar.filter((x) => situacao(x) === "vencido").length;

  const talhoesFoco = filtrar(talhoes);
  const alertasFoco =
    selecionada == null
      ? alertas
      : alertas.filter((item) => item.fazenda === selecionada);
  const abertosFoco =
    selecionada == null
      ? abertos
      : abertos.filter((item) => item.fazenda === selecionada);
  const primeiroNome = (usuario?.nome ?? "").trim().split(" ")[0] || "operador";
  const hoje = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  const todosAtalhos: Atalho[] = [
    {
      titulo: "Operações",
      detalhe: "Registrar em campo (offline)",
      rota: "/operacoes",
      icone: "clipboard-check-outline",
      liberado: podeOperacoes,
    },
    {
      titulo: "Consultas",
      detalhe: "Painéis, estoque e análises",
      rota: "/consultas",
      icone: "view-dashboard-variant-outline",
      liberado: true,
    },
    {
      titulo: "Mapa da fazenda",
      detalhe: "Válvulas, situação e limites",
      rota: "/mapa",
      icone: "map-outline",
      liberado: pode("mapa.ver"),
    },
    {
      titulo: "Caderno de campo",
      detalhe: "Apontamentos e serviços",
      rota: "/caderno",
      icone: "notebook-outline",
      liberado: pode("caderno.ver"),
    },
    {
      titulo: "Packing House",
      detalhe: "Recepção e produção",
      rota: "/packing",
      icone: "package-variant-closed",
      liberado: podePacking,
    },
    {
      titulo: "Financeiro",
      detalhe: "Títulos e vencimentos",
      rota: "/financeiro",
      icone: "cash-multiple",
      liberado: podeReceber || podePagar,
    },
    {
      titulo: "Relatórios",
      detalhe: "Consultas do aparelho",
      rota: "/relatorios",
      icone: "chart-box-outline",
      liberado: podeRelatorios,
    },
  ];
  const atalhos = todosAtalhos.filter((a) => a.liberado);

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
        <View style={e.saudacao}>
          <Text style={e.etiqueta}>VISÃO GERAL</Text>
          <Text style={e.ola}>Olá, {primeiroNome}</Text>
          <Text style={e.sub}>
            {hoje.charAt(0).toUpperCase() + hoje.slice(1)}
            {usuario?.perfil != null ? ` · ${usuario.perfil}` : ""}
          </Text>
        </View>

        {previsao !== null && (
          <ClimaCard previsao={previsao} offline={previsaoOffline} />
        )}

        <Text style={e.secao}>O que pede atenção</Text>
        <GradeIndicadores>
          <Indicador
            rotulo="Válvulas"
            valor={String(talhoesFoco.length)}
            detalhe={carregado ? "áreas no aparelho" : "carregando…"}
          />
          <Indicador
            rotulo="Serviços abertos"
            valor={String(abertosFoco.length)}
            detalhe={
              abertosFoco.length === 0 ? "nada em campo agora" : "em andamento"
            }
            tom={abertosFoco.length > 0 ? "alerta" : "neutro"}
          />
          <Indicador
            rotulo="Alertas"
            valor={String(alertasFoco.length)}
            detalhe={
              alertasFoco.length === 0
                ? "sem alertas abertos"
                : "exigem atenção"
            }
            tom={alertasFoco.length > 0 ? "erro" : "neutro"}
          />
          {podeReceber && (
            <Indicador
              rotulo="A receber"
              valor={formatarReais(somaReceber)}
              detalhe={`${receberVencidos} vencido(s)`}
              tom="ok"
            />
          )}
          {podePagar && (
            <Indicador
              rotulo="A pagar"
              valor={formatarReais(somaPagar)}
              detalhe={`${pagarVencidos} vencido(s)`}
              tom={pagarVencidos > 0 ? "erro" : "neutro"}
            />
          )}
        </GradeIndicadores>

        <Text style={e.secao}>Módulos</Text>
        <View style={e.atalhos}>
          {atalhos.map((a) => (
            <Pressable
              key={a.rota}
              accessibilityRole="button"
              onPress={() => router.push(a.rota)}
              style={({ pressed }) => [
                e.atalho,
                pressed && e.atalhoPressionado,
              ]}
            >
              <View style={e.atalhoIcone}>
                <MaterialCommunityIcons
                  name={a.icone}
                  size={24}
                  color={cor.acao}
                />
              </View>
              <View style={e.textoFlex}>
                <Text style={e.atalhoTitulo}>{a.titulo}</Text>
                <Text style={e.atalhoDetalhe}>{a.detalhe}</Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={26}
                color={cor.acao}
              />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const e = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cor.fundo },
  conteudo: { padding: espaco.md, paddingBottom: espaco.xl, gap: espaco.md },
  saudacao: {},
  etiqueta: {
    color: cor.textoDesativado,
    fontFamily: familia.corpo,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  ola: {
    color: cor.textoForte,
    fontFamily: familia.titulo,
    fontSize: fonte.grande,
    fontWeight: "800",
    letterSpacing: -0.4,
    marginTop: espaco.xs,
  },
  sub: {
    color: cor.textoSuave,
    fontFamily: familia.corpo,
    fontSize: fonte.pequena,
    marginTop: 2,
  },
  secao: {
    color: cor.textoForte,
    fontFamily: familia.titulo,
    fontSize: fonte.media,
    fontWeight: "800",
    marginTop: espaco.sm,
  },
  atalhos: { gap: espaco.sm },
  atalho: {
    minHeight: toque.alvo,
    flexDirection: "row",
    alignItems: "center",
    gap: espaco.md,
    backgroundColor: cor.superficie,
    borderWidth: 1,
    borderColor: cor.borda,
    borderRadius: raio.lg,
    padding: espaco.md,
    ...sombra.cartao,
  },
  atalhoPressionado: {
    borderColor: cor.acaoApoio,
    backgroundColor: cor.fundoSuave,
  },
  atalhoIcone: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: cor.okFundo,
    borderRadius: raio.md,
  },
  textoFlex: { flex: 1 },
  atalhoTitulo: {
    color: cor.textoForte,
    fontFamily: familia.titulo,
    fontSize: fonte.normal,
    fontWeight: "800",
  },
  atalhoDetalhe: {
    color: cor.textoSuave,
    fontFamily: familia.corpo,
    fontSize: fonte.pequena,
    marginTop: 2,
  },
});
