/**
 * O fundo das telas de acesso (código da empresa e login).
 *
 * É a reprodução, em `react-native-svg`, do clima de `vero_login_bg.svg` da
 * identidade: céu teal profundo, um brilho da marca no alto, a malha fina do
 * sistema e os contornos do vale com a rede de irrigação. Foi refeito com
 * primitivas em vez de embutir o SVG original por um motivo prático — assim
 * renderiza igual em Android, iOS e web, sem transformer nem dependência nova,
 * e funciona offline, que é onde o aplicativo vive.
 *
 * Cores vêm do tema. O teal do fundo é mais escuro que a cor de ação: é a
 * mesma decisão do site — a marca brilha sobre o escuro, não compete com ele.
 */
import type { ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

export function FundoAcesso({ children }: { children: ReactNode }) {
  const { width, height } = useWindowDimensions();
  const l = Math.max(width, 1);
  const a = Math.max(height, 1);

  /* a malha fina, só onde o cartão não cobre — some nas bordas para não pesar */
  const passo = 64;
  const verticais = Math.ceil(l / passo);
  const horizontais = Math.ceil(a / passo);

  /* nós da rede de irrigação: poucos, ligados por linhas finas */
  const nos = [
    { x: 0.16, y: 0.2 },
    { x: 0.34, y: 0.13 },
    { x: 0.52, y: 0.22 },
    { x: 0.8, y: 0.16 },
    { x: 0.9, y: 0.32 },
    { x: 0.24, y: 0.34 },
  ];
  const paresIndices: Array<[number, number]> = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [0, 5],
    [5, 2],
  ];
  const ligacoes = paresIndices
    .map(([de, para]) => ({ de: nos[de], para: nos[para] }))
    .filter((par): par is { de: { x: number; y: number }; para: { x: number; y: number } } =>
      par.de != null && par.para != null,
    );

  return (
    <View style={e.raiz}>
      <StatusBar style="light" />
      <Svg style={StyleSheet.absoluteFill} width={l} height={a} pointerEvents="none">
        <Defs>
          <LinearGradient id="ceu" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#04343A" />
            <Stop offset="0.42" stopColor="#005059" />
            <Stop offset="0.78" stopColor="#013F47" />
            <Stop offset="1" stopColor="#00272C" />
          </LinearGradient>
          <RadialGradient id="brilho" cx="0.28" cy="0.2" r="0.6">
            <Stop offset="0" stopColor="#0E7E72" stopOpacity="0.38" />
            <Stop offset="1" stopColor="#0E7E72" stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id="vale" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#00363D" stopOpacity="0.9" />
            <Stop offset="1" stopColor="#00181C" stopOpacity="0.95" />
          </LinearGradient>
        </Defs>

        {/* céu */}
        <Rect x="0" y="0" width={l} height={a} fill="url(#ceu)" />
        <Rect x="0" y="0" width={l} height={a} fill="url(#brilho)" />

        {/* malha fina */}
        {Array.from({ length: verticais }).map((_, i) => (
          <Line
            key={`v${i}`}
            x1={i * passo}
            y1={0}
            x2={i * passo}
            y2={a}
            stroke="#4E9CA1"
            strokeOpacity={0.06}
            strokeWidth={1}
          />
        ))}
        {Array.from({ length: horizontais }).map((_, i) => (
          <Line
            key={`h${i}`}
            x1={0}
            y1={i * passo}
            x2={l}
            y2={i * passo}
            stroke="#4E9CA1"
            strokeOpacity={0.06}
            strokeWidth={1}
          />
        ))}

        {/* rede de irrigação */}
        {ligacoes.map((par, i) => (
          <Line
            key={`lig${i}`}
            x1={par.de.x * l}
            y1={par.de.y * a}
            x2={par.para.x * l}
            y2={par.para.y * a}
            stroke="#4E9CA1"
            strokeOpacity={0.22}
            strokeWidth={1}
          />
        ))}
        {nos.map((no, i) => (
          <Circle key={`no${i}`} cx={no.x * l} cy={no.y * a} r={2.5} fill="#4E9CA1" fillOpacity={0.5} />
        ))}

        {/* contornos do vale, na base */}
        <Path
          d={`M0 ${a * 0.82} C ${l * 0.25} ${a * 0.74}, ${l * 0.55} ${a * 0.9}, ${l} ${a * 0.8} L ${l} ${a} L 0 ${a} Z`}
          fill="url(#vale)"
        />
        <Path
          d={`M0 ${a * 0.9} C ${l * 0.3} ${a * 0.84}, ${l * 0.6} ${a * 0.97}, ${l} ${a * 0.88}`}
          stroke="#4E9CA1"
          strokeOpacity={0.16}
          strokeWidth={1.5}
          fill="none"
        />
      </Svg>
      {children}
    </View>
  );
}

const e = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: '#04262B' },
});
