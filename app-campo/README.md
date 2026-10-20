# App de Campo — novo aplicativo

Aplicativo móvel **React Native + Expo** (Android e iPhone, mesmo código).
Funciona **sem sinal** e sincroniza com o ERP quando houver rede.

```
[ este app ]  ←── HTTPS/JSON ──→  [ ERP · api/v1 ]
  no celular                       já existe e funciona
  banco local                      dono do dado
```

**Não há servidor intermediário.** O ERP é o dono do dado. Um segundo lugar
guardando o mesmo apontamento de colheita criaria um problema de
reconciliação que não se conserta depois — só se administra, para sempre.

---

## Documentação

Leia nesta ordem — a primeira página tem dez minutos e evita uma semana.

1. **[docs/COMECE-AQUI.md](docs/COMECE-AQUI.md)** — o projeto, quem usa, como rodar
2. **[docs/API-DO-ERP.md](docs/API-DO-ERP.md)** — envelope, login, erros, rotas, os 23 módulos
3. **[docs/SINCRONIZACAO.md](docs/SINCRONIZACAO.md)** — o offline e **o que não pode ser quebrado**
4. **[docs/O-QUE-CONSTRUIR.md](docs/O-QUE-CONSTRUIR.md)** — os módulos, tela a tela
5. **[docs/PADROES.md](docs/PADROES.md)** — código e interface
6. **[docs/COMPATIBILIDADE.md](docs/COMPATIBILIDADE.md)** — o que o ERP oferece × o que o app já usa
7. **[docs/ENTREGA.md](docs/ENTREGA.md)** — o roteiro de teste e a conferência final

---

## Começar

```bash
cd app
npm install
npx expo start
```

No primeiro uso o aplicativo pede o **código da empresa** — é ele que monta o
endereço do servidor (`https://<codigo>.verobyorigo.agr.br/api/v1`).

Para desenvolver contra um servidor local ou o laboratório, pule essa tela com
a variável de ambiente:

```bash
EXPO_PUBLIC_API_URL=https://lab.verobyorigo.agr.br/api/v1 npx expo start
```

Entre com uma conta do ERP: o login é o mesmo do sistema web
(`POST /auth/login` contra a tabela `usuarios`).

```bash
npm run tipos      # tsc --noEmit — precisa ficar limpo
```

---

## Como a sincronização funciona

Duas direções, e elas são independentes — numa conexão ruim, metade dar certo
é melhor que nada.

**Descer** (`GET /sync/{modulo}?desde=`): traz o que mudou desde a última vez.
Cada item tem `id` e `updated_at`; os que saíram do conjunto voltam com
`_excluido: 1` para serem removidos do cache local. Página de 500.

**Subir** (`POST /{rota}` com `client_uuid`): cada escrita da fila vai
separada. O servidor é idempotente por `client_uuid` — reenviar devolve o
registro que já existe em vez de criar outro.

A ordem de uma rodada é **sobe primeiro, desce depois**: o trabalho da pessoa
é o que se perde se o aparelho quebrar; o cadastro está a salvo no servidor.

Tudo isso está em [`app/src/sinc/motor.ts`](app/src/sinc/motor.ts), com o
porquê de cada proteção escrito ao lado.

---

## O que este projeto herdou do `vero_campo`

O `vero_campo` é o aplicativo de campo que já roda. O motor de sincronização
deste projeto foi **portado dele**, com tipagem, em vez de reescrito. Não é
preguiça: aquele código carrega correções de problemas que só aparecem em
campo, e reescrever do zero é reaprender cada um deles com o produtor no
telefone.

O que veio de lá, e por quê:

| Proteção | O problema que ela resolve |
|---|---|
| Cursor "do futuro" | O `server_time` saía do relógio do PHP, 3 h à frente do banco. Registros novos sumiam do delta por horas — **sem erro nenhum** |
| Tombstones (`_excluido`) | Sem eles o cache do aparelho só cresce, e o talhão desativado continua aceitando lançamento |
| Trava anti-laço na paginação | 500 itens com o mesmo `updated_at` fariam o cursor não avançar |
| Rejeições definitivas | Erro de regra de negócio nunca melhora com reenvio: viraria retentativa infinita, gastando bateria, sem a pessoa saber que precisa corrigir |
| `sem_conexao` não conta tentativa | Uma semana sem sinal estouraria o teto de tentativas sozinha e descartaria trabalho perfeito |
| Recuperação de itens presos | Travamento entre enviar e confirmar deixava o registro em `enviando` para sempre: nem pendente, nem salvo |
| Backoff 1→2→4→8→16 min | Insistir sem pausa em rede ruim é o que mata a bateria no meio do expediente |
| Pai antes dos anexos | Foto sem o apontamento dela não tem onde se prender |

Se for mexer em `motor.ts` ou `fila.ts`, leia o comentário antes. Cada um está
lá por um incidente.

---

## Estrutura

```
app/
  app/                    telas (expo-router)
    empresa.tsx           código da empresa (primeira abertura)
    entrar.tsx            login
    (campo)/              as abas, já filtradas por permissão
  src/
    api/
      cliente.ts          o envelope { ok, data, message, sync }
      ambiente.ts         qual servidor, a partir do código da empresa
      sessaoArmazenada.ts token no cofre do aparelho
      tipos.ts
    db/banco.ts           SQLite: cache, cursores e fila
    sinc/
      fila.ts             a fila de escrita, com backoff e estados
      motor.ts            o motor — leia este primeiro
      useSinc.tsx         o estado visível da sincronização
    ui/                   componentes, tema e a faixa de sincronização
```

---

## O que falta construir

As telas dos módulos. Cada arquivo em `app/(campo)/` diz no topo o que falta e
por quê.

| Módulo | Situação |
|---|---|
| Caderno de campo | Caminho de salvar pronto (é o padrão a seguir). Falta o formulário completo e a lista |
| Mapa da fazenda | Lista de talhões lê do cache. Falta o mapa desenhado e a ficha |
| Packing house | A fazer. Comece pela busca do código da etiqueta |
| Financeiro | A fazer. Só leitura |
| Relatórios | A fazer. Só leitura, **uma tela genérica** |

As rotas do ERP para cada um estão em `verohoje/api/v1/index.php`.

---

## As três regras

**1. A tela lê do banco do aparelho, nunca da rede.** A rede só alimenta o
banco, em segundo plano. Se uma tela sua só funciona conectada, refaça.

**2. Salvar nunca espera rede.** Enfileira e a tela já responde. Veja
`app/(campo)/caderno.tsx`.

**3. Nada sai da fila sem confirmação.** Se o envio falhar, o item fica. A
falha pode ter sido só a resposta que não voltou — o servidor talvez tenha
gravado. O `client_uuid` cuida do resto.

---

## Coisas que parecem exagero e não são

Estão em [`app/src/ui/tema.ts`](app/src/ui/tema.ts), com o motivo ao lado:
alvo de toque de 56 px (dedo de luva), nenhuma fonte menor que 15 (sol,
poeira, cinco da manhã), animações de 120–180 ms (aparelho fraco, gesto
repetido dezenas de vezes por dia) e o botão que encolhe ao tocar — a única
animação que nunca se remove, porque sem resposta imediata a pessoa toca de
novo e lança duas vezes.
