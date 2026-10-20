/**
 * Seletor de opção única em "chips".
 *
 * O mesmo padrão do novo apontamento, extraído para as telas operacionais do
 * Tier 1 reaproveitarem. Alvo grande, seleção visível, e a opção "Nenhum"
 * quando o campo é opcional.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { cor, espaco, fonte, raio, toque } from '@/ui/tema';

export type OpcaoSeletor = { id: number; nome: string };

export function Seletor({
  rotulo,
  opcoes,
  valor,
  aoMudar,
  permiteVazio = false,
  rotuloVazio = 'Nenhum',
}: {
  rotulo: string;
  opcoes: OpcaoSeletor[];
  valor: number | null;
  aoMudar: (id: number | null) => void;
  permiteVazio?: boolean;
  rotuloVazio?: string;
}) {
  return (
    <View style={e.grupo}>
      <Text style={e.rotulo}>{rotulo}</Text>
      <View style={e.opcoes}>
        {permiteVazio && (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: valor === null }}
            onPress={() => aoMudar(null)}
            style={[e.opcao, valor === null && e.opcaoAtiva]}
          >
            <Text style={[e.opcaoTexto, valor === null && e.opcaoTextoAtivo]}>{rotuloVazio}</Text>
          </Pressable>
        )}
        {opcoes.map((opcao) => (
          <Pressable
            key={opcao.id}
            accessibilityRole="button"
            accessibilityState={{ selected: valor === opcao.id }}
            onPress={() => aoMudar(opcao.id)}
            style={[e.opcao, valor === opcao.id && e.opcaoAtiva]}
          >
            <Text style={[e.opcaoTexto, valor === opcao.id && e.opcaoTextoAtivo]}>{opcao.nome}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** Versão para valores de texto (enums), como metodologia ou destino. */
export function SeletorTexto({
  rotulo,
  opcoes,
  valor,
  aoMudar,
}: {
  rotulo: string;
  opcoes: Array<{ valor: string; rotulo: string }>;
  valor: string;
  aoMudar: (valor: string) => void;
}) {
  return (
    <View style={e.grupo}>
      <Text style={e.rotulo}>{rotulo}</Text>
      <View style={e.opcoes}>
        {opcoes.map((opcao) => (
          <Pressable
            key={opcao.valor}
            accessibilityRole="button"
            accessibilityState={{ selected: valor === opcao.valor }}
            onPress={() => aoMudar(opcao.valor)}
            style={[e.opcao, valor === opcao.valor && e.opcaoAtiva]}
          >
            <Text style={[e.opcaoTexto, valor === opcao.valor && e.opcaoTextoAtivo]}>{opcao.rotulo}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const e = StyleSheet.create({
  grupo: { marginTop: espaco.md },
  rotulo: { color: cor.textoSuave, fontSize: fonte.pequena, fontWeight: '600', marginBottom: espaco.sm },
  opcoes: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },
  opcao: { minHeight: toque.alvo, justifyContent: 'center', backgroundColor: cor.superficie, borderColor: cor.borda, borderWidth: 1, borderRadius: raio.md, paddingHorizontal: espaco.md },
  opcaoAtiva: { backgroundColor: cor.acao, borderColor: cor.acao },
  opcaoTexto: { color: cor.texto, fontSize: fonte.pequena },
  opcaoTextoAtivo: { color: cor.acaoTexto, fontWeight: '700' },
});
