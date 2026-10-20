# A API do ERP

Tudo fica sob `https://<servidor>/api/v1`.

---

## O envelope

Há **um** formato de resposta, e ele não muda de rota para rota.

**Deu certo:**

```json
{
  "ok": true,
  "data": { "...": "..." },
  "message": "Registrado.",
  "sync": { "server_time": "2026-09-25 18:40:11" }
}
```

**Deu errado:**

```json
{ "ok": false, "error": "talhao_invalido", "message": "Válvula não encontrado." }
```

Duas coisas para gravar:

- **`error` é para o programa, `message` é para a pessoa.** Decida no código
  olhando o `error`; mostre na tela a `message`. Nunca o contrário — a
  mensagem muda com o tempo, o código não.
- **`sync.server_time` é o relógio do banco**, e é ele que vira o cursor da
  sincronização. Nunca use o relógio do aparelho para isso. O porquê está em
  [SINCRONIZACAO.md](SINCRONIZACAO.md).

Quem desembrulha tudo isso é `src/api/cliente.ts`. Nenhuma tela deve chamar
`fetch` direto.

---

## Entrar

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "operador@cliente.com",
  "senha": "...",
  "device": { "nome": "Galaxy A14 do João", "lembrar": true }
}
```

Resposta:

```json
{ "ok": true, "data": {
  "token": "a1b2...64 caracteres hexadecimais",
  "usuario": { "id": 12, "nome": "João", "perfil": "operador", "permissoes": ["agro.apontamentos_campo.editar", "..."] }
} }
```

Daí em diante, em toda requisição:

```http
Authorization: Bearer a1b2...
```

**`device.nome` não é burocracia.** O token é criado com esse nome, e é por
ele que se revoga o acesso de **um** celular perdido sem derrubar a pessoa dos
outros aparelhos. Mande algo que identifique o aparelho — o projeto já monta
isso a partir de `expo-device`.

`device.lembrar: true` dá um prazo longo ao token; `false` dá um dia.

| Rota | O que faz |
|---|---|
| `POST /auth/login` | A única rota pública |
| `POST /auth/refresh` | Estica o prazo. Há um teto absoluto desde a criação |
| `POST /auth/logout` | Revoga só o token deste aparelho |

O token é **opaco**: não carrega informação dentro de si, quem sabe o que ele
vale é o servidor. É isso que permite revogar de verdade — um token assinado
só expira, não se cancela.

### Use `permissoes` para desenhar o menu

A lista que vem no login diz o que a pessoa pode. Use-a para não mostrar botão
que vai dar 403.

E entenda o limite: **esconder botão é conforto de tela, não segurança.** O
servidor verifica tudo de novo a cada requisição e não confia em nada que o
aplicativo mande.

---

## Códigos de erro

Os que valem tratamento específico:

| Código | HTTP | O que fazer |
|---|---|---|
| `credenciais_invalidas` | 401 | Mostrar na tela de login |
| `muitas_tentativas` | 429 | Esperar e avisar |
| `token_expirado`, `token_invalido`, `token_revogado`, `token_ausente` | 401 | **Derrubar a sessão** e voltar ao login |
| `sem_permissao` | 403 | A pessoa não tem acesso àquele módulo |
| `campo_obrigatorio` | 422 | Falta campo — corrigir e reenviar |
| `client_uuid_invalido` | 422 | Envio sem identificador |
| `talhao_invalido`, `atividade_invalida`, `maquina_invalida` | 422 | Referência que não existe no cliente |
| `tipo_invalido` | 422 | Valor fora da lista aceita |
| `conflito` | 409 | O escritório mexeu depois. **Não reenviar** |
| `erro_interno` | 500 | Já está no log do servidor |

Os de sessão o `cliente.ts` já trata sozinho — ele avisa a camada de sessão e
ela limpa tudo.

A lista completa de códigos que **nunca devem ser reenviados** está em
`src/sinc/motor.ts`, na constante `REJEICOES_DEFINITIVAS`.

---

## Ler: `GET /sync/{modulo}`

```http
GET /api/v1/sync/talhoes?desde=2026-09-20 14:03:11
```

Resposta: `data.itens`, uma lista. Cada item tem pelo menos `id` e
`updated_at`. Sem `?desde=`, vem tudo (a primeira carga).

Três regras do canal:

- **Máximo 500 itens por resposta.** Veio 500? Peça de novo com `desde` igual
  ao `updated_at` do último item.
- **`_excluido: 1`** marca o que saiu do conjunto. Remova do cache local.
- **O formato do `desde`** é `YYYY-MM-DD` ou `YYYY-MM-DD HH:MM:SS`. Qualquer
  outra coisa devolve `desde_invalido`.

### Os 23 módulos

| Módulo | O que traz |
|---|---|
| `talhoes` | As válvulas/quadras. **A base de tudo** |
| `safras` | Safras cadastradas |
| `fenologia` | Fase por variedade de cada válvula (dia 0 = poda) |
| `atividades` | O que se faz em campo |
| `apontamentos_abertos` | Serviços já iniciados, aguardando conclusão |
| `colheitas_pendentes` | Colheitas lançadas no escritório |
| `cargas_colheita` | Romaneios de carga |
| `colaboradores` | Pessoas. **Sem salário**, por decisão de privacidade |
| `alertas` | Alertas fitossanitários |
| `aplicacoes` | Fila de DFs do campo |
| `mip_referencias`, `mip_recebidos`, `mip_pontos` | Monitoramento |
| `estoque`, `estoque_movimentacoes` | Saldos e extrato, sem custos |
| `maquinas` | Frota |
| `fornecedores` | |
| `compras_solicitacoes`, `compras_pedidos`, `compras_aprovacoes_pendentes` | Compras |
| `financeiro` | Títulos a pagar e receber |
| `parametros`, `calc_parametros` | Configuração e parâmetros de cálculo |

**Vários exigem permissão.** Quem não tem recebe 403 — e isso **não é erro**,
é o módulo não se aplicar àquela pessoa. O motor já pula e segue.

Comece com poucos módulos. Cada um é uma chamada a mais em toda
sincronização, e a rede do campo é escassa.

---

## Escrever: `POST` com `client_uuid`

Toda rota de escrita exige `client_uuid` no corpo — um UUID v4 **gerado no
aparelho**, no momento em que a pessoa salvou, ainda offline.

```http
POST /api/v1/apontamentos

{
  "client_uuid": "3f2a...",
  "tipo": "colheita",
  "talhao_id": 42,
  "atividade_id": 7,
  "data": "2026-09-25 06:30:00"
}
```

- primeira vez → **201**
- mesmo `client_uuid` de novo → **200**, `message: "Registro já recebido
  (idempotente)."`, e o registro que já existia

**Os dois significam sucesso.** Tire o item da fila nos dois casos.

Sem isso, o fechamento do mês soma colheita que não aconteceu e alguém recebe
premiação sobre ela.

### As rotas de escrita

| Rota | Permissão exigida |
|---|---|
| `POST /apontamentos` | `agro.apontamentos_campo.editar` |
| `POST /apontamentos/{id}/producao` · `/concluir` | idem |
| `POST /colheitas` · `/colheitas/{id}/realizado` | `agro.colheita.editar` |
| `POST /cargas` | `agro.romaneios_colheita.editar` |
| `POST /monitoramentos` · `/monitoramentos/enviar` | `mip.monitoramentos.editar` |
| `POST /aplicacoes` · `/confirmar` · `/assinar` | `mip.aplicacoes_defensivos.editar` |
| `POST /alertas/{id}/reconhecer` | `mip.alertas_fitossanitarios.editar` |
| `POST /irrigacao/apontamentos` | `irrigacao.apontamentos_irrigacao.editar` |
| `POST /maquinas/{id}/horimetro` · `/abastecimento` | `maquinas.horimetro.editar` |
| `POST /compras/solicitacoes` | `compras.solicitacoes_compra.editar` |
| `POST /compras/pedidos/{id}/aprovar` · `/rejeitar` | `compras.aprovacoes.editar` |
| `POST /compras/pedidos/{id}/receber` | `compras.recebimentos.editar` |
| `POST /recebimentos/confirmar` | `estoque.entradas.editar` |
| `POST /anexos` | (do registro pai) |

**Packing house** tem rotas próprias: `GET /packing/contexto`,
`/packing/recepcao/pendentes`, `/packing/apontar/tally`, `/packing/romaneio`;
`POST /packing/recepcao`, `/packing/recepcao/avaliar`, `/packing/apontar/beep`.

### O `POST /apontamentos` em detalhe

Obrigatórios: `client_uuid`, `tipo`, `talhao_id`.

`tipo` só aceita: `aplicacao`, `nutricao`, `tratos_culturais`, `colheita`,
`abastecimento`, `outro`. **Irrigação não entra aqui** — use
`POST /irrigacao/apontamentos`.

Opcionais: `atividade_id`, `maquina_id`, `data` (padrão: agora).

O servidor resolve sozinho o responsável (pelo usuário do token), a safra da
válvula e a fase fenológica. Não mande esses campos.

---

## Anexos (foto)

`POST /anexos` é **multipart**, não JSON — é a única exceção. Campos:
`arquivo`, `client_uuid`, `origem_uuid` (o `client_uuid` do registro pai),
`origem_tipo` e `descricao`.

O servidor resolve `origem_uuid` → id do registro. Por isso a foto tem de
subir **depois** do pai: a fila já ordena assim, pelo campo `pai_uuid`.
