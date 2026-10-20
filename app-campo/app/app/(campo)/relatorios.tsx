import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useFocusEffect } from 'expo-router';

import { lerCache } from '@/db/banco';
import { ORDEM_CATEGORIAS, relatoriosDisponiveis } from '@/relatorios/catalogo';
import type { CategoriaRelatorio, Relatorio } from '@/relatorios/catalogo';
import { useSessao } from '@/sessao';
import { CabecalhoPagina } from '@/ui/componentes';
import { FaixaSinc } from '@/ui/FaixaSinc';
import { GradeIndicadores, Indicador } from '@/ui/Indicador';
import { cor, espaco, familia, fonte, raio, sombra, toque } from '@/ui/tema';

export default function Relatorios() {
  const { pode } = useSessao();
  const [contagens, setContagens] = useState<Record<string, number>>({});

  const relatorios = useMemo(
    () => relatoriosDisponiveis(pode),
    [pode],
  );

  useFocusEffect(
    useCallback(() => {
      void Promise.all(
        relatorios.map(async (relatorio) => {
          try {
            return [relatorio.id, (await lerCache<Record<string, unknown>>(relatorio.modulo)).length] as const;
          } catch {
            return [relatorio.id, 0] as const;
          }
        }),
      ).then((pares) => setContagens(Object.fromEntries(pares)));
    }, [relatorios]),
  );

  /* agrupa o catálogo por categoria, na ordem do site, mostrando só as seções
     com alguma consulta liberada para o perfil */
  const secoes = useMemo(() => {
    return ORDEM_CATEGORIAS.map((categoria) => ({
      categoria,
      itens: relatorios.filter((r) => r.categoria === categoria),
    })).filter((s) => s.itens.length > 0);
  }, [relatorios]);

  const totalRegistros = Object.values(contagens).reduce((s, n) => s + n, 0);

  return (
    <View style={e.tela}>
      <FaixaSinc />
      <ScrollView contentContainerStyle={e.conteudo}>
        <CabecalhoPagina
          etiqueta="Análise operacional"
          titulo="Relatórios"
          subtitulo="Consultas com os dados disponíveis no aparelho."
        />

        {relatorios.length > 0 && (
          <View style={e.indicadores}>
            <GradeIndicadores>
              <Indicador rotulo="Consultas" valor={String(relatorios.length)} detalhe="disponíveis no perfil" />
              <Indicador rotulo="Registros" valor={totalRegistros.toLocaleString('pt-BR')} detalhe="em cache no aparelho" />
            </GradeIndicadores>
          </View>
        )}

        <View style={e.aviso}>
          <View style={e.avisoIcone}>
            <MaterialCommunityIcons name="information-outline" size={22} color={cor.ok} />
          </View>
          <View style={e.textoFlex}>
            <Text style={e.avisoTitulo}>Somente consulta</Text>
            <Text style={e.avisoTexto}>
              Análises completas e documentos oficiais continuam disponíveis no VERO web.
            </Text>
          </View>
        </View>

        {secoes.map((secao) => (
          <View key={secao.categoria}>
            <Text style={e.sobreTitulo}>{secao.categoria.toUpperCase()}</Text>
            {secao.itens.map((relatorio) => (
              <CartaoRelatorio
                key={relatorio.id}
                relatorio={relatorio}
                quantidade={contagens[relatorio.id] ?? 0}
              />
            ))}
          </View>
        ))}

        {relatorios.length === 0 && (
          <View style={e.vazio}>
            <Text style={e.vazioTexto}>Nenhuma consulta disponível para as permissões deste perfil.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function CartaoRelatorio({ relatorio, quantidade }: { relatorio: Relatorio; quantidade: number }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/relatorio', params: { id: relatorio.id } })}
      style={({ pressed }) => [e.cartao, pressed && e.cartaoPressionado]}
    >
      <View style={e.icone}>
        <MaterialCommunityIcons name="chart-box-outline" size={24} color={cor.acao} />
      </View>
      <View style={e.textoFlex}>
        <Text style={e.cartaoTitulo}>{relatorio.titulo}</Text>
        <Text style={e.cartaoDetalhe}>{relatorio.descricao}</Text>
        <Text style={e.quantidade}>{quantidade.toLocaleString('pt-BR')} registro(s) no aparelho</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={26} color={cor.acao} />
    </Pressable>
  );
}

const e = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cor.fundo },
  conteudo: { padding: espaco.md, paddingBottom: espaco.xl },
  indicadores: { marginTop: espaco.md, marginBottom: espaco.sm },
  aviso: { flexDirection: 'row', gap: espaco.sm, backgroundColor: cor.okFundo, borderRadius: raio.md, padding: espaco.md, marginTop: espaco.sm },
  avisoIcone: { paddingTop: 2 },
  avisoTitulo: { color: cor.ok, fontSize: fonte.pequena, fontWeight: '800' },
  avisoTexto: { color: cor.texto, fontSize: fonte.pequena, lineHeight: 21, marginTop: espaco.xs },
  sobreTitulo: { color: cor.textoDesativado, fontSize: 12, fontWeight: '800', letterSpacing: 1.1, marginTop: espaco.xl, marginBottom: espaco.sm },
  cartao: { minHeight: 112, flexDirection: 'row', alignItems: 'center', gap: espaco.md, backgroundColor: cor.superficie, borderWidth: 1, borderColor: cor.borda, borderRadius: raio.lg, padding: espaco.md, marginBottom: espaco.sm, ...sombra.cartao },
  cartaoPressionado: { borderColor: cor.acaoApoio, backgroundColor: cor.fundoSuave },
  icone: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: cor.okFundo, borderRadius: raio.md },
  textoFlex: { flex: 1 },
  cartaoTitulo: { color: cor.textoForte, fontFamily: familia.titulo, fontSize: fonte.normal, fontWeight: '800' },
  cartaoDetalhe: { color: cor.textoSuave, fontSize: fonte.pequena, lineHeight: 21, marginTop: espaco.xs },
  quantidade: { color: cor.acao, fontFamily: familia.numero, fontSize: 13, fontWeight: '700', marginTop: espaco.sm },
  vazio: { minHeight: toque.alvo, backgroundColor: cor.superficie, borderRadius: raio.lg, padding: espaco.lg, marginTop: espaco.md },
  vazioTexto: { color: cor.textoSuave, fontSize: fonte.normal, lineHeight: 24 },
});
