# Marca

Oito arquivos SVG, em três formas e dois tons.

| Arquivo                         | Forma                              | Fundo  |
| ------------------------------- | ---------------------------------- | ------ |
| `vero-symbol.svg`               | só o símbolo                       | claro  |
| `vero-symbol-white.svg`         | só o símbolo                       | escuro |
| `vero-lockup.svg`               | símbolo + palavra, na horizontal   | claro  |
| `vero-lockup-white.svg`         | idem                               | escuro |
| `vero-stacked.svg`              | símbolo sobre a palavra            | claro  |
| `vero-stacked-white.svg`        | idem                               | escuro |
| `vero-stacked-white-notech.svg` | idem, sem a assinatura menor       | escuro |
| `vero-arte-login.svg`           | a arte do painel da tela de acesso | —      |

`logo_vero.png` é a versão rasterizada, para onde SVG não serve (assinatura de
e-mail, alguns relatórios).

## Quando usar cada uma

**Símbolo** — favicon, ícone de aplicativo, avatar, espaços pequenos e
quadrados.

**Lockup** — cabeçalho de página, rodapé de documento, onde há largura sobrando.
É a forma padrão.

**Empilhado** — quando a largura é apertada e a altura sobra: capa de relatório,
tela de carregamento.

## Regras

**Use o par certo.** Símbolo branco sobre fundo claro some, e é o erro mais
comum. Na dúvida, o fundo escuro do sistema é `--sidebar` (#08262A).

**Respiro mínimo:** a altura do símbolo em volta de todos os lados. Nada entra
nesse espaço.

**Tamanho mínimo:** 24px de altura para o símbolo, 90px de largura para o
lockup. Abaixo disso a palavra fecha e vira borrão.

**Não faça:** esticar sem manter a proporção, recolorir, aplicar sombra ou
contorno, rotacionar, ou pôr sobre foto sem uma camada de contraste atrás.

## Marca-branca

O sistema é marca-branca: cada cliente pode trocar o logo e a arte da tela de
acesso pela dele. A marca VERO continua num canto discreto do formulário. Ao
desenhar telas, considere que o logo do topo pode não ser o VERO.
