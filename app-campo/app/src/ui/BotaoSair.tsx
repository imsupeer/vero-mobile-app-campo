import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet } from 'react-native';

import { ErroApi } from '@/api/cliente';
import { useSessao } from '@/sessao';
import { cor, toque } from '@/ui/tema';

export function BotaoSair() {
  const { sair } = useSessao();
  const [ocupado, setOcupado] = useState(false);

  async function executar(forcar = false) {
    if (ocupado) return;
    setOcupado(true);

    try {
      await sair(forcar);
    } catch (erro) {
      if (erro instanceof ErroApi && erro.codigo === 'fila_pendente') {
        Alert.alert(
          'Há registros não enviados',
          'Sair agora apaga a fila deste aparelho. Esses registros não poderão ser recuperados.',
          [
            { text: 'Continuar no app', style: 'cancel' },
            { text: 'Sair e apagar', style: 'destructive', onPress: () => void executar(true) },
          ],
        );
      } else {
        Alert.alert('Não foi possível sair', erro instanceof Error ? erro.message : 'Tente novamente.');
      }
    } finally {
      setOcupado(false);
    }
  }

  function confirmar() {
    Alert.alert(
      'Sair do aplicativo?',
      'Você precisará informar suas credenciais novamente para entrar.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: () => void executar() },
      ],
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Sair do aplicativo"
      accessibilityState={{ disabled: ocupado, busy: ocupado }}
      disabled={ocupado}
      hitSlop={4}
      onPress={confirmar}
      style={({ pressed }) => [e.botao, pressed && e.pressionado]}
    >
      {ocupado
        ? <ActivityIndicator size="small" color={cor.acao} />
        : <MaterialCommunityIcons name="logout" size={24} color={cor.acao} />}
    </Pressable>
  );
}

const e = StyleSheet.create({
  botao: {
    width: toque.alvo,
    height: toque.alvo,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
  },
  pressionado: { backgroundColor: cor.campo },
});
