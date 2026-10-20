/** Mostra a fazenda única vinculada ao tenant autenticado. */
import { StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useFazenda } from '@/fazenda/contexto';
import { cor, familia, fonte } from '@/ui/tema';

export function SeletorFazenda() {
  const { selecionada } = useFazenda();

  return (
    <View style={estilos.gatilho} accessibilityLabel={`Fazenda do tenant: ${selecionada ?? 'não identificada'}`}>
      <MaterialCommunityIcons name="sprout-outline" size={18} color={cor.acao} />
      <Text style={estilos.rotulo} numberOfLines={1} ellipsizeMode="tail">
        {selecionada ?? 'Fazenda não identificada'}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  gatilho: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: 170, minWidth: 0, paddingVertical: 6 },
  rotulo: { flexShrink: 1, minWidth: 0, color: cor.textoForte, fontFamily: familia.titulo, fontSize: fonte.normal, fontWeight: '800' },
});
