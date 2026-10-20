# Prompts de design — VERO

Prompts prontos para usar com uma IA (Claude, ChatGPT, v0, Cursor) ao criar ou
revisar telas do sistema.

**Como usar:** cole o **Prompt base** primeiro, sempre. Depois cole o prompt da
tarefa. O base é o que faz a IA produzir algo que parece VERO em vez de
parecer genérico.

---

## 0 · Prompt base (cole sempre antes dos outros)

```
Você vai desenhar uma tela para o VERO, um ERP agrícola brasileiro usado por
produtores de uva e manga no Vale do São Francisco.

QUEM USA
Gestores e técnicos no escritório, em monitor grande, horas seguidas. Parte das
telas também é aberta no celular, no campo, sob sol forte. O expediente começa
às cinco da manhã.

IDIOMA
Tudo em português do Brasil. Nada de "dashboard", "insight" ou "overview" na
interface. Números no formato brasileiro: 1.284,50 — vírgula decimal, ponto de
milhar. Datas em DD/MM/AAAA.

TOKENS (use var(), nunca hex solto)
  Ação:        --accent #005059 · --accent-deep #00363D · --accent-3 #2A767C
  Escuro:      --sidebar #08262A
  Superfície:  --page #EDEAE0 · --surface #FFFFFF · --warm #FBF8F2
  Contorno:    --border #E3D9C8 · --track #EEE6D6
  Texto:       --ink #241B14 · --muted #8A7C68 · --muted2 #9A8C78
  Estado:      --pos #0E7E72 · --amber #B57C1A · --danger #B23A2E
               (cada um com par de fundo: --pos-bg, --amber-bg)
  Forma:       --r-card 13px · --r 9px
  Sombra:      --sombra 0 1px 2px rgba(20,26,31,.04), 0 4px 14px rgba(20,26,31,.06)

TIPOGRAFIA
  Títulos: Poppins 600/700
  Corpo:   Inter 400/600
  Números: IBM Plex Mono, com font-variant-numeric: tabular-nums,
           SEMPRE alinhados à direita

O QUE TORNA UMA TELA "VERO"
1. O fundo é cor de papel (#EDEAE0), não branco. Foi escolha: branco puro cansa
   em jornada longa.
2. Densidade alta, sem aperto. Quem usa quer ver muito de uma vez, e não quer
   caçar informação com barra de rolagem.
3. Silêncio visual. Poucas cores por tela. Cor de estado só onde há estado.
4. Número é o protagonista. O rótulo é pequeno e discreto; o número é grande e
   monoespaçado.
5. Nada de gradiente decorativo, sombra pesada, canto muito arredondado, emoji
   como ícone ou ilustração genérica de banco de imagens.

O QUE NUNCA FAZER
· Cor sozinha para comunicar estado — sempre com rótulo, ícone ou sinal.
  Vermelho e verde é a dupla mais comum de daltonismo, e sob sol some.
· Número em fonte proporcional dentro de tabela.
· Inventar dado, valor ou fórmula. Se faltar informação, escreva "a definir".
· Termo em inglês na interface.
```

---

## 1 · Tela de lista (CRUD)

```
Desenhe uma tela de lista para [ENTIDADE: ex. fornecedores, apontamentos].

ESTRUTURA
· Cabeçalho: título em Poppins 600, e à direita o botão de ação principal
· Faixa de filtros: período, mais 2 ou 3 filtros que façam sentido para a
  entidade. Discretos, numa linha
· Tabela em cartão (--surface, --r-card, --sombra)
· Paginação embaixo, simples

TABELA
· Cabeçalho: 10,5px, MAIÚSCULAS, letter-spacing .09em, cor --muted2
· Linhas separadas por 1px --track
· Colunas de número alinhadas à direita, IBM Plex Mono, tabular-nums
· Coluna de situação com selo (fundo claro + texto escuro da mesma família)
· Ações no fim da linha, discretas até o mouse passar

OS QUATRO ESTADOS, todos desenhados:
· carregando — esqueleto das linhas, não um giro no meio da tela
· vazio — diga o que aconteceu E o que fazer agora, com o botão da ação
· com conteúdo
· erro — o motivo em português e o que tentar

Entregue HTML + CSS usando os tokens. Sem framework.
```

---

## 2 · Painel de indicadores (BI)

```
Desenhe um painel executivo de [ASSUNTO: ex. custo de produção].

ACIMA DA DOBRA, nesta ordem:
1. Seletor de período discreto (mês de referência + opção "Geral")
2. Faixa de 4 a 6 indicadores
3. Um gráfico principal
4. Detalhamento abaixo

CADA INDICADOR
· Rótulo: 10,5px MAIÚSCULAS, --muted2
· Número: grande, IBM Plex Mono, --ink
· Comparação: pequena, embaixo, com sinal (+12% sobre agosto)
· Cartão --surface, contorno --border, raio --r-card

GRÁFICOS
· No máximo 3 cores por gráfico, tiradas de --accent, --accent-3, --olive
· Sem grade pesada: linhas horizontais finas em --track, e só
· Rótulo direto na série quando couber; legenda só se não couber
· Sem 3D, sem sombra, sem gradiente

REGRA DE OURO DO PAINEL
Quem abre precisa entender a situação em cinco segundos, sem clicar. Se for
preciso interagir para entender, o painel está errado — refaça a hierarquia.

Diga quais dados cada elemento precisa. NÃO invente números: use
"1.284,50 (exemplo)".
```

---

## 3 · Formulário

```
Desenhe o formulário de [AÇÃO: ex. lançar apontamento de campo].

PRINCÍPIOS
· Uma coluna. Duas colunas fazem o olho pular e a pessoa pular campo
· Agrupe em blocos de 3 a 5 campos, com um subtítulo por bloco
· Se passar de 8 campos, quebre em etapas com indicador de progresso
· Preencha de antemão tudo que for previsível: data de hoje, último valor
  usado, unidade da opção escolhida

CAMPOS
· Rótulo acima, 12px, peso 700, sempre visível — nunca só placeholder
· Campo com linha inferior 1.5px --border, que vira --accent no foco
· Erro embaixo do campo, texto --danger, mais o contorno vermelho
· Campo obrigatório: marque o OPCIONAL, não o obrigatório, se a maioria for
  obrigatória

BOTÕES
· Ação principal cheia (--accent), secundária com contorno
· Ficam no fim, alinhados à direita. No celular, largura total e fixos embaixo
· Em estado de envio: botão desabilitado, com giro dentro dele

Entregue HTML + CSS com os tokens.
```

---

## 4 · Tela de campo (celular)

```
Desenhe uma tela de celular para [TAREFA] do aplicativo de campo.

O CONTEXTO MUDA TUDO
Sol forte na tela. A pessoa está de luva, com a mão suja. Celular simples, com
pouca memória. Rede de 4G a nada. Cinco da manhã.

REGRAS QUE NÃO SE NEGOCIAM
· Alvo de toque mínimo 56px (não 44 — dedo de luva tem área maior e menos
  precisão)
· Nenhuma fonte menor que 15px
· Contraste alto, fundo claro — tema escuro não é prioridade, trabalha-se de dia
· Uma decisão por tela. Sem menu com dez opções
· Toda ação de salvar funciona SEM INTERNET: grava no aparelho e responde na
  hora; o envio acontece depois
· O botão encolhe ao tocar (scale .97, 120ms). É a única animação que nunca se
  remove: sem ela, num aparelho lento, a pessoa toca duas vezes e lança duplicado

MOSTRE SEMPRE
· Quantos registros estão esperando envio
· O que foi recusado e POR QUÊ (nunca "erro ao enviar")

Entregue em React Native (StyleSheet), não HTML.
```

---

## 5 · Estados vazios, de erro e de carregamento

```
Escreva os estados de [TELA].

VAZIO — o mais importante, e o mais esquecido
É o primeiro estado que todo cliente novo vê, e quem desenvolve nunca o vê
porque trabalha com o banco cheio. Ele precisa de:
· um título que diga o que aconteceu ("Nenhum apontamento neste período")
· uma frase que diga o que fazer agora
· o botão da ação, quando houver uma
Sem ilustração genérica. Sem "Ops!".

ERRO
· Diga o motivo em português, do ponto de vista de quem usa
· Diga o que tentar
· "Erro desconhecido" é proibido — se não souber o motivo, diga o que fazer
  ("Não conseguimos carregar. Tente de novo em instantes.")

CARREGANDO
· Esqueleto no formato do conteúdo que vem, não um giro no meio da tela
· Abaixo de 300ms não mostre nada: o piscar incomoda mais que a espera

Escreva os textos exatos, em português, prontos para colar.
```

---

## 6 · Movimento

```
Defina as animações de [COMPONENTE].

ORÇAMENTO
· Resposta ao toque: 120ms
· Entrada: 180ms, ease-out
· Saída: 140ms (mais rápida que a entrada — sair deve parecer imediato)
· Nada acima de 300ms numa interface de trabalho

REGRAS
· Anime só transform e opacity. Animar height, width ou margin obriga o
  navegador a recalcular o layout, e em máquina fraca isso engasga
· Nunca de scale(0): nada no mundo real aparece do nada. Comece em .95
· Elementos ancorados (menu, dica) crescem a partir do gatilho, não do centro
· Respeite prefers-reduced-motion, sempre

O TESTE
Esta tela é usada dezenas de vezes por dia. O que encanta na primeira vez
atrasa na trigésima. Se a animação chama atenção para si, está longa demais.

Entregue o CSS.
```

---

## 7 · Revisar uma tela que já existe

```
Revise a tela abaixo contra a identidade VERO. Para cada problema, dê uma
tabela: | Como está | Como deveria | Por quê |.

CONFIRA
1. Cores fora dos tokens (hex solto no lugar de var())
2. Número em fonte proporcional ou alinhado à esquerda
3. Termo em inglês na interface
4. Estado comunicado só por cor
5. Estado vazio ausente ou genérico
6. Alvo de toque menor que 44px (56px se for tela de campo)
7. Contraste abaixo de 4.5:1 em texto
8. Tabela que estoura no celular sem rolagem
9. Animação acima de 300ms ou animando propriedade de layout
10. Densidade: sobra grande demais numa tela que precisa mostrar muito

Ordene do mais grave ao mais leve. Não reescreva a tela inteira — aponte o que
muda.

[COLE O CÓDIGO]
```

---

## 8 · Gráfico

```
Escolha e desenhe o gráfico para: [PERGUNTA QUE O USUÁRIO TEM].

Comece pela pergunta, não pelo tipo de gráfico:
· "quanto, comparado com" → barras
· "como mudou no tempo" → linha
· "de que é feito" → barra empilhada, não pizza
· "onde" → mapa
· pizza só com 2 ou 3 fatias, nunca mais

VISUAL
· Máximo 3 cores: --accent, --accent-3, --olive
· Eixo Y começa em zero em barras. Sem exceção — cortar o eixo mente
· Grade: só horizontais finas em --track
· Rótulo direto na série, quando couber
· Números no eixo em IBM Plex Mono, formato brasileiro
· Sem 3D, sem sombra, sem gradiente, sem animação de entrada longa

ALÉM DA COR
O gráfico tem de funcionar impresso em preto e branco: use padrão, espessura ou
rótulo além da cor.

Diga quais dados ele precisa, no formato { rotulo, valor }.
```

---

## 9 · Acessibilidade

```
Audite a acessibilidade da tela abaixo. Este sistema é lido sob sol forte, por
gente de todas as idades, às vezes em celular simples.

CONFIRA
· Contraste: 4.5:1 em texto normal, 3:1 em texto grande e em contorno de campo
· Todo campo com <label> ligado por for/id — placeholder não é rótulo
· Foco visível no teclado, em todo elemento interativo
· Ordem de tabulação seguindo a leitura
· Erro anunciado por aria-live e ligado ao campo por aria-describedby
· Ícone sozinho com aria-label
· Tabela com <th scope>
· Nada dependendo só de cor
· Alvo de toque: 44px na web, 56px no campo

Liste o que está errado e o conserto exato. Não reescreva a tela.

[COLE O CÓDIGO]
```

---

## 10 · Tela nova do zero

```
Desenhe [TELA] para o VERO.

Antes de desenhar, responda em uma linha cada:
1. Quem abre esta tela, e em que momento do dia?
2. Qual pergunta ela responde?
3. Qual é a única ação mais importante aqui?
4. O que a pessoa faz depois de usá-la?

Depois desenhe, com a resposta 2 acima da dobra e a resposta 3 como o elemento
mais visível.

ENTREGUE
· A estrutura em texto (o que fica onde, e por quê)
· HTML + CSS com os tokens
· Os quatro estados: carregando, vazio, com conteúdo, erro
· O que muda no celular
· Os dados que a tela precisa do servidor

Se faltar informação para decidir alguma coisa, escreva "a definir" e siga. Não
invente número, fórmula nem regra de negócio — num sistema agrícola um valor
plausível vira decisão no galpão e sobrevive meses até alguém desconfiar.
```

---

## Como julgar o resultado

Antes de aceitar o que a IA devolver:

1. **Parece VERO ou parece qualquer coisa?** Fundo de papel, teal profundo,
   número monoespaçado. Se estiver branco com azul e canto bem arredondado, a
   IA ignorou o base.
2. **Os quatro estados existem?** O vazio é o que mais falta.
3. **Tem algum hex solto?** Deveria ser `var(--token)`.
4. **Tem palavra em inglês na tela?**
5. **Tem número inventado sem marcar como exemplo?**
6. **Funciona a 360px de largura?**

Os itens 2 e 5 são os que mais passam batido — e os que mais custam depois.
