/**
 * Os componentes de base.
 *
 * Poucos, e todos pensados para a mão de quem está no campo: alvo grande,
 * resposta imediata ao toque, texto legível sob sol.
 */
import { createElement, useRef, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { TextInputProps } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { dataLocalDaIso, dataLocalParaIso, formatarDataPtBr } from '@/ui/data';
import { cor, espaco, familia, fonte, movimento, raio, sombra, toque } from '@/ui/tema';

export function CabecalhoPagina({
  titulo,
  subtitulo,
  etiqueta,
  acao,
}: {
  titulo: string;
  subtitulo?: string;
  etiqueta?: string;
  acao?: ReactNode;
}) {
  return (
    <View style={e.cabecalhoPagina}>
      <View style={e.cabecalhoTexto}>
        {etiqueta != null && <Text style={e.sobretitulo}>{etiqueta}</Text>}
        <Text style={e.tituloPagina}>{titulo}</Text>
        {subtitulo != null && <Text style={e.subtituloPagina}>{subtitulo}</Text>}
      </View>
      {acao != null && <View style={e.cabecalhoAcao}>{acao}</View>}
    </View>
  );
}

export function TituloSecao({ children }: { children: ReactNode }) {
  return <Text style={e.tituloSecao}>{children}</Text>;
}

export function Cartao({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[e.cartao, style]}>{children}</View>;
}

/**
 * Botão.
 *
 * O encolhimento ao tocar não é enfeite: é a confirmação de que o aparelho
 * ouviu. Num celular lento, sem essa resposta imediata, a pessoa acha que
 * não pegou e toca de novo — e lança o apontamento duas vezes.
 */
export function Botao({
  titulo,
  aoTocar,
  ocupado = false,
  desativado = false,
  variante = 'principal',
}: {
  titulo: string;
  aoTocar: () => void;
  ocupado?: boolean;
  desativado?: boolean;
  variante?: 'principal' | 'secundario';
}) {
  const escala = useRef(new Animated.Value(1)).current;
  const inativo = desativado || ocupado;
  const principal = variante === 'principal';

  const animar = (para: number, duracao: number) =>
    Animated.timing(escala, { toValue: para, duration: duracao, useNativeDriver: true }).start();

  return (
    <Animated.View style={{ transform: [{ scale: escala }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: inativo, busy: ocupado }}
        disabled={inativo}
        onPressIn={() => animar(movimento.pressao, movimento.rapido)}
        onPressOut={() => animar(1, movimento.normal)}
        onPress={aoTocar}
        style={[
          e.botao,
          principal ? e.botaoPrincipal : e.botaoSecundario,
          inativo && e.botaoInativo,
        ]}
      >
        {ocupado ? (
          <ActivityIndicator color={principal ? cor.acaoTexto : cor.acao} />
        ) : (
          <Text style={[e.botaoTexto, !principal && { color: cor.acao }]}>{titulo}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

/** Campo de texto, com rótulo sempre visível e erro embaixo. */
export function Campo({
  rotulo,
  erro,
  style,
  ...resto
}: TextInputProps & { rotulo: string; erro?: string | null }) {
  return (
    <View style={{ marginBottom: espaco.md }}>
      <Text style={e.rotulo}>{rotulo}</Text>
      <TextInput
        style={[e.entrada, erro != null && e.entradaComErro, style]}
        placeholderTextColor={cor.textoSuave}
        {...resto}
      />
      {erro != null && <Text style={e.erroTexto}>{erro}</Text>}
    </View>
  );
}

/** Campo de data com seletor nativo; mantém `AAAA-MM-DD` no estado e na API. */
export function CampoData({
  rotulo,
  value,
  onChangeText,
  erro,
}: {
  rotulo: string;
  value: string;
  onChangeText: (valor: string) => void;
  erro?: string | null;
}) {
  const [pickerAberto, setPickerAberto] = useState(false);
  const [rascunho, setRascunho] = useState<Date>(() => dataLocalDaIso(value) ?? new Date());

  function abrirPicker() {
    const dataAtual = dataLocalDaIso(value) ?? new Date();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: dataAtual,
        mode: 'date',
        display: 'default',
        onValueChange: (_evento, selecionada) => onChangeText(dataLocalParaIso(selecionada)),
      });
      return;
    }

    setRascunho(dataAtual);
    setPickerAberto(true);
  }

  return (
    <View style={{ marginBottom: espaco.md }}>
      <Text style={e.rotulo}>{rotulo}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${rotulo}: ${formatarDataPtBr(value)}`}
        accessibilityHint="Abre o calendário para escolher uma data"
        onPress={abrirPicker}
        style={({ pressed }) => [e.entradaData, erro != null && e.entradaComErro, pressed && e.entradaDataPressionada]}
      >
        <Text style={[e.textoData, dataLocalDaIso(value) === null && e.placeholderData]}>
          {formatarDataPtBr(value)}
        </Text>
        <MaterialCommunityIcons name="calendar-month-outline" size={22} color={cor.acao} />
      </Pressable>
      {erro != null && <Text style={e.erroTexto}>{erro}</Text>}

      {Platform.OS === 'ios' && (
        <Modal visible={pickerAberto} transparent animationType="slide" onRequestClose={() => setPickerAberto(false)}>
          <View style={e.dateModal}>
            <Pressable accessibilityRole="button" accessibilityLabel="Fechar calendário" style={StyleSheet.absoluteFill} onPress={() => setPickerAberto(false)} />
            <View style={e.dateModalCard}>
              <View style={e.dateModalHeader}>
                <Pressable accessibilityRole="button" onPress={() => setPickerAberto(false)} style={e.dateModalAcao}>
                  <Text style={e.dateModalCancelar}>Cancelar</Text>
                </Pressable>
                <Text style={e.dateModalTitulo}>Escolha uma data</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => { onChangeText(dataLocalParaIso(rascunho)); setPickerAberto(false); }}
                  style={e.dateModalAcao}
                >
                  <Text style={e.dateModalConfirmar}>Usar</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={rascunho}
                mode="date"
                display="spinner"
                locale="pt-BR"
                onValueChange={(_evento, selecionada) => setRascunho(selecionada)}
                textColor={cor.texto}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

/** Campo de horário com seletor nativo; mantém `HH:MM` no estado e na API. */
export function CampoHora({
  rotulo,
  value,
  onChangeText,
}: {
  rotulo: string;
  value: string;
  onChangeText: (valor: string) => void;
}) {
  const [pickerAberto, setPickerAberto] = useState(false);
  const [rascunho, setRascunho] = useState(() => dataLocalDaHora(value));

  function abrirPicker() {
    const horarioAtual = dataLocalDaHora(value);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: horarioAtual,
        mode: 'time',
        display: 'clock',
        is24Hour: true,
        onValueChange: (_evento, selecionada) => {
          if (selecionada != null) onChangeText(formatarHora(selecionada));
        },
      });
      return;
    }

    setRascunho(horarioAtual);
    setPickerAberto(true);
  }

  if (Platform.OS === 'web') {
    return (
      <View style={{ marginBottom: espaco.md }}>
        <Text style={e.rotulo}>{rotulo}</Text>
        <View style={e.entradaData}>
          {createElement('input', {
            type: 'time',
            value,
            'aria-label': rotulo,
            onChange: (evento: ChangeEvent<HTMLInputElement>) => onChangeText(evento.target.value),
            style: {
              flex: 1,
              minWidth: 0,
              height: '100%',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: cor.texto,
              fontFamily: familia.corpo,
              fontSize: fonte.normal,
            },
          })}
        </View>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: espaco.md }}>
      <Text style={e.rotulo}>{rotulo}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${rotulo}: ${value || 'Selecionar horário'}`}
        accessibilityHint="Abre o seletor para escolher um horário"
        onPress={abrirPicker}
        style={({ pressed }) => [e.entradaData, pressed && e.entradaDataPressionada]}
      >
        <Text style={[e.textoData, value === '' && e.placeholderData]}>
          {value || 'Selecionar horário'}
        </Text>
        <MaterialCommunityIcons name="clock-outline" size={22} color={cor.acao} />
      </Pressable>

      {Platform.OS === 'ios' && (
        <Modal visible={pickerAberto} transparent animationType="slide" onRequestClose={() => setPickerAberto(false)}>
          <View style={e.dateModal}>
            <Pressable accessibilityRole="button" accessibilityLabel="Fechar seletor de horário" style={StyleSheet.absoluteFill} onPress={() => setPickerAberto(false)} />
            <View style={e.dateModalCard}>
              <View style={e.dateModalHeader}>
                <Pressable accessibilityRole="button" onPress={() => setPickerAberto(false)} style={e.dateModalAcao}>
                  <Text style={e.dateModalCancelar}>Cancelar</Text>
                </Pressable>
                <Text style={e.dateModalTitulo}>Escolha um horário</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => { onChangeText(formatarHora(rascunho)); setPickerAberto(false); }}
                  style={e.dateModalAcao}
                >
                  <Text style={e.dateModalConfirmar}>Usar</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={rascunho}
                mode="time"
                display="spinner"
                locale="pt-BR"
                is24Hour
                onValueChange={(_evento, selecionada) => { if (selecionada != null) setRascunho(selecionada); }}
                textColor={cor.texto}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

function dataLocalDaHora(valor: string): Date {
  const data = new Date();
  const partes = /^(\d{2}):(\d{2})$/.exec(valor);
  if (partes != null) {
    const hora = Number(partes[1]);
    const minuto = Number(partes[2]);
    if (hora < 24 && minuto < 60) data.setHours(hora, minuto, 0, 0);
  }
  return data;
}

function formatarHora(data: Date): string {
  return `${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}`;
}

/**
 * A tela sem nada.
 *
 * Não é caso de canto: é o **primeiro** estado que todo cliente novo vê, e o
 * que mais costuma ficar sem desenho, porque quem desenvolve trabalha o tempo
 * todo com o banco cheio. Diga o que aconteceu e o que fazer agora.
 */
export function Vazio({ titulo, detalhe, acao }: { titulo: string; detalhe?: string; acao?: ReactNode }) {
  return (
    <View style={e.vazio}>
      <Text style={e.vazioTitulo}>{titulo}</Text>
      {detalhe != null && <Text style={e.vazioDetalhe}>{detalhe}</Text>}
      {acao != null && <View style={{ marginTop: espaco.lg }}>{acao}</View>}
    </View>
  );
}

/** Uma faixa de aviso. Use para o estado da sincronização. */
export function Faixa({ texto, tom = 'neutro' }: { texto: string; tom?: 'neutro' | 'alerta' | 'erro' }) {
  const fundo = tom === 'erro' ? cor.erroFundo : tom === 'alerta' ? cor.alertaFundo : cor.fundoSuave;
  const tinta = tom === 'erro' ? cor.erro : tom === 'alerta' ? cor.alerta : cor.textoSuave;

  return (
    <View style={[e.faixa, { backgroundColor: fundo }]}>
      <Text style={[e.faixaTexto, { color: tinta }]}>{texto}</Text>
    </View>
  );
}

export function Carregando() {
  return (
    <View style={e.centro}>
      <ActivityIndicator size="large" color={cor.acao} />
    </View>
  );
}

const e = StyleSheet.create({
  botao: {
    minHeight: toque.alvo,
    borderRadius: raio.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: espaco.lg,
  },
  botaoPrincipal: { backgroundColor: cor.acao, ...sombra.cartao },
  botaoSecundario: { backgroundColor: cor.superficie, borderWidth: 1, borderColor: cor.borda },
  botaoInativo: { opacity: 0.5 },
  botaoTexto: { color: cor.acaoTexto, fontFamily: familia.corpo, fontSize: fonte.normal, fontWeight: '700' },

  rotulo: { fontFamily: familia.corpo, fontSize: fonte.pequena, color: cor.textoSuave, marginBottom: espaco.xs, fontWeight: '600' },
  entrada: {
    minHeight: toque.alvo,
    borderWidth: 1,
    borderColor: cor.borda,
    borderRadius: raio.md,
    paddingHorizontal: espaco.md,
    fontSize: fonte.normal,
    color: cor.texto,
    backgroundColor: cor.superficie,
    fontFamily: familia.corpo,
  },
  entradaData: {
    minHeight: toque.alvo,
    borderWidth: 1,
    borderColor: cor.borda,
    borderRadius: raio.md,
    paddingHorizontal: espaco.md,
    backgroundColor: cor.superficie,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  entradaDataPressionada: { backgroundColor: cor.fundoSuave, borderColor: cor.acaoApoio },
  textoData: { color: cor.texto, fontFamily: familia.corpo, fontSize: fonte.normal },
  placeholderData: { color: cor.textoSuave },
  entradaComErro: { borderColor: cor.erro },
  erroTexto: { color: cor.erro, fontSize: fonte.pequena, marginTop: espaco.xs },
  dateModal: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.38)' },
  dateModalCard: { backgroundColor: cor.superficie, borderTopLeftRadius: raio.lg, borderTopRightRadius: raio.lg, paddingBottom: espaco.lg },
  dateModalHeader: { minHeight: toque.alvo, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: espaco.md, borderBottomWidth: 1, borderBottomColor: cor.borda },
  dateModalAcao: { minWidth: toque.alvo, minHeight: toque.alvo, alignItems: 'center', justifyContent: 'center' },
  dateModalTitulo: { color: cor.textoForte, fontFamily: familia.titulo, fontSize: fonte.normal, fontWeight: '700' },
  dateModalCancelar: { color: cor.textoSuave, fontSize: fonte.pequena },
  dateModalConfirmar: { color: cor.acao, fontSize: fonte.pequena, fontWeight: '800' },

  vazio: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: espaco.xl },
  vazioTitulo: { fontSize: fonte.media, color: cor.texto, textAlign: 'center', fontWeight: '600' },
  vazioDetalhe: {
    fontSize: fonte.normal,
    color: cor.textoSuave,
    textAlign: 'center',
    marginTop: espaco.sm,
    lineHeight: 24,
  },

  faixa: { paddingVertical: espaco.sm, paddingHorizontal: espaco.md },
  faixaTexto: { fontSize: fonte.pequena },

  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cabecalhoPagina: { marginBottom: espaco.lg },
  cabecalhoTexto: { flex: 1 },
  cabecalhoAcao: { marginTop: espaco.md },
  sobretitulo: { color: cor.textoDesativado, fontFamily: familia.corpo, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, marginBottom: espaco.xs, textTransform: 'uppercase' },
  tituloPagina: { color: cor.textoForte, fontFamily: familia.titulo, fontSize: fonte.grande, fontWeight: '800', letterSpacing: -0.4 },
  subtituloPagina: { color: cor.textoSuave, fontFamily: familia.corpo, fontSize: fonte.normal, lineHeight: 24, marginTop: espaco.xs },
  tituloSecao: { color: cor.textoForte, fontFamily: familia.titulo, fontSize: fonte.media, fontWeight: '700', marginTop: espaco.lg, marginBottom: espaco.sm },
  cartao: { backgroundColor: cor.superficie, borderWidth: 1, borderColor: cor.borda, borderRadius: raio.lg, padding: espaco.md, ...sombra.cartao },
});
