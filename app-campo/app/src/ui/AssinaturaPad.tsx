/**
 * Bloco de assinatura.
 *
 * A confirmação de aplicação de defensivo (GlobalG.A.P.) exige a assinatura do
 * operador. Aqui ela é desenhada com o dedo e serializada como um SVG de
 * caminhos — leve (bem abaixo do teto de 500 KB do servidor) e independente de
 * imagem. Funciona no toque (campo) e no mouse (web) porque o PanResponder do
 * React Native já normaliza os dois.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import type { GestureResponderEvent, LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { cor, espaco, fonte, raio } from '@/ui/tema';
import { normalizarPontoAssinatura } from '@/ui/assinatura';

type Ponto = { x: number; y: number };

const LARGURA = 320;
const ALTURA = 160;

function paraD(traco: Ponto[]): string {
  if (traco.length === 0) return '';
  const [primeiro, ...resto] = traco;
  if (primeiro == null) return '';
  const inicio = `M ${primeiro.x.toFixed(1)} ${primeiro.y.toFixed(1)}`;
  return resto.reduce((d, p) => `${d} L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`, inicio);
}

export function AssinaturaPad({
  aoMudar,
  rotulo = 'Assinatura do operador',
}: {
  aoMudar: (svg: string | null) => void;
  rotulo?: string;
}) {
  /* `tracosRef` é a fonte da verdade (não sofre com o timing do setState);
     `tracos`/`preview` existem só para redesenhar. Serializamos a partir do ref,
     fora de qualquer updater de estado, para o SVG nunca ficar defasado. */
  const tracosRef = useRef<Ponto[][]>([]);
  const dimensoes = useRef({ largura: LARGURA, altura: ALTURA });
  const [tracos, setTracos] = useState<Ponto[][]>([]);
  const [preview, setPreview] = useState<Ponto[]>([]);
  const tracoAtual = useRef<Ponto[]>([]);

  const serializar = useCallback((todos: Ponto[][]) => {
    const comConteudo = todos.filter((t) => t.length > 1);
    if (comConteudo.length === 0) { aoMudar(null); return; }
    const caminhos = comConteudo
      .map((t) => `<path d="${paraD(t)}" fill="none" stroke="#0F172A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`)
      .join('');
    aoMudar(`<svg xmlns="http://www.w3.org/2000/svg" width="${LARGURA}" height="${ALTURA}" viewBox="0 0 ${LARGURA} ${ALTURA}">${caminhos}</svg>`);
  }, [aoMudar]);

  const registrarDimensoes = useCallback((evento: LayoutChangeEvent) => {
    const { width, height } = evento.nativeEvent.layout;
    if (width > 0 && height > 0) dimensoes.current = { largura: width, altura: height };
  }, []);

  const pontoDoEvento = useCallback((evento: GestureResponderEvent): Ponto => {
    const { locationX, locationY } = evento.nativeEvent;
    return normalizarPontoAssinatura(locationX, locationY, dimensoes.current.largura, dimensoes.current.altura);
  }, []);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evento: GestureResponderEvent) => {
          tracoAtual.current = [pontoDoEvento(evento)];
        },
        onPanResponderMove: (evento: GestureResponderEvent) => {
          tracoAtual.current = [...tracoAtual.current, pontoDoEvento(evento)];
          /* re-render ao vivo do traço em curso */
          setPreview(tracoAtual.current);
        },
        onPanResponderRelease: () => {
          if (tracoAtual.current.length > 1) {
            tracosRef.current = [...tracosRef.current, tracoAtual.current];
            setTracos(tracosRef.current);
            serializar(tracosRef.current);
          }
          tracoAtual.current = [];
          setPreview([]);
        },
      }),
    [pontoDoEvento, serializar],
  );

  const limpar = useCallback(() => {
    tracosRef.current = [];
    setTracos([]);
    setPreview([]);
    tracoAtual.current = [];
    aoMudar(null);
  }, [aoMudar]);

  const vazio = tracos.length === 0 && preview.length === 0;

  return (
    <View style={e.grupo}>
      <View style={e.quadroLinha}>
        <Text style={e.rotulo}>{rotulo}</Text>
        {!vazio && (
          <Pressable accessibilityRole="button" onPress={limpar} hitSlop={8}>
            <Text style={e.limpar}>Limpar</Text>
          </Pressable>
        )}
      </View>
      <View style={e.quadro} onLayout={registrarDimensoes} {...responder.panHandlers}>
        <Svg width="100%" height={ALTURA} viewBox={`0 0 ${LARGURA} ${ALTURA}`}>
          {tracos.map((t, i) => (
            <Path key={i} d={paraD(t)} fill="none" stroke={cor.textoForte} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {preview.length > 1 && (
            <Path d={paraD(preview)} fill="none" stroke={cor.textoForte} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          )}
        </Svg>
        {vazio && <Text style={e.dica} pointerEvents="none">Assine com o dedo aqui</Text>}
      </View>
    </View>
  );
}

const e = StyleSheet.create({
  grupo: { marginTop: espaco.md },
  quadroLinha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: espaco.sm },
  rotulo: { color: cor.textoSuave, fontSize: fonte.pequena, fontWeight: '600' },
  limpar: { color: cor.acao, fontSize: fonte.pequena, fontWeight: '700' },
  quadro: { height: ALTURA, borderWidth: 1.5, borderColor: cor.borda, borderStyle: 'dashed', borderRadius: raio.md, backgroundColor: cor.superficie, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  dica: { position: 'absolute', color: cor.textoDesativado, fontSize: fonte.pequena },
});
