import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { cor } from '@/ui/tema';

export function MarcaVero({ clara = false, compacta = false }: { clara?: boolean; compacta?: boolean }) {
  const tinta = clara ? '#FFFFFF' : cor.acao;
  const altura = compacta ? 24 : 31;

  return (
    <View accessibilityLabel="VERO by Origo" style={estilos.linha}>
      <Svg width={compacta ? 34 : 43} height={altura} viewBox="0 0 159.96 104.34">
        <Path
          fill={tinta}
          d="M134.7 63.22l9.13-6.25c10.1-6.91 16.14-18.37 16.14-30.61V0h-24.82v26.33c0 4.07-2.01 7.88-5.37 10.18L98.12 58.19c-6.74 4.62-10.77 12.26-10.77 20.43v18.37H72.61V78.62c0-8.17-4.03-15.81-10.77-20.43L30.18 36.51c-3.36-2.3-5.37-6.11-5.37-10.18V0H0v26.37c0 12.24 6.04 23.69 16.14 30.61L60.3 87.22c3.09 2.12 4.94 5.63 4.94 9.38v7.76h29.47V96.6c0-3.75 1.85-7.26 4.94-9.38l35.04-23.99"
        />
      </Svg>
      <View>
        <Text style={[estilos.nome, compacta && estilos.nomeCompacto, { color: tinta }]}>VERO</Text>
        {!compacta && <Text style={[estilos.assinatura, { color: clara ? cor.textoLateral : cor.textoSuave }]}>by Origo</Text>}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nome: { fontFamily: 'sans-serif', fontSize: 25, fontWeight: '800', letterSpacing: 2.5, lineHeight: 27 },
  nomeCompacto: { fontSize: 19, lineHeight: 22, letterSpacing: 2 },
  assinatura: { fontFamily: 'sans-serif', fontSize: 10, fontWeight: '600', letterSpacing: 0.4 },
});
