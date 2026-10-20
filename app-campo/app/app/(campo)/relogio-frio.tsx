import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ErroApi } from "@/api/cliente";
import { packingApi } from "@/packing/api";
import type {
  ContextoPacking,
  ItemRelogioFrio,
  UnidadePacking,
} from "@/packing/api";
import { Botao, CabecalhoPagina, Carregando, Faixa } from "@/ui/componentes";
import { useSessao } from "@/sessao";
import { cor, espaco, fonte, raio, toque } from "@/ui/tema";

function corRelogio(c?: string): string {
  return c === "vermelho"
    ? cor.erro
    : c === "amarelo"
      ? cor.alerta
      : c === "verde"
        ? cor.ok
        : cor.textoDesativado;
}
function rotuloRelogio(c?: string): string {
  return c === "vermelho"
    ? "Crítico"
    : c === "amarelo"
      ? "Atenção"
      : c === "verde"
        ? "No prazo"
        : "Sem dado";
}

export default function RelogioFrio() {
  const { pode } = useSessao();
  const podeConsultar = pode("packing.recepcao.ver");
  const [contexto, setContexto] = useState<ContextoPacking | null>(null);
  const [unidade, setUnidade] = useState<UnidadePacking | null>(null);
  const [itens, setItens] = useState<ItemRelogioFrio[]>([]);
  const [janela, setJanela] = useState<number>(12);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregarContexto = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const dados = await packingApi.contexto();
      setContexto(dados);
      if ((dados.unidades?.length ?? 0) === 1)
        setUnidade(dados.unidades?.[0] ?? null);
    } catch (e) {
      setErro(
        e instanceof ErroApi && e.codigo === "sem_conexao"
          ? "O relógio de frio precisa de conexão."
          : e instanceof Error
            ? e.message
            : "Não foi possível carregar as unidades.",
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  const carregarFila = useCallback(async () => {
    if (unidade === null) return;
    setOcupado(true);
    setErro(null);
    try {
      const dados = await packingApi.relogioFrio(unidade.id);
      setItens(dados.itens ?? []);
      if (dados.janela_so2_h != null) setJanela(dados.janela_so2_h);
    } catch (e) {
      setErro(
        e instanceof ErroApi && e.codigo === "sem_conexao"
          ? "Sem sinal — conecte para atualizar o relógio."
          : e instanceof Error
            ? e.message
            : "Não foi possível carregar a fila.",
      );
    } finally {
      setOcupado(false);
    }
  }, [unidade]);

  useEffect(() => {
    if (podeConsultar) void carregarContexto();
  }, [carregarContexto, podeConsultar]);
  useEffect(() => {
    void carregarFila();
  }, [carregarFila]);

  if (!podeConsultar)
    return (
      <View style={e.tela}>
        <Faixa texto="Seu perfil não pode consultar o relógio de frio." tom="erro" />
      </View>
    );
  if (carregando)
    return (
      <View style={e.tela}>
        <Carregando />
      </View>
    );

  return (
    <ScrollView style={e.tela} contentContainerStyle={e.conteudo}>
      <CabecalhoPagina
        etiqueta="Packing House"
        titulo="Relógio de frio"
        subtitulo={`Tempo desde a colheita e a janela de SO₂ (${janela}h) dos itens já recebidos.`}
      />
      {erro !== null && (
        <View style={e.faixa}>
          <Faixa texto={erro} tom="erro" />
        </View>
      )}

      {unidade === null ? (
        <>
          <Text style={e.secao}>Escolha a unidade</Text>
          {(contexto?.unidades ?? []).map((u) => (
            <Pressable
              key={u.id}
              onPress={() => setUnidade(u)}
              style={e.unidade}
            >
              <Text style={e.unidadeNome}>{u.nome}</Text>
              <Text style={e.acao}>Escolher</Text>
            </Pressable>
          ))}
          {(contexto?.unidades?.length ?? 0) === 0 && (
            <View style={e.cartao}>
              <Text style={e.nota}>Nenhuma unidade de packing cadastrada.</Text>
            </View>
          )}
        </>
      ) : (
        <>
          <Pressable
            onPress={() => {
              setUnidade(null);
              setItens([]);
            }}
            style={e.unidadeAtual}
          >
            <Text style={e.unidadeNome}>{unidade.nome}</Text>
            <Text style={e.acao}>Trocar</Text>
          </Pressable>
          <View style={e.topoLinha}>
            <Text style={e.secao}>{itens.length} item(ns) na câmara</Text>
            <Botao
              titulo="Atualizar"
              variante="secundario"
              ocupado={ocupado}
              aoTocar={() => void carregarFila()}
            />
          </View>
          {itens.length === 0 && !ocupado && (
            <View style={e.cartao}>
              <Text style={e.nota}>
                Nenhum item recebido aguardando no relógio de frio.
              </Text>
            </View>
          )}
          {itens.map((it) => {
            const tinta = corRelogio(it.relogio?.cor);
            const restante = it.relogio?.restante_so2_h;
            return (
              <View
                key={it.item_id}
                style={[e.item, { borderLeftColor: tinta }]}
              >
                <View style={e.itemTopo}>
                  <View style={e.textoFlex}>
                    <Text style={e.itemNome} numberOfLines={1}>
                      {it.talhao_nome || `Item ${it.item_id}`}
                    </Text>
                    <Text style={e.itemMeta} numberOfLines={1}>
                      {[
                        it.romaneio,
                        it.variedade_nome,
                        it.recepcao_numero,
                        it.peso_kg != null ? `${it.peso_kg} kg` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  </View>
                  <View style={e.relBloco}>
                    <Text style={[e.horas, { color: tinta }]}>
                      {it.relogio?.horas != null
                        ? `${it.relogio.horas.toFixed(1)}h`
                        : "—"}
                    </Text>
                    <Text
                      style={[
                        e.selo,
                        {
                          color: tinta,
                          backgroundColor:
                            tinta === cor.erro
                              ? cor.erroFundo
                              : tinta === cor.alerta
                                ? cor.alertaFundo
                                : cor.okFundo,
                        },
                      ]}
                    >
                      {rotuloRelogio(it.relogio?.cor)}
                    </Text>
                  </View>
                </View>
                <Text style={e.so2}>
                  {restante != null && restante > 0
                    ? `SO₂: ${restante.toFixed(1)}h restantes`
                    : restante === 0
                      ? "Janela de SO₂ expirada"
                      : "Sem dado de colheita"}
                  {it.colhido_em ? ` · colhido ${it.colhido_em}` : ""}
                </Text>
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const e = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cor.fundo },
  conteudo: { padding: espaco.md, paddingBottom: espaco.xl, gap: espaco.sm },
  faixa: { marginBottom: espaco.sm },
  secao: { color: cor.textoForte, fontSize: fonte.media, fontWeight: "800" },
  topoLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: espaco.sm,
    marginTop: espaco.sm,
  },
  unidade: {
    minHeight: toque.alvo,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: cor.superficie,
    borderWidth: 1,
    borderColor: cor.borda,
    borderRadius: raio.lg,
    padding: espaco.md,
  },
  unidadeAtual: {
    minHeight: toque.alvo,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: cor.campo,
    borderRadius: raio.md,
    padding: espaco.md,
  },
  unidadeNome: {
    flex: 1,
    color: cor.texto,
    fontSize: fonte.normal,
    fontWeight: "800",
  },
  acao: { color: cor.acao, fontSize: fonte.pequena, fontWeight: "700" },
  cartao: {
    backgroundColor: cor.superficie,
    borderWidth: 1,
    borderColor: cor.borda,
    borderRadius: raio.lg,
    padding: espaco.md,
  },
  nota: { color: cor.textoSuave, fontSize: fonte.pequena, lineHeight: 21 },
  item: {
    backgroundColor: cor.superficie,
    borderWidth: 1,
    borderColor: cor.borda,
    borderLeftWidth: 4,
    borderRadius: raio.lg,
    padding: espaco.md,
  },
  itemTopo: { flexDirection: "row", alignItems: "flex-start", gap: espaco.sm },
  textoFlex: { flex: 1 },
  itemNome: {
    color: cor.textoForte,
    fontSize: fonte.normal,
    fontWeight: "800",
  },
  itemMeta: {
    color: cor.textoSuave,
    fontSize: fonte.pequena,
    marginTop: espaco.xs,
  },
  relBloco: { alignItems: "flex-end", gap: espaco.xs },
  horas: { fontFamily: "System", fontSize: fonte.media, fontWeight: "800" },
  selo: {
    overflow: "hidden",
    borderRadius: raio.sm,
    paddingHorizontal: espaco.sm,
    paddingVertical: 2,
    fontSize: 11,
    fontWeight: "800",
  },
  so2: { color: cor.textoSuave, fontSize: fonte.pequena, marginTop: espaco.sm },
});
