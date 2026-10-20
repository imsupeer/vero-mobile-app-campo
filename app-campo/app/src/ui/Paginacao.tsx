/**
 * Paginação simples — "‹ Anterior · X–Y de Z · Próxima ›".
 *
 * Poucos itens por vez cabem melhor na tela pequena e poupam a lista de
 * desenhar centenas de cartões. Some sozinha quando tudo cabe numa página.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { cor, espaco, familia, fonte, raio, toque } from '@/ui/tema';

export function Paginacao({
  pagina,
  porPagina,
  total,
  aoTrocar,
}: {
  pagina: number;
  porPagina: number;
  total: number;
  aoTrocar: (pagina: number) => void;
}) {
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  if (total <= porPagina) return null;

  const paginaAtual = Math.min(pagina, totalPaginas - 1);
  const inicio = paginaAtual * porPagina + 1;
  const fim = Math.min((paginaAtual + 1) * porPagina, total);
  const primeira = paginaAtual <= 0;
  const ultima = paginaAtual >= totalPaginas - 1;

  return (
    <View style={e.barra}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Página anterior"
        disabled={primeira}
        onPress={() => aoTrocar(paginaAtual - 1)}
        style={[e.botao, primeira && e.inativo]}
      >
        <Text style={e.botaoTexto}>‹ Anterior</Text>
      </Pressable>
      <Text style={e.contagem}>
        {inicio}–{fim} de {total}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Próxima página"
        disabled={ultima}
        onPress={() => aoTrocar(paginaAtual + 1)}
        style={[e.botao, ultima && e.inativo]}
      >
        <Text style={e.botaoTexto}>Próxima ›</Text>
      </Pressable>
    </View>
  );
}

const e = StyleSheet.create({
  barra: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espaco.sm, marginTop: espaco.md },
  botao: { minHeight: toque.alvoPequeno, justifyContent: 'center', paddingHorizontal: espaco.md, borderRadius: raio.md, borderWidth: 1, borderColor: cor.borda, backgroundColor: cor.superficie },
  inativo: { opacity: 0.4 },
  botaoTexto: { color: cor.acao, fontFamily: familia.corpo, fontSize: fonte.pequena, fontWeight: '700' },
  contagem: { flex: 1, textAlign: 'center', color: cor.textoSuave, fontFamily: familia.numero, fontSize: fonte.pequena },
});
