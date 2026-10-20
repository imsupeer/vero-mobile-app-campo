# Tela de acesso

Abra `login.html` no navegador. Funciona sozinha, sem servidor.

## O desenho

Cartão dividido em dois, 980px no máximo:

**Esquerda — o formulário.** Objetivo e curto: usuário, senha, entrar. O
logotipo VERO fica discreto no canto superior direito. Rodapé com selo de
acesso seguro.

**Direita — a arte.** Fundo teal profundo com a marca do cliente num cartão
escuro, arredondado, com desfoque atrás. Esta metade é **marca-branca**: cada
cliente pode trocar a arte e o logo pelos dele.

No celular (abaixo de 880px) a arte vai para cima, vira uma faixa de 190px, e o
formulário ocupa o resto.

## Detalhes que valem reparar

**O fundo da página** tem três camadas: um gradiente teal, a arte
`vero_login_bg.svg` por baixo, e uma grade fina com máscara radial que some nas
bordas. Dá profundidade sem pesar.

**O campo tem só a linha de baixo**, que vira teal no foco. Contorno completo
em formulário curto pesa a tela.

**O erro sacode o cartão** (`is-shake`, 420ms). É reforço, não substituto: a
mensagem continua escrita e anunciada por `aria-live`.

**O botão tem estado de envio** — o rótulo some e um giro aparece no lugar,
sem mudar o tamanho do botão. Botão que muda de largura ao carregar faz a
página pular.

## O que mudou nesta cópia

- Saiu a lógica PHP de autenticação, CSRF e sessão.
- Saiu o vídeo de transição que roda depois do login.
- A família `Supreme` virou `Inter` — ver o LEIA-ME na raiz.
- O envio não vai a servidor nenhum: só demonstra o estado de carregando.

O comportamento de tela foi mantido: mostrar/ocultar senha, avisos com
`aria-live`, validação visual e a sacudida no erro.
