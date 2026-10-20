# Sincronização

O documento mais importante deste projeto. Leia antes de mexer em
`src/sinc/motor.ts` ou `src/sinc/fila.ts`.

---

## O desenho

Duas direções, independentes. Numa conexão ruim, metade dar certo é melhor
que nada.

```
        SOBE                              DESCE
  fila do aparelho  ──POST──►        ──GET /sync/{modulo}──►
  (o que a pessoa fez)                (o que mudou no ERP)
```

Uma rodada **sobe primeiro, desce depois**. O trabalho da pessoa é o que se
perde se o aparelho quebrar ou a bateria acabar; o cadastro está a salvo no
servidor e pode esperar a próxima rodada.

A rodada dispara: ao abrir o aplicativo, de minuto em minuto com ele aberto, e
toda vez que ele volta do segundo plano — este último é o momento mais
provável de haver rede de novo, porque a pessoa acabou de tirar o celular do
bolso.

---

## O ciclo de um registro

1. **A pessoa salva.** O aplicativo gera um `client_uuid` (v4), grava na
   tabela `fila` do SQLite local e **a tela já responde**. Nenhuma rede
   envolvida.
2. **Há sinal.** O motor pega os pendentes e manda um `POST` por item.
3. **O servidor responde** 201 (novo) ou 200 (já recebido). Nos dois casos o
   item sai da fila.
4. **Deu erro?** Depende de qual — ver a classificação abaixo.

Estados na tabela `fila`:

| Estado | Significa |
|---|---|
| `pendente` | Esperando envio |
| `enviando` | Em trânsito agora |
| `confirmado` | O servidor recebeu |
| `erro` | Falhou, vai tentar de novo depois (backoff) |
| `falha` | O servidor recusou de vez. **Precisa da pessoa** |

---

## A classificação do erro

É isto que separa um aplicativo que funciona no campo de um que enlouquece o
operador.

**Sem conexão** → volta a `pendente`, **sem contar tentativa**, e para a fila.

Contar tentativa aqui seria punir o operador pelo lugar onde ele trabalha: uma
semana sem sinal estouraria o teto sozinha e descartaria trabalho perfeito.
Parar a fila também é intencional — se um falhou por rede, os próximos vão
falhar igual.

**Rejeição de regra de negócio** → vira `falha` na hora, sem retentativa.

Reenviar o mesmo conteúdo dá o mesmo resultado. A lista desses códigos está em
`REJEICOES_DEFINITIVAS`, em `motor.ts`. Sem ela, um apontamento com talhão
inválido tentaria de hora em hora para sempre, gastando bateria — e o operador
nunca saberia que precisa corrigir alguma coisa.

**Qualquer outro erro** → backoff exponencial: 1, 2, 4, 8, 16 minutos. Na
sexta falha vira `falha` e para.

---

## O que não pode ser quebrado

Cada item aqui existe por um problema que aconteceu de verdade, com o produtor
no telefone. Estão no código com o comentário ao lado.

### Cursor "do futuro"

O `server_time` já saiu do relógio do PHP, que roda três horas à frente do
banco. O cursor gravado ficava maior que qualquer `updated_at`, e **os
registros novos sumiam do delta por horas — sem erro nenhum aparecendo**.

O motor detecta (`desde > serverTime`) e refaz a carga cheia do módulo. O
servidor foi corrigido, a proteção fica.

### Tombstones

Item com `_excluido: 1` tem de ser **removido** do cache local. Sem isso o
cadastro do aparelho só cresce, e o talhão desativado há três semanas continua
aparecendo na lista e aceitando lançamento.

Uma sincronização que só sabe adicionar está sempre meio errada, e a metade
errada cresce com o tempo.

### Trava anti-laço na paginação

Se 500 itens tiverem o mesmo `updated_at`, o cursor não avança e o laço pede a
mesma página para sempre. O motor para quando o cursor não progride, e tem
teto de 20 páginas por módulo.

### Módulos de retrato

Alguns módulos devolvem o **conjunto atual inteiro**, sem delta:
`apontamentos_abertos`, `fenologia`, `colheitas_pendentes`,
`compras_aprovacoes_pendentes`, `financeiro`, `cargas_colheita`,
`calc_parametros`.

São filas de trabalho, não cadastro. Nesses, o cache é **substituído**, não
fundido — o que saiu do retrato tem de sumir da tela. Fundir deixaria o
operador olhando para uma tarefa que outra pessoa já concluiu.

### Recuperação de itens presos

Um travamento entre enviar e confirmar deixava o registro em `enviando` para
sempre: nem pendente, nem salvo. Ele sumia da tela sem ter subido.

`reidratarPresos()` roda na abertura e devolve esses à fila. Reenviar é
seguro — a idempotência por `client_uuid` garante que não duplica.

### Pai antes dos anexos

A foto referencia o registro pai pelo `client_uuid` dele. Se subir antes, o
servidor não acha o pai. A fila ordena por `pai_uuid IS NULL DESC`.

### Um módulo que falha não derruba os outros

Vários módulos exigem permissão, e quem não tem recebe 403. Isso é o caso
comum, não a exceção — não é erro, é o módulo não se aplicar àquela pessoa.
Ela deve seguir trabalhando.

---

## O que **você** precisa construir em cima disso

O motor está pronto. O que falta do lado das telas:

**Enfileirar do jeito certo.** Veja o exemplo em `app/(campo)/caderno.tsx`:

```ts
await enfileirar({
  tipo: 'apontamento',
  rota: '/apontamentos',
  payload: { tipo: 'colheita', talhao_id: 42, /* ... */ },
});
```

O `client_uuid` é gerado dentro do `enfileirar`. Não passe um.

**Ler sempre do cache.** `lerCache<Talhao>('talhoes')`, nunca `http.get` na
tela.

**Mostrar o estado.** A `FaixaSinc` já aparece quando há pendência ou recusa.
Coloque-a no topo de toda tela de lista.

**A tela da fila é de verdade**, e já existe. Ela mostra o que falta, deixa
tentar de novo e mostra o motivo da recusa. Sem ela a pessoa não tem como
saber se o trabalho da manhã está salvo, e vai perguntar isso todo dia para
alguém que também não sabe.

---

## O que fica por definir

**Edição offline do mesmo registro em dois aparelhos.** Hoje não acontece,
porque o operador só mexe no que ele mesmo lançou. Se o desenho mudar, traga a
pergunta antes de escolher uma regra.

**Anexos (fotos).** O contrato existe (`POST /anexos`, multipart) e a fila já
prevê o `pai_uuid`, mas o envio multipart ainda não está implementado neste
projeto. Quando for fazer, olhe `enviarAnexoMultipart` no aplicativo de
referência.
