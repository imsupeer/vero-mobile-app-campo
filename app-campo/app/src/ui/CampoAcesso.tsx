/**
 * Campo das telas de acesso.
 *
 * Diferente do `Campo` do resto do aplicativo: aqui o traço é embaixo, não uma
 * caixa. É o desenho da tela de acesso do VERO web — rótulo firme, linha fina
 * que acende no teal ao focar, e o olho para revelar a senha.
 */
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import type { TextInputProps } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { cor, espaco, familia, fonte, toque } from '@/ui/tema';

export function CampoAcesso({
  rotulo,
  senha = false,
  invalido = false,
  ...resto
}: TextInputProps & { rotulo: string; senha?: boolean; invalido?: boolean }) {
  const [focado, setFocado] = useState(false);
  const [revelar, setRevelar] = useState(false);

  const corLinha = invalido ? cor.erro : focado ? cor.acao : '#DFE5E7';

  return (
    <View style={e.campo}>
      <Text style={e.rotulo}>{rotulo}</Text>
      <View style={[e.caixa, { borderBottomColor: corLinha }]}>
        <TextInput
          style={e.entrada}
          placeholderTextColor="#A7B3B8"
          secureTextEntry={senha && !revelar}
          onFocus={() => setFocado(true)}
          onBlur={() => setFocado(false)}
          {...resto}
        />
        {senha && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revelar ? 'Ocultar senha' : 'Mostrar senha'}
            hitSlop={10}
            onPress={() => setRevelar((v) => !v)}
            style={e.olho}
          >
            <MaterialCommunityIcons
              name={revelar ? 'eye-off-outline' : 'eye-outline'}
              size={21}
              color={cor.textoSuave}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const e = StyleSheet.create({
  campo: { marginBottom: espaco.md },
  rotulo: { fontFamily: familia.corpo, fontSize: fonte.pequena, fontWeight: '700', color: '#17232B', marginBottom: espaco.xs },
  caixa: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1.5, minHeight: toque.alvo },
  entrada: { flex: 1, paddingVertical: espaco.sm, fontSize: fonte.normal, color: '#17232B', fontFamily: familia.corpo },
  olho: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
