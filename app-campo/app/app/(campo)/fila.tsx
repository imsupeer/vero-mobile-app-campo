/**
 * A fila de envio.
 *
 * Tela de verdade, não um ícone. Mostra o que ainda não subiu, deixa tentar
 * de novo e mostra o que o servidor recusou, com o motivo.
 *
 * Sem ela, a pessoa não tem como saber se o trabalho da manhã está salvo — e
 * vai perguntar isso todo dia, para alguém que também não sabe.
 */
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { descartar, marcar, todos as lerTodos } from "@/sinc/fila";
import type { ItemFila } from "@/sinc/fila";
import { useSinc } from "@/sinc/useSinc";
import { Botao, Vazio } from "@/ui/componentes";
import { cor, espaco, fonte, raio } from "@/ui/tema";

export default function Fila() {
  const { rodando, agora } = useSinc();
  const [itens, setItens] = useState<ItemFila[]>([]);
  const [repetindo, setRepetindo] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    /* recusados primeiro: são os que precisam de ação da pessoa. Os
       pendentes se resolvem sozinhos quando houver rede. */
    const tudo = (await lerTodos()).filter((i) => i.estado !== "confirmado");
    setItens([
      ...tudo.filter((i) => i.estado === "falha"),
      ...tudo.filter((i) => i.estado !== "falha"),
    ]);
  }, []);

  const tentarDeNovo = async (clientUuid: string) => {
    setRepetindo(clientUuid);
    try {
      await marcar(clientUuid, "pendente");
      await agora();
      await carregar();
    } catch (erro) {
      Alert.alert(
        "Não foi possível reenviar",
        erro instanceof Error ? erro.message : "Tente novamente.",
      );
    } finally {
      setRepetindo(null);
    }
  };

  const confirmarDescarte = (clientUuid: string) => {
    Alert.alert(
      "Descartar este registro?",
      "O registro recusado e seus anexos locais serão apagados deste aparelho e não poderão ser enviados depois.",
      [
        { text: "Manter", style: "cancel" },
        {
          text: "Descartar",
          style: "destructive",
          onPress: () => {
            void descartar(clientUuid)
              .then(carregar)
              .catch((erro: unknown) =>
                Alert.alert(
                  "Não foi possível descartar",
                  erro instanceof Error ? erro.message : "Tente novamente.",
                ),
              );
          },
        },
      ],
    );
  };

  useEffect(() => {
    void carregar();
  }, [carregar, rodando]);

  if (itens.length === 0) {
    return (
      <Vazio
        titulo="Tudo enviado"
        detalhe="Nenhum registro aguardando. O que você lançar aparece aqui até subir para o servidor."
      />
    );
  }

  return (
    <FlatList
      data={itens}
      keyExtractor={(i) => i.clientUuid}
      contentContainerStyle={{ padding: espaco.md }}
      refreshControl={
        <RefreshControl
          refreshing={rodando}
          onRefresh={() => void agora()}
          tintColor={cor.acao}
        />
      }
      ListHeaderComponent={
        <View style={{ marginBottom: espaco.md }}>
          <Botao
            titulo="Tentar enviar agora"
            aoTocar={() => void agora()}
            ocupado={rodando}
            variante="secundario"
          />
        </View>
      }
      renderItem={({ item }) => {
        const recusado = item.estado === "falha";

        return (
          <View style={[e.cartao, recusado && e.cartaoRecusado]}>
            <Text style={e.tipo}>{rotuloTipo(item.tipo)}</Text>
            <Text style={e.detalhe}>{resumo(item)}</Text>

            {recusado ? (
              <>
                {/* o motivo VAI na tela. "Falha ao enviar" sem dizer o quê
                    transforma um campo mal preenchido em mistério, e a pessoa
                    não tem a quem perguntar no meio da válvula. */}
                <Text style={e.erro}>
                  {item.erro ?? "Recusado pelo servidor."}
                </Text>
                <View style={e.acoes}>
                  <Botao
                    titulo="Tentar de novo"
                    variante="secundario"
                    desativado={rodando}
                    ocupado={repetindo === item.clientUuid}
                    aoTocar={() => void tentarDeNovo(item.clientUuid)}
                  />
                  <Botao
                    titulo="Descartar"
                    variante="secundario"
                    aoTocar={() => confirmarDescarte(item.clientUuid)}
                  />
                </View>
              </>
            ) : (
              <Text style={e.aguardando}>
                Aguardando envio
                {item.tentativas > 0 ? ` · ${item.tentativas} tentativas` : ""}
              </Text>
            )}
          </View>
        );
      }}
    />
  );
}

function rotuloTipo(tipo: string): string {
  const rotulos: Record<string, string> = {
    apontamento: "Apontamento",
    anexo: "Anexo",
    atividade_status: "Atualização de atividade",
    aplicacao_confirmar: "Execução de aplicação",
    aplicacao_assinar: "Assinatura de aplicação",
    alerta_reconhecer: "Reconhecimento de alerta",
    conclusao_apontamento: "Conclusão de apontamento",
    producao_apontamento: "Produção do apontamento",
    monitoramento: "Monitoramento MIP/MID",
    monitoramentos_enviar: "Envio de monitoramentos",
    irrigacao_apontamento: "Apontamento de irrigação",
    colheita: "Colheita",
    colheita_realizado: "Realizado da colheita",
    carga_colheita: "Carga de colheita",
    maquina_horimetro: "Horímetro",
    maquina_abastecimento: "Abastecimento",
    compra_aprovacao: "Aprovação de compra",
    compra_recebimento: "Recebimento de compra",
    compra_solicitacao: "Solicitação de compra",
    recebimento: "Recebimento",
    ph_beep: "Bipagem do Packing",
    ph_recepcao: "Recepção do Packing",
    analise_nutricao_solo: "Análise de solo",
    analise_nutricao_foliar: "Análise foliar",
  };
  return rotulos[tipo] ?? tipo.replace(/_/g, " ");
}

function resumo(item: ItemFila): string {
  let c: Record<string, unknown>;
  try {
    c = JSON.parse(item.payload) as Record<string, unknown>;
  } catch {
    return "Não foi possível ler os detalhes locais deste registro.";
  }
  const data =
    c.data ??
    c.data_apontamento ??
    c.data_monitoramento ??
    c.data_carga ??
    c.data_colheita;
  const local =
    c.romaneio ??
    c.valvula ??
    c.talhao_nome ??
    (c.talhao_id != null ? `Válvula ${c.talhao_id}` : null);
  const partes = [
    typeof data === "string" ? data.slice(0, 10) : null,
    typeof local === "string" ? local : null,
    typeof c.quantidade === "number"
      ? `${c.quantidade} ${String(c.unidade ?? "")}`.trim()
      : null,
    typeof c.horimetro === "number" ? `${c.horimetro} h` : null,
    typeof c.litros === "number" ? `${c.litros} L` : null,
    typeof c.n_contentores === "number"
      ? `${c.n_contentores} contentor(es)`
      : null,
  ].filter((p): p is string => p !== null);

  return partes.length > 0 ? partes.join(" · ") : "Sem detalhes";
}

const e = StyleSheet.create({
  cartao: {
    backgroundColor: cor.fundo,
    borderWidth: 1,
    borderColor: cor.borda,
    borderRadius: raio.md,
    padding: espaco.md,
    marginBottom: espaco.sm,
  },
  cartaoRecusado: { borderColor: cor.erro },
  tipo: { fontSize: fonte.normal, fontWeight: "600", color: cor.texto },
  detalhe: {
    fontSize: fonte.pequena,
    color: cor.textoSuave,
    marginTop: espaco.xs,
  },
  erro: { fontSize: fonte.pequena, color: cor.erro, marginTop: espaco.sm },
  aguardando: {
    fontSize: fonte.pequena,
    color: cor.alerta,
    marginTop: espaco.sm,
  },
  acoes: { gap: espaco.sm, marginTop: espaco.md },
});
