import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ErroApi } from "@/api/cliente";
import { packingApi } from "@/packing/api";
import type {
  CargaPendente,
  ContextoPacking,
  GatesPacking,
  PendenciasPacking,
  UnidadePacking,
} from "@/packing/api";
import { numeroDecimal } from "@/packing/regras";
import { useSessao } from "@/sessao";
import { useFazenda } from "@/fazenda/contexto";
import { enfileirar, novoClientUuid } from "@/sinc/fila";
import { useSinc } from "@/sinc/useSinc";
import {
  Botao,
  CabecalhoPagina,
  Campo,
  Carregando,
  Faixa,
  Vazio,
} from "@/ui/componentes";
import { Paginacao } from "@/ui/Paginacao";
import { cor, espaco, fonte, raio, toque } from "@/ui/tema";

const POR_PAGINA = 5;
type Escolha = {
  metodo: string;
  contentores: string;
  temperatura: string;
  turma: string;
};
const GATES: Array<[keyof GatesPacking, string]> = [
  ["carencia", "Carência"],
  ["certificacao", "Certificação"],
  ["rastreabilidade", "Rastreabilidade"],
  ["licenca", "Licença"],
  ["so2", "SO₂"],
];

export default function PackingRecepcao() {
  const { pode } = useSessao();
  const { filtrar } = useFazenda();
  const podeConsultar = pode("packing.recepcao.ver");
  const podeEditar = pode("packing.recepcao.editar");
  const { recontar, agora } = useSinc();
  const [contexto, setContexto] = useState<ContextoPacking | null>(null);
  const [unidade, setUnidade] = useState<UnidadePacking | null>(null);
  const [pendencias, setPendencias] = useState<PendenciasPacking | null>(null);
  const [selecionadas, setSelecionadas] = useState<Record<number, Escolha>>({});
  const [placa, setPlaca] = useState("");
  const [motorista, setMotorista] = useState("");
  const [transportadora, setTransportadora] = useState("");
  const [produtorId, setProdutorId] = useState("");
  const [pesoBruto, setPesoBruto] = useState("");
  const [pesoTara, setPesoTara] = useState("");
  const [observacao, setObservacao] = useState("");
  const [mercadoId, setMercadoId] = useState<number | null>(null);
  const [gates, setGates] = useState<GatesPacking | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [paginaCargas, setPaginaCargas] = useState(0);
  const metodoPadrao = contexto?.metodos_rastreabilidade?.[0] ?? "segregacao";

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
          ? "A recepção precisa de conexão para carregar unidades e cargas."
          : e instanceof Error
            ? e.message
            : "Não foi possível carregar a recepção.",
      );
    } finally {
      setCarregando(false);
    }
  }, []);
  const carregarPendencias = useCallback(async () => {
    if (unidade === null) return;
    setOcupado(true);
    setErro(null);
    try {
      setPendencias(await packingApi.pendentes(unidade.id));
      setSelecionadas({});
      setGates(null);
    } catch (e) {
      setErro(
        e instanceof ErroApi && e.codigo === "sem_conexao"
          ? "Sem sinal — conecte para consultar as cargas pendentes."
          : e instanceof Error
            ? e.message
            : "Não foi possível carregar as cargas.",
      );
    } finally {
      setOcupado(false);
    }
  }, [unidade]);
  useEffect(() => {
    if (podeConsultar) void carregarContexto();
  }, [carregarContexto, podeConsultar]);
  useEffect(() => {
    void carregarPendencias();
  }, [carregarPendencias]);
  useEffect(() => {
    setPaginaCargas(0);
  }, [pendencias]);
  const cargas = useMemo(
    () => filtrar(pendencias?.cargas ?? []),
    [filtrar, pendencias],
  );
  const cargasSemFazenda = useMemo(
    () => (pendencias?.cargas ?? []).some((carga) => !carga.fazenda?.trim()),
    [pendencias],
  );
  const cargasPagina = useMemo(
    () =>
      cargas.slice(
        paginaCargas * POR_PAGINA,
        paginaCargas * POR_PAGINA + POR_PAGINA,
      ),
    [cargas, paginaCargas],
  );
  const ids = useMemo(
    () => Object.keys(selecionadas).map(Number),
    [selecionadas],
  );
  const alternar = (carga: CargaPendente) => {
    setGates(null);
    setSelecionadas((atual) => {
      const copia = { ...atual };
      if (copia[carga.carga_id] != null) delete copia[carga.carga_id];
      else
        copia[carga.carga_id] = {
          metodo: metodoPadrao,
          contentores: "",
          temperatura: "",
          turma: "",
        };
      return copia;
    });
  };
  const alterar = (id: number, campo: keyof Escolha, valor: string) => {
    setGates(null);
    setSelecionadas((atual) => ({
      ...atual,
      [id]: {
        ...(atual[id] ?? {
          metodo: metodoPadrao,
          contentores: "",
          temperatura: "",
          turma: "",
        }),
        [campo]: valor,
      },
    }));
  };
  const itens = useCallback(
    () =>
      ids.map((id) => {
        const escolha = selecionadas[id];
        const item: Record<string, unknown> = {
          carga_id: id,
          metodo: escolha?.metodo ?? metodoPadrao,
        };
        const contentores = numeroDecimal(escolha?.contentores ?? "");
        const temperatura = numeroDecimal(escolha?.temperatura ?? "");
        if (contentores != null && contentores > 0)
          item.n_contentores = Math.round(contentores);
        if (temperatura != null) item.temperatura_chegada_c = temperatura;
        if (escolha?.turma.trim()) item.turma_colheita = escolha.turma.trim();
        return item;
      }),
    [ids, metodoPadrao, selecionadas],
  );
  const idProdutor = produtorId.trim() === "" ? null : Number(produtorId);
  const validarProdutor = () =>
    idProdutor === null || (Number.isSafeInteger(idProdutor) && idProdutor > 0);
  const avaliar = async () => {
    if (!podeConsultar || unidade === null || ids.length === 0) return;
    if (!validarProdutor()) {
      setErro("Informe um ID de produtor inteiro e maior que zero.");
      return;
    }
    setOcupado(true);
    setErro(null);
    try {
      setGates(
        await packingApi.avaliar({
          unidade_id: unidade.id,
          ...(idProdutor == null ? {} : { produtor_id: idProdutor }),
          ...(mercadoId == null ? {} : { mercado_id: mercadoId }),
          itens: itens(),
        }),
      );
    } catch (e) {
      setErro(
        e instanceof ErroApi && e.codigo === "sem_conexao"
          ? "A avaliação dos gates precisa de conexão."
          : e instanceof Error
            ? e.message
            : "Não foi possível avaliar os gates.",
      );
    } finally {
      setOcupado(false);
    }
  };
  const aceitar = async () => {
    if (!podeEditar || unidade === null || ids.length === 0) return;
    if (!validarProdutor()) {
      setErro("Informe um ID de produtor inteiro e maior que zero.");
      return;
    }
    setOcupado(true);
    setErro(null);
    const payload: Record<string, unknown> = {
      client_uuid: novoClientUuid(),
      unidade_id: unidade.id,
      itens: itens(),
    };
    if (idProdutor != null) payload.produtor_id = idProdutor;
    if (placa.trim()) payload.veiculo_placa = placa.trim().toUpperCase();
    if (motorista.trim()) payload.motorista = motorista.trim();
    if (transportadora.trim()) payload.transportadora = transportadora.trim();
    const bruto = numeroDecimal(pesoBruto);
    const tara = numeroDecimal(pesoTara);
    if (bruto != null) payload.peso_bruto_kg = bruto;
    if (tara != null) payload.peso_tara_kg = tara;
    if (mercadoId != null) payload.mercado_id = mercadoId;
    if (observacao.trim()) payload.observacao = observacao.trim();
    try {
      const resultado = await packingApi.receber(payload);
      setSucesso(
        gates?.bloqueia
          ? "Recepção registrada como rejeitada por um gate."
          : `Recepção ${String(resultado.numero ?? "")} aceita.`,
      );
      setSelecionadas({});
      void carregarPendencias();
    } catch (e) {
      if (e instanceof ErroApi && e.codigo === "sem_conexao") {
        await enfileirar({
          tipo: "ph_recepcao",
          rota: "/packing/recepcao",
          payload,
        });
        await recontar();
        void agora();
        setSucesso(
          "Recepção guardada na fila e será enviada quando houver conexão.",
        );
        setSelecionadas({});
      } else
        setErro(
          e instanceof Error
            ? e.message
            : "Não foi possível registrar a recepção.",
        );
    } finally {
      setOcupado(false);
    }
  };

  if (!podeConsultar)
    return (
      <View style={e.tela}>
        <Vazio titulo="Sem permissão" detalhe="Seu perfil não pode consultar a recepção de cargas." />
      </View>
    );
  if (carregando)
    return (
      <View style={e.tela}>
        <Carregando />
      </View>
    );
  return (
    <ScrollView
      style={e.tela}
      contentContainerStyle={e.conteudo}
      keyboardShouldPersistTaps="handled"
    >
      <CabecalhoPagina
        etiqueta="Controle de entrada"
        titulo="Recepção de cargas"
        subtitulo="Chegada do campo, rastreabilidade e qualidade."
      />
      {erro !== null && <Faixa texto={erro} tom="erro" />}
      {sucesso !== null && <Faixa texto={sucesso} />}
      {!podeEditar && <Faixa texto="Acesso somente para consulta. Seu perfil pode verificar os gates, mas não registrar recepções." />}
      {unidade === null ? (
        <>
          <Text style={e.secao}>Escolha a unidade</Text>
          {(contexto?.unidades ?? []).map((item) => (
            <Pressable
              key={item.id}
              onPress={() => setUnidade(item)}
              style={e.unidade}
            >
              <Text style={e.unidadeNome}>{item.nome}</Text>
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
              setPendencias(null);
            }}
            style={e.unidadeAtual}
          >
            <Text style={e.unidadeNome}>
              {unidade.nome}
              {pendencias?.proximo_numero
                ? ` · próxima ${pendencias.proximo_numero}`
                : ""}
            </Text>
            <Text style={e.acao}>Trocar</Text>
          </Pressable>
          <Text style={e.secao}>Cargas aguardando</Text>
          {ocupado && pendencias === null && <Carregando />}
          {cargas.length === 0 && !ocupado && (
            <View style={e.cartao}>
              <Text style={e.nota}>
                {cargasSemFazenda
                  ? "A API não identificou a fazenda de uma ou mais cargas. Atualize o serviço de Packing antes de recebê-las."
                  : "Nenhuma carga pendente nesta unidade."}
              </Text>
            </View>
          )}
          {cargasPagina.map((carga) => {
            const escolha = selecionadas[carga.carga_id];
            const marcada = escolha != null;
            const relogio = carga.relogio;
            return (
              <Pressable
                key={carga.carga_id}
                onPress={() => alternar(carga)}
                style={[e.carga, marcada && e.cargaMarcada]}
              >
                <View style={e.cargaLinha}>
                  <View style={e.textoFlex}>
                    <Text style={e.romaneio}>
                      {carga.romaneio ?? `Carga ${carga.carga_id}`}
                    </Text>
                    <Text style={e.nota}>
                      {[
                        carga.talhao_nome,
                        carga.variedade_nome,
                        carga.peso_kg != null ? `${carga.peso_kg} kg` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  </View>
                  <Text
                    style={[
                      e.relogio,
                      {
                        color:
                          relogio?.cor === "vermelho"
                            ? cor.erro
                            : relogio?.cor === "amarelo"
                              ? cor.alerta
                              : cor.ok,
                      },
                    ]}
                  >
                    {relogio?.horas != null ? `${relogio.horas}h` : "Sem dado"}
                  </Text>
                </View>
                {marcada && (
                  <View style={e.detalhes}>
                    <Text style={e.rotulo}>Rastreabilidade</Text>
                    <View style={e.chips}>
                      {(
                        contexto?.metodos_rastreabilidade ?? [
                          "segregacao",
                          "identidade_preservada",
                        ]
                      ).map((metodo) => (
                        <Pressable
                          key={metodo}
                          onPress={() =>
                            alterar(carga.carga_id, "metodo", metodo)
                          }
                          style={[
                            e.chip,
                            escolha.metodo === metodo && e.chipAtivo,
                          ]}
                        >
                          <Text
                            style={[
                              e.chipTexto,
                              escolha.metodo === metodo && e.chipTextoAtivo,
                            ]}
                          >
                            {metodo === "identidade_preservada"
                              ? "Identidade preservada"
                              : "Segregação"}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    <Campo
                      rotulo="Contentores"
                      value={escolha.contentores}
                      onChangeText={(valor) =>
                        alterar(carga.carga_id, "contentores", valor)
                      }
                      keyboardType="number-pad"
                      placeholder="Opcional"
                    />
                    <Campo
                      rotulo="Temperatura de chegada (°C)"
                      value={escolha.temperatura}
                      onChangeText={(valor) =>
                        alterar(carga.carga_id, "temperatura", valor)
                      }
                      keyboardType="decimal-pad"
                      placeholder="Opcional"
                    />
                    <Campo
                      rotulo="Turma da colheita"
                      value={escolha.turma}
                      onChangeText={(valor) =>
                        alterar(carga.carga_id, "turma", valor)
                      }
                      placeholder="Opcional"
                    />
                  </View>
                )}
              </Pressable>
            );
          })}
          <Paginacao
            pagina={paginaCargas}
            porPagina={POR_PAGINA}
            total={cargas.length}
            aoTrocar={setPaginaCargas}
          />
          {ids.length > 0 && (
            <>
              {podeEditar && <View style={e.cartao}>
                <Text style={e.secaoCartao}>
                  Chegada · {ids.length} carga(s)
                </Text>
                <Campo
                  rotulo="Placa"
                  value={placa}
                  onChangeText={setPlaca}
                  autoCapitalize="characters"
                  placeholder="AAA-0A00"
                />
                <Campo
                  rotulo="Motorista"
                  value={motorista}
                  onChangeText={setMotorista}
                  placeholder="Nome"
                />
                <Campo
                  rotulo="Transportadora"
                  value={transportadora}
                  onChangeText={setTransportadora}
                  placeholder="Opcional"
                />
                <Campo
                  rotulo="Produtor (ID)"
                  value={produtorId}
                  onChangeText={setProdutorId}
                  keyboardType="number-pad"
                  placeholder="Opcional"
                />
                <View style={e.duasColunas}>
                  <View style={e.coluna}>
                    <Campo
                      rotulo="Peso bruto (kg)"
                      value={pesoBruto}
                      onChangeText={setPesoBruto}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={e.coluna}>
                    <Campo
                      rotulo="Tara (kg)"
                      value={pesoTara}
                      onChangeText={setPesoTara}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
                <Text style={e.rotulo}>Mercado de destino</Text>
                <View style={e.chips}>
                  {(contexto?.mercados ?? []).map((mercado) => (
                    <Pressable
                      key={mercado.id}
                      onPress={() => {
                        setMercadoId(
                          mercadoId === mercado.id ? null : mercado.id,
                        );
                        setGates(null);
                      }}
                      style={[e.chip, mercadoId === mercado.id && e.chipAtivo]}
                    >
                      <Text
                        style={[
                          e.chipTexto,
                          mercadoId === mercado.id && e.chipTextoAtivo,
                        ]}
                      >
                        {mercado.nome}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Campo
                  rotulo="Observação"
                  value={observacao}
                  onChangeText={setObservacao}
                  placeholder="Opcional"
                />
              </View>}
              <View style={e.cartao}>
                <Text style={e.secaoCartao}>Gates de qualidade</Text>
                {gates === null ? (
                  <Text style={e.nota}>
                    Avalie carência, certificação, rastreabilidade, licença e
                    SO₂ antes de aceitar.
                  </Text>
                ) : (
                  GATES.map(([chave, rotulo]) => {
                    const gate = gates[chave];
                    if (typeof gate === "boolean") return null;
                    return (
                      <View key={chave} style={e.gate}>
                        <View
                          style={[
                            e.ponto,
                            {
                              backgroundColor:
                                gate?.status === "bloqueio"
                                  ? cor.erro
                                  : gate?.status === "aviso"
                                    ? cor.alerta
                                    : gate?.status === "ok"
                                      ? cor.ok
                                      : cor.textoDesativado,
                            },
                          ]}
                        />
                        <Text style={e.gateNome}>{rotulo}</Text>
                        <Text style={e.gateDetalhe}>
                          {gate?.detalhe ?? gate?.status ?? "Sem dado"}
                        </Text>
                      </View>
                    );
                  })
                )}
                {gates?.bloqueia && (
                  <Text style={e.bloqueio}>
                    Um gate bloqueia a carga. Se continuar, ela será registrada
                    como rejeitada.
                  </Text>
                )}
                <Botao
                  titulo={gates === null ? "Avaliar gates" : "Reavaliar gates"}
                  variante="secundario"
                  ocupado={ocupado}
                  aoTocar={() => void avaliar()}
                />
              </View>
              {podeEditar && <Botao
                titulo={
                  gates?.bloqueia
                    ? "Registrar como rejeitada"
                    : "Aceitar recepção"
                }
                ocupado={ocupado}
                aoTocar={() => void aceitar()}
              />}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const e = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cor.fundo },
  conteudo: { padding: espaco.md, paddingBottom: espaco.xl, gap: espaco.sm },
  titulo: { color: cor.textoForte, fontSize: fonte.grande, fontWeight: "800" },
  subtitulo: {
    color: cor.textoSuave,
    fontSize: fonte.normal,
    marginBottom: espaco.md,
  },
  secao: {
    color: cor.textoForte,
    fontSize: fonte.media,
    fontWeight: "800",
    marginTop: espaco.md,
  },
  secaoCartao: {
    color: cor.textoForte,
    fontSize: fonte.media,
    fontWeight: "800",
    marginBottom: espaco.md,
  },
  cartao: {
    backgroundColor: cor.superficie,
    borderWidth: 1,
    borderColor: cor.borda,
    borderRadius: raio.lg,
    padding: espaco.md,
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
  carga: {
    backgroundColor: cor.superficie,
    borderWidth: 1.5,
    borderColor: cor.borda,
    borderRadius: raio.lg,
    padding: espaco.md,
  },
  cargaMarcada: { borderColor: cor.acao, backgroundColor: cor.fundoSuave },
  cargaLinha: {
    minHeight: toque.alvo,
    flexDirection: "row",
    alignItems: "center",
    gap: espaco.sm,
  },
  textoFlex: { flex: 1 },
  romaneio: { color: cor.texto, fontSize: fonte.normal, fontWeight: "800" },
  nota: { color: cor.textoSuave, fontSize: fonte.pequena, lineHeight: 21 },
  relogio: { fontSize: fonte.normal, fontWeight: "800" },
  detalhes: {
    borderTopWidth: 1,
    borderTopColor: cor.borda,
    paddingTop: espaco.md,
  },
  rotulo: {
    color: cor.textoSuave,
    fontSize: fonte.pequena,
    marginBottom: espaco.sm,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: espaco.sm,
    marginBottom: espaco.md,
  },
  chip: {
    minHeight: toque.alvo,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: cor.borda,
    borderRadius: raio.md,
    paddingHorizontal: espaco.md,
  },
  chipAtivo: { backgroundColor: cor.acao, borderColor: cor.acao },
  chipTexto: { color: cor.texto, fontSize: fonte.pequena },
  chipTextoAtivo: { color: cor.acaoTexto, fontWeight: "700" },
  duasColunas: { flexDirection: "row", gap: espaco.sm },
  coluna: { flex: 1 },
  gate: {
    minHeight: toque.alvo,
    flexDirection: "row",
    alignItems: "center",
    gap: espaco.sm,
    borderBottomWidth: 1,
    borderBottomColor: cor.borda,
  },
  ponto: { width: 12, height: 12, borderRadius: 6 },
  gateNome: {
    width: 120,
    color: cor.texto,
    fontSize: fonte.pequena,
    fontWeight: "700",
  },
  gateDetalhe: {
    flex: 1,
    color: cor.textoSuave,
    fontSize: fonte.pequena,
    textAlign: "right",
  },
  bloqueio: {
    color: cor.erro,
    backgroundColor: cor.erroFundo,
    padding: espaco.md,
    borderRadius: raio.md,
    fontSize: fonte.pequena,
    fontWeight: "700",
    lineHeight: 21,
    marginVertical: espaco.md,
  },
});
