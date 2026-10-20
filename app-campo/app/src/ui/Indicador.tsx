/**
 * O cartão de indicador — o "KPI" que abre cada painel no VERO web.
 *
 * A hierarquia é a da identidade: rótulo pequeno e discreto em maiúsculas, o
 * número grande e monoespaçado como protagonista, e uma linha de detalhe
 * abaixo. O número alinha à direita quando fica sozinho, para a vista correr a
 * coluna sem tropeço.
 *
 * `tom` tinge só o número, nunca o cartão inteiro — cor de estado só onde há
 * estado, e sempre acompanhada do texto do detalhe, nunca a cor sozinha.
 */
import { StyleSheet, Text, View } from 'react-native';

import { cor, espaco, familia, fonte, raio, sombra } from '@/ui/tema';

type Tom = 'neutro' | 'ok' | 'alerta' | 'erro';

const TINTA: Record<Tom, string> = {
  neutro: cor.textoForte,
  ok: cor.ok,
  alerta: cor.alerta,
  erro: cor.erro,
};

export function Indicador({
  rotulo,
  valor,
  detalhe,
  tom = 'neutro',
}: {
  rotulo: string;
  valor: string;
  detalhe?: string;
  tom?: Tom;
}) {
  return (
    <View style={e.cartao}>
      <Text style={e.rotulo} numberOfLines={1}>
        {rotulo.toUpperCase()}
      </Text>
      <Text style={[e.valor, { color: TINTA[tom] }]} numberOfLines={1} adjustsFontSizeToFit>
        {valor}
      </Text>
      {detalhe != null && (
        <Text style={e.detalhe} numberOfLines={2}>
          {detalhe}
        </Text>
      )}
    </View>
  );
}

/** Duas colunas de indicadores, como a faixa que abre os painéis do site. */
export function GradeIndicadores({ children }: { children: React.ReactNode }) {
  return <View style={e.grade}>{children}</View>;
}

const e = StyleSheet.create({
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },
  cartao: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 150,
    backgroundColor: cor.superficie,
    borderWidth: 1,
    borderColor: cor.borda,
    borderRadius: raio.lg,
    padding: espaco.md,
    ...sombra.cartao,
  },
  rotulo: { color: cor.textoDesativado, fontFamily: familia.corpo, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  valor: { fontFamily: familia.numero, fontSize: 26, fontWeight: '700', marginTop: espaco.xs },
  detalhe: { color: cor.textoSuave, fontFamily: familia.corpo, fontSize: fonte.pequena, lineHeight: 19, marginTop: espaco.xs },
});
