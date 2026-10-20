/**
 * O aviso das telas de acesso: erro, informação ou sucesso.
 *
 * Fundo suave da cor do estado e um ícone à esquerda — nunca a cor sozinha,
 * porque sob sol forte e para quem não distingue vermelho de verde a cor some,
 * mas o ícone e a palavra ficam.
 */
import { StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { espaco, familia, fonte } from '@/ui/tema';

type Tom = 'erro' | 'info' | 'ok';

const PALETA: Record<Tom, { fundo: string; tinta: string; icone: React.ComponentProps<typeof MaterialCommunityIcons>['name'] }> = {
  erro: { fundo: '#FAE6E3', tinta: '#8F2A20', icone: 'alert-circle-outline' },
  info: { fundo: '#EDF3F4', tinta: '#31555A', icone: 'information-outline' },
  ok: { fundo: '#DCEFEB', tinta: '#0A5C53', icone: 'check-circle-outline' },
};

export function NoticiaAcesso({ tom, texto }: { tom: Tom; texto: string }) {
  const p = PALETA[tom];
  return (
    <View style={[e.caixa, { backgroundColor: p.fundo }]} accessibilityLiveRegion="polite">
      <MaterialCommunityIcons name={p.icone} size={18} color={p.tinta} style={e.icone} />
      <Text style={[e.texto, { color: p.tinta }]}>{texto}</Text>
    </View>
  );
}

const e = StyleSheet.create({
  caixa: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, borderRadius: 10, padding: 11, marginTop: espaco.md },
  icone: { marginTop: 1 },
  texto: { flex: 1, fontFamily: familia.corpo, fontSize: fonte.pequena, lineHeight: 20 },
});
