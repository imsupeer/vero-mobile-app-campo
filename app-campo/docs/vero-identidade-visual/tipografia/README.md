# Tipografia

Três famílias, cada uma com um trabalho. Todas self-host, sem CDN.

| Família           | Onde                  | Pesos              |
| ----------------- | --------------------- | ------------------ |
| **Poppins**       | títulos (h1–h6)       | 500, 600, 700, 800 |
| **Inter**         | corpo, rótulos, dados | variável 400–700   |
| **IBM Plex Mono** | números               | 400, 500, 600, 700 |

`IBM Plex Sans` e `Hanken Grotesk` estão nos arquivos como reserva de telas
antigas. Não use em tela nova.

## Números

Esta é a regra que mais se esquece e mais custa:

```css
.valor {
  font-family: var(--num); /* IBM Plex Mono */
  font-variant-numeric: tabular-nums;
  text-align: right;
}
```

Numa coluna de valores, fonte proporcional desalinha as casas decimais e o olho
perde a comparação — que é exatamente para o que a tabela serve. `tabular-nums`
também impede o número de "pular" de largura quando muda em tempo real.

Formato brasileiro, sempre: `1.284,50` — vírgula decimal, ponto de milhar.

## Escala

| Uso                 | Tamanho | Peso                                  | Família       |
| ------------------- | ------- | ------------------------------------- | ------------- |
| Título de página    | 28–30px | 700                                   | Poppins       |
| Título de seção     | 20–21px | 600                                   | Poppins       |
| Título de cartão    | 15–16px | 600                                   | Poppins       |
| Corpo               | 15px    | 400                                   | Inter         |
| Rótulo de campo     | 12px    | 700                                   | Inter         |
| Rótulo de indicador | 10,5px  | 600, MAIÚSCULAS, letter-spacing .09em | Inter         |
| Número de indicador | 20–24px | 600                                   | IBM Plex Mono |
| Legenda             | 11,5px  | 400                                   | Inter         |

**Nada abaixo de 10,5px**, e 10,5 só em rótulo curto e maiúsculo. Em tela de
campo o mínimo sobe para 15px — sol, poeira e cinco da manhã.

## Sobre a Supreme

A família _Supreme_ foi o padrão até setembro de 2026, quando o sistema migrou
para Poppins + Inter. Ela **não está neste pacote**: tem licença própria da
Befonts e não deve ser redistribuída.

A tela de acesso ainda a usa no produto — é inconsistência conhecida. No
`login.html` deste pacote ela foi trocada por Inter.
