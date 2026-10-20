# O que construir

Cinco módulos. Os três primeiros são o centro do aplicativo; os dois últimos
são consulta, sem lançamento.

Cada arquivo em `app/(campo)/` já tem no topo um resumo do que falta. Este
documento é o detalhe.

---

## 1. Caderno de campo — principal

O módulo mais usado. É por ele que se começa.

**Telas:** lista de apontamentos → lançamento → detalhe.

**O lançamento** manda `POST /apontamentos` com:

| Campo | Obrigatório | Observação |
|---|---|---|
| `tipo` | sim | `aplicacao`, `nutricao`, `tratos_culturais`, `colheita`, `abastecimento`, `outro` |
| `talhao_id` | sim | vem do cache `talhoes` |
| `atividade_id` | não | cache `atividades` |
| `maquina_id` | não | cache `maquinas` |
| `data` | não | padrão: agora |

O servidor resolve sozinho o responsável, a safra e a fase fenológica. Não
mande esses campos.

**Preencha o que for previsível.** A tela deve abrir com hoje, com o último
talhão usado e com a atividade mais frequente daquela pessoa. Quem lança trinta
apontamentos por dia não preenche seis campos em cada um — e se tiver de
preencher, vai preencher errado ou deixar de lançar.

**A lista** lê do cache `apontamentos_abertos` (que é módulo de retrato) e da
fila local. Mostre os dois juntos, com o pendente marcado: para quem lançou,
os dois são "o que eu fiz hoje".

**Concluir um serviço:** `POST /apontamentos/{id}/concluir` e
`/apontamentos/{id}/producao`.

---

## 2. Mapa da fazenda — principal

**Telas:** lista de talhões → ficha do talhão → mapa.

A lista já lê do cache e funciona. Falta:

**O mapa desenhado.** `react-native-maps` é o caminho mais curto. Antes de
fechar a escolha, **verifique se ele guarda os blocos do mapa para uso
offline** — sem isso a tela fica cinza justamente onde ela mais precisa
funcionar.

**A ficha do talhão**, com a fase fenológica do cache `fenologia`: nome da
fase, dias desde a poda, volume de irrigação recomendado.

**Marcar posição.** Use `expo-location`. Duas coisas:

- **Mostre a precisão em metros na tela.** Um ponto com 40 m de erro não serve
  para dizer em que talhão a pessoa estava, e quem decide se confia é o
  produtor, não o aplicativo.
- **GPS demora.** Mostre que está procurando, com a precisão melhorando, em
  vez de travar esperando o ponto perfeito.

---

## 3. Packing house — principal

**Telas:** hub → recepção → apontar (bipagem) → romaneio.

Rotas: `GET /packing/contexto`, `/packing/recepcao/pendentes`,
`/packing/apontar/tally`, `/packing/romaneio`; `POST /packing/recepcao`,
`/packing/recepcao/avaliar`, `/packing/apontar/beep`.

**Comece pela bipagem.** É a tela mais usada do módulo, e a mais sensível ao
desenho: a pessoa está com o crachá ou a caixa na mão, repetindo o gesto
centenas de vezes por turno. Campo em cima, teclado já aberto, aceitando
pedaço do código. Se o aparelho tiver leitor de código de barras, melhor
ainda.

**Erros de bipagem têm códigos próprios** — `cracha_invalido`,
`posto_sem_atividade`, `beep_recusado`, `sem_recepcao`, `unidade_invalida`.
Todos são rejeição definitiva: o operador corrige no sistema web e bipa de
novo. Mostre o motivo, não "erro ao enviar".

**Diferença importante:** no packing o recorte é o **galpão inteiro**, não o
autor. O lote que a pessoa vai embalar foi recebido por outra, no turno
anterior.

---

## 4. Financeiro — consulta, só leitura

Uma tela, lendo do módulo `financeiro` (que é **retrato**, não delta): títulos
a pagar e a receber, com filtro por tipo e período.

**Não há escrita neste módulo**, e isso é decisão de projeto, não pendência.
Quem movimenta dinheiro faz isso no sistema de gestão, sentado, com o
documento na mão. O celular no meio do talhão mostra o número para quem
precisa decidir na hora — e só.

Se aparecer pedido de "dar baixa pelo app", ele passa por decisão conjunta
antes de virar código.

**Não invente saldo.** Somar os títulos e chamar o resultado de saldo produz
um número parecido com o certo — que é pior do que não ter número nenhum,
porque alguém vai decidir com ele.

---

## 5. Relatórios — consulta, só leitura

Os módulos de consulta do sync já trazem os dados: `estoque`,
`estoque_movimentacoes`, `compras_pedidos`, `cargas_colheita`.

**Faça telas de consulta simples**, lendo do cache. Não monte um motor de
relatórios no aplicativo: relatório de verdade é do sistema web, onde há tela
grande e a pessoa está sentada.

---

## A hierarquia

O ERP tem perfis e permissões (`modulo.acao`), e a lista da pessoa vem no
login.

Use para não desenhar botão que vai dar 403. **E não confie nela para nada
além disso** — quem garante é o servidor, que confere a cada requisição.

Perfis que importam para o aplicativo: operador (lança o próprio trabalho),
encarregado (a equipe), técnico (campo e monitoramento), packing (o galpão),
gestor e proprietário (tudo).

---

## O que **não** inventar

Estes dependem de regras que vivem no ERP:

- fórmulas de custo, rendimento, produtividade, premiação;
- saldo e projeção de caixa;
- prazos legais de qualquer natureza;
- conteúdo de relatório.

Se uma tela precisar de um desses, **pergunte**.

---

## Ordem sugerida

1. **Caderno de campo**, caminho completo: lançar offline, ver na fila, subir,
   aparecer na lista. Isso exercita o motor inteiro e é onde os problemas
   aparecem.
2. **Mapa**, ficha do talhão e marcação de posição.
3. **Packing**, começando pela bipagem.
4. Financeiro e Relatórios, que são as telas mais simples.

Faça o item 1 inteiro antes de começar o 2. Um módulo funcionando de ponta a
ponta ensina mais sobre este projeto do que cinco pela metade.
