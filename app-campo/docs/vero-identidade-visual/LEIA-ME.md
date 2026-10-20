# VERO — identidade visual

Pacote de referência de design do sistema VERO. Tudo aqui saiu do produto que
está no ar — não é uma recriação nem uma proposta.

**Comece abrindo [`portfolio.html`](portfolio.html) no navegador.** É a vitrine:
marca, cores, tipografia, componentes, movimento e as imagens, tudo numa página.

---

## O que tem aqui

```
portfolio.html          a vitrine — abra primeiro
LEIA-ME.md              este arquivo

marca/
  logo/                 logotipo em SVG: símbolo, lockup e empilhado,
                        cada um em versão clara e escura
  favicons/             ícones de aba e de atalho
cores/
  tokens.css            a paleta, pronta para importar
tipografia/
  README.md             as três famílias e quando usar cada uma
  fontes/               os arquivos, self-host
movimento/
  vero-motion.css       curvas e durações do sistema
telas/
  login/login.html      a tela de acesso, funcionando sozinha
imagens/                as artes que o sistema usa hoje
prompts/
  PROMPTS-DE-DESIGN.md  prompts prontos para criar telas novas
```

---

## A identidade em cinco frases

**Fundo cor de papel, não branco.** `#EDEAE0`. É escolha: o sistema fica aberto
horas seguidas, e branco puro cansa.

**Teal profundo como cor de ação.** `#005059`. Uma cor de ação só, usada com
parcimônia — quando tudo é destaque, nada é.

**Densidade alta, sem aperto.** Quem usa quer ver muito de uma vez e não quer
caçar informação rolando a tela.

**O número é o protagonista.** Rótulo pequeno e discreto; número grande,
monoespaçado, alinhado à direita.

**Silêncio visual.** Sem gradiente decorativo, sem sombra pesada, sem
ilustração de banco de imagens. Cor de estado só onde existe estado.

---

## Como usar

Importe os tokens e as fontes, nesta ordem:

```html
<link rel="stylesheet" href="tipografia/fontes/vero-fonts.css" />
<link rel="stylesheet" href="cores/tokens.css" />
<link rel="stylesheet" href="movimento/vero-motion.css" />
```

E use sempre `var(--token)`:

```css
.cartao {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-card);
  box-shadow: var(--sombra);
  color: var(--ink);
}
```

**Nunca copie o hex direto.** Um hex copiado hoje vira cor órfã amanhã: quando
a paleta mudar, ele fica para trás e ninguém descobre até alguém reparar que
uma tela ficou de outra cor.

---

## Três coisas que este pacote não esconde

**A tela de acesso está fora do padrão tipográfico.** Ela ainda usa a família
_Supreme_, enquanto o resto do sistema migrou para Poppins + Inter em
setembro. É inconsistência conhecida, não decisão. Ao redesenhar a tela de
acesso, alinhe com o resto.

**A fonte Supreme não foi incluída.** Ela tem licença própria da Befonts e não
deve ser redistribuída. A cópia de `vero-fonts.css` neste pacote teve as
declarações dela removidas, e `login.html` renderiza com Inter no lugar.

**Duas imagens estão pesadas demais.** `banner_niver.png` tem 3,4 MB e
`uni_login_bg.png` tem 1,8 MB. Numa conexão de campo isso é meio minuto de
espera por uma arte decorativa. Em WebP deviam caber em menos de 150 KB cada —
para comparar, `dashboard-banner.webp` tem qualidade parecida com 23 KB.

---

## Para criar telas novas

Use [`prompts/PROMPTS-DE-DESIGN.md`](prompts/PROMPTS-DE-DESIGN.md). São dez
prompts prontos — lista, painel, formulário, tela de campo, estados vazios,
movimento, gráfico, acessibilidade, revisão e tela nova do zero.

Cole sempre o **Prompt base** antes do prompt da tarefa. É ele que faz o
resultado parecer VERO em vez de parecer qualquer sistema.

---

## O que o pacote não traz

- Capturas de tela do sistema em uso — teriam dados reais de cliente dentro.
- O CSS completo do produto (são 18 arquivos, ~250 KB). Aqui estão os tokens,
  que é o que se reaproveita; o resto é específico de cada módulo.
- Componentes em React ou Vue. O sistema é PHP com CSS próprio.

Se precisar de algum desses, peça.
