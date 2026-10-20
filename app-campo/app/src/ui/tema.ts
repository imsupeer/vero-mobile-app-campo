import { Platform } from 'react-native';

/**
 * Os valores da interface, num lugar só.
 *
 * Quase tudo aqui é escolhido pelo lugar onde o aplicativo é usado: sol forte
 * na tela, luva na mão, poeira, celular simples. Quando for mudar algum
 * número, leia o comentário antes — vários parecem exagerados e não são.
 */

export const cor = {
  /* fundo claro e texto quase preto: sob sol direto, contraste alto é a
     diferença entre ler e não ler. Tema escuro fica para depois, e não é
     prioridade — quem usa isto trabalha de dia. */
  fundo: '#EDEAE0',
  superficie: '#FFFFFF',
  fundoSuave: '#FBF8F2',
  campo: '#EEE6D6',
  borda: '#E3D9C8',
  bordaForte: '#DDD2BF',

  texto: '#241B14',
  textoForte: '#2B2018',
  textoSuave: '#8A7C68',
  textoDesativado: '#9A8C78',
  textoLateral: '#C6B8A4',
  textoLateralSuave: '#8B7C68',
  tenue: '#C3B49E',

  /* verde da marca, escurecido até passar em contraste sobre branco */
  acao: '#005059',
  acaoPressionada: '#00363D',
  acaoApoio: '#2A767C',
  cabecalho: '#08262A',
  acaoTexto: '#FFFFFF',

  alerta: '#7A5410',
  alertaFundo: '#F3E7C8',
  erro: '#B23A2E',
  erroFundo: '#F8E3DF',
  ok: '#0E7E72',
  okFundo: '#DDEDEB',
} as const;

export const espaco = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

export const raio = { sm: 8, md: 9, lg: 13 } as const;

/**
 * Tamanhos de toque.
 *
 * `alvo` é 56, não os 44 que as diretrizes pedem. Dedo de luva tem área de
 * contato maior e menos precisão, e errar o botão no meio da válvula custa
 * uma repetição inteira do gesto. Vale o espaço gasto.
 */
export const toque = { alvo: 56, alvoPequeno: 44 } as const;

export const fonte = {
  /* nada menor que 15: tela suja de poeira e vista cansada às cinco da
     manhã não leem 12 */
  pequena: 15,
  normal: 17,
  media: 20,
  grande: 28,
} as const;

/** Famílias equivalentes às da marca quando as fontes proprietárias não estão
 * instaladas no aparelho. No Android, `sans-serif` e `monospace` evitam o
 * custo de baixar fonte no campo e continuam legíveis offline. */
export const familia = {
  titulo: 'sans-serif',
  corpo: 'sans-serif',
  numero: 'monospace',
} as const;

export const sombra = {
  cartao: Platform.select({
    web: { boxShadow: '0 1px 2px rgba(20, 26, 31, 0.04), 0 4px 14px rgba(20, 26, 31, 0.06)' },
    default: {
    shadowColor: '#141A1F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
    },
  }) ?? {},
} as const;

/**
 * Animação.
 *
 * Curta e discreta, por dois motivos. O aparelho é fraco — animação longa
 * vira travamento. E a pessoa repete o mesmo gesto dezenas de vezes por dia:
 * o que encanta na primeira vez atrasa na trigésima.
 *
 * `pressao` é o encolhimento ao tocar. É a única animação que nunca se
 * remove: sem ela, num toque que não responde na hora, a pessoa toca de novo
 * — e lança duas vezes.
 */
export const movimento = {
  rapido: 120,
  normal: 180,
  pressao: 0.97,
} as const;
