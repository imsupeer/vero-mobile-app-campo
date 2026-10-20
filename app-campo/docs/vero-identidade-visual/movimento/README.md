# Movimento

O arquivo `vero-motion.css` é o que o sistema carrega. Ele define as curvas e
durações, e aplica a resposta ao toque nos elementos interativos.

## Orçamento

| O quê                   | Duração |
| ----------------------- | ------- |
| Resposta ao toque       | 120ms   |
| Mudança de estado, dica | 180ms   |
| Entrada de painel, menu | 240ms   |
| Saída                   | 140ms   |

Nada acima de 300ms numa interface de trabalho.

**A saída é mais rápida que a entrada.** Sair tem de parecer imediato: a pessoa
já decidiu, e esperar a animação de fechamento é esperar por nada.

## Curvas

```css
--m-out: cubic-bezier(0.22, 1, 0.36, 1); /* entrada — começa rápido      */
--m-inout: cubic-bezier(0.65, 0, 0.35, 1); /* movimento na tela            */
--m-soft: cubic-bezier(0.4, 0, 0.2, 1); /* mudança de cor, opacidade    */
```

Nunca `ease-in` em interface: ela começa devagar, e o começo é justamente o
momento em que a pessoa está olhando. Uma animação `ease-in` de 200ms _parece_
mais lenta que uma `ease-out` de 250ms.

## Regras

**Anime só `transform` e `opacity`.** Animar `height`, `width`, `margin` ou
`padding` obriga o navegador a recalcular o layout a cada quadro. Em máquina
fraca — que é a regra aqui, não a exceção — isso engasga.

**Nunca de `scale(0)`.** Nada no mundo real aparece do nada. Comece em `.95`
com `opacity: 0`.

**Elemento ancorado cresce do gatilho.** Menu e dica usam
`transform-origin` no ponto que os abriu, não no centro. Modal é a exceção: ele
não está preso a nada, então cresce do centro mesmo.

**`prefers-reduced-motion` é respeitado**, sempre. Não é acessibilidade
opcional: enjoo por movimento é real, e a pessoa já disse o que quer no sistema
dela.

## A única que nunca se remove

A resposta ao toque (`scale(.97)`, 120ms). Sem ela, num aparelho lento, a
pessoa acha que o toque não pegou e toca de novo — e lança o registro duas
vezes.
