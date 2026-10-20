/**
 * Silencia UM ruído específico do React Native Web em desenvolvimento.
 *
 * Os elementos de `react-native-svg` com `onPress` (as válvulas do mapa) fazem o
 * React DOM reclamar de props de "responder" de toque que não existem no SVG do
 * navegador: `onStartShouldSetResponder`, `onResponderGrant`, etc. São dezenas
 * de `console.error` por render — inofensivos (só valem no aparelho nativo),
 * mas enchem o console e o app mostra um selo vermelho de "erro" que assusta.
 *
 * Filtramos APENAS essa mensagem conhecida, e só na web. Qualquer outro erro
 * continua passando — não é para esconder problema de verdade.
 */
import { Platform } from 'react-native';

const PADRAO_PROP = /^on(Start|Move)?(Should)?SetResponder|^onResponder/;

export function silenciarAvisosWeb(): void {
  if (Platform.OS !== 'web') return;

  const erroOriginal = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    const primeiro = args[0];
    if (
      typeof primeiro === 'string' &&
      primeiro.includes('Unknown event handler property') &&
      args.some((a) => typeof a === 'string' && PADRAO_PROP.test(a))
    ) {
      return; // ruído conhecido do react-native-svg na web
    }
    erroOriginal(...(args as []));
  };
}
