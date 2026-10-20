/**
 * O botão de ação das telas de acesso.
 *
 * Teal cheio, texto em maiúsculas com espaçamento largo e a seta apontando o
 * caminho — o mesmo `ACESSAR LOGIN →` da tela web. Encolhe ao tocar, como todo
 * botão do aplicativo, porque sem resposta imediata a pessoa toca de novo.
 */
import { useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { cor, familia, movimento } from '@/ui/tema';

export function BotaoAcesso({
  titulo,
  aoTocar,
  ocupado = false,
}: {
  titulo: string;
  aoTocar: () => void;
  ocupado?: boolean;
}) {
  const escala = useRef(new Animated.Value(1)).current;
  const animar = (para: number, duracao: number) =>
    Animated.timing(escala, { toValue: para, duration: duracao, useNativeDriver: true }).start();

  return (
    <Animated.View style={{ transform: [{ scale: escala }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ busy: ocupado }}
        disabled={ocupado}
        onPressIn={() => animar(movimento.pressao, movimento.rapido)}
        onPressOut={() => animar(1, movimento.normal)}
        onPress={aoTocar}
        style={[e.botao, ocupado && { opacity: 0.7 }]}
      >
        {ocupado ? (
          <ActivityIndicator color={cor.acaoTexto} />
        ) : (
          <>
            <Text style={e.texto}>{titulo.toUpperCase()}</Text>
            <MaterialCommunityIcons name="arrow-right" size={18} color={cor.acaoTexto} />
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

const e = StyleSheet.create({
  botao: {
    minHeight: 52,
    borderRadius: 11,
    backgroundColor: cor.acao,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 6,
  },
  texto: { color: cor.acaoTexto, fontFamily: familia.corpo, fontSize: 13, fontWeight: '700', letterSpacing: 1.8 },
});
