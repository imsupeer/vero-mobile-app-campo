/**
 * Entrar.
 *
 * O visual segue a tela de acesso do VERO web: cartão branco sobre o fundo
 * teal, marca no alto, campos com sublinhado, botão de ação em maiúsculas e o
 * rodapé de acesso seguro. A referência é `docs/vero-identidade-visual/telas/
 * login/login.html` — a mesma tela do sistema, só o visual.
 *
 * O `dispositivo` é montado automaticamente a partir do aparelho — ninguém vai
 * digitar isso às cinco da manhã. Ele vira o nome do token no servidor, e é o
 * que permite revogar o acesso de um celular perdido sem derrubar a pessoa dos
 * outros.
 */
import { useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Device from 'expo-device';

import { ErroApi } from '@/api/cliente';
import { useSessao } from '@/sessao';
import { CampoAcesso } from '@/ui/CampoAcesso';
import { FundoAcesso } from '@/ui/FundoAcesso';
import { MarcaVero } from '@/ui/MarcaVero';
import { NoticiaAcesso } from '@/ui/NoticiaAcesso';
import { BotaoAcesso } from '@/ui/BotaoAcesso';
import { cor, espaco, familia, fonte } from '@/ui/tema';

/**
 * A mensagem que a pessoa lê quando o login falha.
 *
 * Traduz o código estável do erro para uma frase clara e com o próximo passo.
 * Nunca despeja o texto cru do servidor nem um código técnico: no meio do
 * válvula, "resposta_invalida" não ajuda ninguém. Cada caso diz o que houve e o
 * que fazer — e separa "senha errada" (culpa de digitação) de "servidor não
 * respondeu como esperado" (fala com o suporte), que pedem ações diferentes.
 */
function mensagemDeErro(e: unknown): string {
  if (!(e instanceof ErroApi)) return 'Não foi possível entrar. Tente de novo.';

  switch (e.codigo) {
    case 'credenciais_invalidas':
      return 'E-mail ou senha incorretos. Confira e tente de novo.';
    case 'muitas_tentativas':
      return 'Muitas tentativas seguidas. Aguarde um minuto e tente outra vez.';
    case 'sem_conexao':
      /* a primeira entrada é o único momento em que o app REALMENTE precisa de
         rede, e a pessoa tem de saber disso sem rodeio */
      return 'Sem conexão. A primeira entrada precisa de internet.';
    case 'host_nao_encontrado':
      return 'Não conseguimos falar com o servidor. Confira o código da empresa e a sua conexão — se persistir, fale com o suporte.';
    case 'resposta_invalida':
      return 'O servidor respondeu de um jeito inesperado. Isso costuma ser configuração do servidor, não a sua senha — fale com o suporte.';
    case 'sem_ambiente':
      return 'Informe o código da empresa antes de entrar.';
    default:
      return e.message?.trim() ? e.message : 'Não foi possível entrar. Tente de novo.';
  }
}

export default function Entrar() {
  const { entrar } = useSessao();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  /* a sacudida no erro: a mesma da tela web. Confirma que algo foi recusado
     sem precisar ler — o olho pega o movimento antes da palavra. */
  const tremor = useRef(new Animated.Value(0)).current;
  function sacudir() {
    tremor.setValue(0);
    Animated.sequence([
      Animated.timing(tremor, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(tremor, { toValue: -1, duration: 50, useNativeDriver: true }),
      Animated.timing(tremor, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(tremor, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }

  const nomeDoAparelho =
    [Device.manufacturer, Device.modelName].filter(Boolean).join(' ') || 'Aparelho sem nome';

  async function enviar() {
    setAviso(null);
    if (email.trim() === '' || senha === '') {
      setErro('Preencha usuário e senha para continuar.');
      sacudir();
      return;
    }
    setOcupado(true);
    setErro(null);
    try {
      await entrar(email.trim(), senha);
    } catch (e) {
      setErro(mensagemDeErro(e));
      sacudir();
    } finally {
      setOcupado(false);
    }
  }

  return (
    <FundoAcesso>
      <KeyboardAvoidingView style={e.tela} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={e.conteudo} keyboardShouldPersistTaps="handled">
          <Animated.View
            style={[
              e.cartao,
              { transform: [{ translateX: tremor.interpolate({ inputRange: [-1, 1], outputRange: [-6, 6] }) }] },
            ]}
          >
            <View style={e.marca}>
              <MarcaVero compacta />
            </View>

            <Text style={e.titulo}>Acessar</Text>
            <Text style={e.sub}>Gestão de dentro e fora da porteira</Text>

            {erro != null && <NoticiaAcesso tom="erro" texto={erro} />}
            {aviso != null && <NoticiaAcesso tom="info" texto={aviso} />}

            <View style={e.formulario}>
              <CampoAcesso
                rotulo="Usuário / E-mail"
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  setErro(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                placeholder="seu.email@fazenda.com.br"
                invalido={erro != null && email.trim() === ''}
              />
              <CampoAcesso
                rotulo="Senha"
                value={senha}
                onChangeText={(t) => {
                  setSenha(t);
                  setErro(null);
                }}
                senha
                textContentType="password"
                placeholder="••••••••"
                invalido={erro != null && senha === ''}
              />

              <Pressable
                accessibilityRole="button"
                hitSlop={10}
                style={e.esqueci}
                onPress={() =>
                  setAviso('Fale com o administrador da fazenda para redefinir a senha.')
                }
              >
                <Text style={e.esqueciTexto}>Esqueceu sua senha?</Text>
              </Pressable>

              <BotaoAcesso titulo="Acessar login" aoTocar={() => void enviar()} ocupado={ocupado} />
            </View>

            <View style={e.rodape}>
              <View style={e.ponto} />
              <Text style={e.rodapeMono}>ACESSO SEGURO</Text>
              <Text style={e.rodapeSep}>·</Text>
              <Text style={e.rodapeTexto}>VERO by Origo © 2026</Text>
            </View>
          </Animated.View>

          <Text style={e.aparelho}>Este aparelho: {nomeDoAparelho}</Text>
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
  titulo: { fontFamily: familia.titulo, fontSize: fonte.grande, fontWeight: '800', color: '#17232B', letterSpacing: -0.5 },
  sub: { fontSize: fonte.pequena, color: '#5A6B74', marginTop: espaco.xs },
  formulario: { marginTop: espaco.lg },
  esqueci: { alignSelf: 'flex-end', paddingVertical: espaco.xs, marginTop: -espaco.xs, marginBottom: espaco.xs },
  esqueciTexto: { color: cor.acao, fontFamily: familia.corpo, fontSize: fonte.pequena, fontWeight: '600' },
  rodape: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: espaco.lg },
  ponto: { width: 6, height: 6, borderRadius: 3, backgroundColor: cor.ok },
  rodapeMono: { fontFamily: familia.numero, fontSize: 11, color: '#8FA0A6', letterSpacing: 0.5 },
  rodapeSep: { color: '#C7D2D6' },
  rodapeTexto: { fontFamily: familia.corpo, fontSize: 11, color: '#8FA0A6' },
  aparelho: { fontSize: fonte.pequena, color: cor.textoLateral, textAlign: 'center', marginTop: espaco.lg },
});
