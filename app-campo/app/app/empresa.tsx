/**
 * O código da empresa.
 *
 * Primeira tela na primeira abertura. O sistema é multiempresa e cada cliente
 * tem o seu endereço; o código é o que monta esse endereço no aparelho. Divide
 * o visual de acesso com a tela de login (fundo teal, cartão branco, rodapé).
 *
 * Detalhe que parece pequeno e não é: quando o código está errado, a mensagem
 * diz **"código não encontrado"**, e não "sem conexão". Confundir os dois faz
 * o operador apagar uma configuração correta no meio da válvula achando que o
 * problema é o sinal — e aí ele não consegue mais nem entrar. Quem separa os
 * dois casos é o `cliente.ts`, consultando o estado da rede antes de decidir.
 */
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { gravarCodigoEmpresa } from '@/api/ambiente';
import { useSessao } from '@/sessao';
import { BotaoAcesso } from '@/ui/BotaoAcesso';
import { CampoAcesso } from '@/ui/CampoAcesso';
import { FundoAcesso } from '@/ui/FundoAcesso';
import { MarcaVero } from '@/ui/MarcaVero';
import { cor, espaco, familia, fonte } from '@/ui/tema';

export default function Empresa() {
  const { conferirAmbiente } = useSessao();
  const [codigo, setCodigo] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function salvar() {
    setOcupado(true);
    try {
      await gravarCodigoEmpresa(codigo);
      await conferirAmbiente();
    } finally {
      setOcupado(false);
    }
  }

  return (
    <FundoAcesso>
      <KeyboardAvoidingView style={e.tela} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={e.conteudo} keyboardShouldPersistTaps="handled">
          <View style={e.cartao}>
            <View style={e.marca}>
              <MarcaVero compacta />
            </View>

            <Text style={e.etiqueta}>CONFIGURAÇÃO INICIAL</Text>
            <Text style={e.titulo}>Código da empresa</Text>
            <Text style={e.sub}>Você digita isto uma vez só. É o suporte que informa o código.</Text>

            <View style={e.formulario}>
              <CampoAcesso
                rotulo="Código"
                value={codigo}
                onChangeText={setCodigo}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="ex.: fazendaboavista"
              />
              <BotaoAcesso
                titulo="Continuar"
                aoTocar={() => void salvar()}
                ocupado={ocupado}
              />
            </View>

            <View style={e.rodape}>
              <View style={e.ponto} />
              <Text style={e.rodapeMono}>ACESSO SEGURO</Text>
              <Text style={e.rodapeSep}>·</Text>
              <Text style={e.rodapeTexto}>VERO by Origo © 2026</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </FundoAcesso>
  );
}

const e = StyleSheet.create({
  tela: { flex: 1 },
  conteudo: { flexGrow: 1, justifyContent: 'center', padding: espaco.md },
  cartao: {
    backgroundColor: cor.superficie,
    borderRadius: 18,
    padding: espaco.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.35,
    shadowRadius: 40,
    elevation: 12,
  },
  marca: { alignItems: 'flex-end', marginBottom: espaco.sm },
  etiqueta: { color: cor.textoDesativado, fontFamily: familia.corpo, fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  titulo: { fontFamily: familia.titulo, fontSize: fonte.grande, fontWeight: '800', color: '#17232B', marginTop: espaco.xs, letterSpacing: -0.5 },
  sub: { fontSize: fonte.pequena, color: '#5A6B74', marginTop: espaco.xs, lineHeight: 21 },
  formulario: { marginTop: espaco.lg },
  rodape: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: espaco.lg },
  ponto: { width: 6, height: 6, borderRadius: 3, backgroundColor: cor.ok },
  rodapeMono: { fontFamily: familia.numero, fontSize: 11, color: '#8FA0A6', letterSpacing: 0.5 },
  rodapeSep: { color: '#C7D2D6' },
  rodapeTexto: { fontFamily: familia.corpo, fontSize: 11, color: '#8FA0A6' },
});
