/**
 * A faixa de sincronização.
 *
 * Fica no topo de toda tela de lista. É a resposta à única pergunta que o
 * operador faz todo dia: "o que eu lancei já subiu?".
 *
 * Ela só aparece quando há o que dizer. Faixa permanente vira parte do fundo
 * e ninguém lê — inclusive no dia em que ela estiver avisando de um problema.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { falhaDePermissao, motivoFalhaLeitura, rotuloModulo } from '@/sinc/diagnostico';
import { useSinc } from '@/sinc/useSinc';
import { cor, espaco, fonte } from '@/ui/tema';

export function FaixaSinc() {
  const { rodando, pendentes, falhas, ultima } = useSinc();
  const [diagnosticoAberto, setDiagnosticoAberto] = useState(false);

  const falhasLeitura = (ultima?.falhasLeitura ?? []).filter((item) => !falhaDePermissao(item));
  const semRede = falhasLeitura.some((item) => item.codigo === 'sem_conexao');
  const temFila = pendentes > 0 || falhas > 0;

  /* 403 é comum quando o perfil não usa um módulo; não o tratamos como falha
     técnica nem mostramos um aviso repetitivo ao operador. */
  if (!temFila && falhasLeitura.length === 0) return null;

  const enviando = rodando && pendentes > 0;
  const textoFila = enviando
    ? 'Enviando…'
    : falhas > 0
      ? `${falhas} ${falhas === 1 ? 'registro recusado' : 'registros recusados'} — toque para ver`
      : pendentes > 0
        ? `${pendentes} ${pendentes === 1 ? 'registro aguardando' : 'registros aguardando'} envio`
        : 'Sem conexão. Os registros sobem quando houver rede.';

  const tom = falhas > 0 ? 'erro' : temFila || semRede ? 'alerta' : 'neutro';
  const fundo = tom === 'erro' ? '#FBEAE7' : tom === 'alerta' ? '#FCF3E0' : cor.fundoSuave;
  const tinta = tom === 'erro' ? cor.erro : tom === 'alerta' ? cor.alerta : cor.textoSuave;

  return (
    <View style={[e.faixa, { backgroundColor: fundo }]}>
      {temFila && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir a fila de envio"
          onPress={() => router.push('/(campo)/fila')}
          style={e.linha}
        >
          <Text style={[e.texto, { color: tinta }]} numberOfLines={1}>{textoFila}</Text>
          {(pendentes > 0 || falhas > 0) && <Text style={[e.ver, { color: tinta }]}>ver fila</Text>}
        </Pressable>
      )}

      {falhasLeitura.length > 0 && (
        <View style={temFila && e.linhaFalha}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: diagnosticoAberto }}
            accessibilityLabel={`${falhasLeitura.length} consulta(s) não atualizada(s). Toque para ver os detalhes.`}
            onPress={() => setDiagnosticoAberto((aberto) => !aberto)}
            style={e.linha}
          >
            <Text style={[e.texto, { color: tinta }]} numberOfLines={diagnosticoAberto ? undefined : 1}>
              {rodando ? 'Atualizando consultas…' : `${falhasLeitura.length} consulta(s) não atualizada(s)`}
            </Text>
            <Text style={[e.ver, { color: tinta }]}>{diagnosticoAberto ? 'ocultar' : 'detalhes'}</Text>
          </Pressable>
          {diagnosticoAberto && (
            <View style={e.detalhes}>
              {falhasLeitura.map((item) => (
                <Text key={`${item.modulo}:${item.codigo}`} style={[e.detalhe, { color: tinta }]}>
                  {rotuloModulo(item.modulo)}: {motivoFalhaLeitura(item.codigo)}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const e = StyleSheet.create({
  faixa: { paddingVertical: espaco.sm, paddingHorizontal: espaco.md },
  linha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  linhaFalha: { borderTopWidth: 1, borderTopColor: '#D8CBAF', marginTop: espaco.xs, paddingTop: espaco.xs },
  texto: { fontSize: fonte.pequena, flexShrink: 1 },
  ver: { fontSize: fonte.pequena, fontWeight: '600', marginLeft: espaco.sm },
  detalhes: { paddingTop: espaco.xs, gap: 3 },
  detalhe: { fontSize: fonte.pequena, lineHeight: 19 },
});
