# Compatibilidade com o ERP

Este documento relaciona o contrato disponível no ERP com o que o aplicativo
consome atualmente.

## Contrato já validado no ERP

| Prova | Resultado |
|---|---|
| `POST /auth/login` | token, usuário, permissões e envelope válidos |
| `GET /sync/{modulo}` | itens e `sync.server_time` |
| Delta com `?desde=` | retorna apenas alterações |
| `POST /apontamentos` | criação confirmada com HTTP 201 |
| Reenvio do mesmo `client_uuid` | retorna o mesmo registro sem duplicar |

A validação histórica acima comprova o protocolo básico. As rotas acrescentadas
depois ainda precisam do roteiro integrado descrito em [`ENTREGA.md`](ENTREGA.md).

## Leitura: 13 de 23 módulos

O motor em `app/src/sinc/motor.ts` baixa atualmente:

- `talhoes`;
- `safras`;
- `atividades`;
- `maquinas`;
- `fenologia`;
- `apontamentos_abertos`;
- `colaboradores`;
- `alertas`;
- `financeiro`;
- `estoque`;
- `estoque_movimentacoes`;
- `compras_pedidos`;
- `cargas_colheita`.

### Disponíveis e ainda não sincronizados

| Módulo | Uso previsto |
|---|---|
| `aplicacoes` | aplicações de defensivos |
| `mip_referencias`, `mip_recebidos`, `mip_pontos` | monitoramento fitossanitário |
| `colheitas_pendentes` | fluxo operacional da colheita |
| `fornecedores`, `compras_solicitacoes`, `compras_aprovacoes_pendentes` | compras e aprovações |
| `parametros`, `calc_parametros` | parâmetros e cálculo de mão de obra |

Um módulo só deve entrar em `MODULOS_LEITURA` quando houver uma tela que o
consuma. Cada módulo acrescenta uma requisição a toda sincronização em uma rede
que frequentemente é limitada.

## Escritas utilizadas

### Caderno de campo

- `POST /apontamentos`;
- `POST /apontamentos/{id}/producao`;
- `POST /apontamentos/{id}/concluir`;
- `POST /anexos` por multipart.

As quatro rotas usam a fila local. O anexo aguarda a confirmação do apontamento
pai antes de ser enviado.

### Packing House

- `POST /packing/apontar/beep`;
- `POST /packing/recepcao/avaliar`;
- `POST /packing/recepcao`.

Bipes e recepções são enfileirados quando a falta de conexão é detectada. A
avaliação de gates e várias consultas do Packing ainda exigem rede e precisam
de uma política offline definida.

## Rotas disponíveis e ainda não utilizadas

| Rota | Módulo |
|---|---|
| `POST /colheitas` · `/colheitas/{id}/realizado` | Colheita |
| `POST /cargas` | Cargas e romaneio |
| `POST /monitoramentos` · `/monitoramentos/enviar` | MIP |
| `POST /aplicacoes` · `/confirmar` · `/assinar` | Aplicações e assinatura |
| `POST /alertas/{id}/reconhecer` | Alertas |
| `POST /irrigacao/apontamentos` | Irrigação |
| `POST /atividades/{id}/status` | Tarefas |
| `POST /maquinas/{id}/horimetro` · `/abastecimento` | Máquinas |
| `POST /compras/solicitacoes` · `/pedidos/{id}/aprovar|rejeitar|receber` | Compras |
| `POST /recebimentos/confirmar` | Estoque |
| `POST /push/registrar` | Notificações |
| `POST /ia/chat` · `/ia/transcrever` | Assistente e voz |

## Cobertura funcional atual

Já existem interfaces para Caderno de campo, Mapa da fazenda, Packing House,
Financeiro e Relatórios. Isso substitui o estado antigo de placeholders.

A cobertura não representa todo o ERP: aplicações, MIP, irrigação, colheita,
operações de máquinas, fluxo completo de compras e estoque, notificações e voz
continuam fora do aplicativo.

## Dependências conhecidas do ERP

### Geometria dos talhões

`GET /sync/talhoes` precisa serializar a coluna espacial com
`ST_AsGeoJSON(t.geometria)`. Selecionar o binário MySQL diretamente pode fazer
`json_encode` falhar e produzir uma resposta HTTP 200 sem corpo utilizável.

### Falha de serialização

`api_ok()` deve verificar o retorno de `json_encode` e responder com erro
explícito. Sem isso, qualquer byte inválido pode transformar uma falha de dados
em uma resposta vazia difícil de diagnosticar.

### Ambiente de laboratório

O nginx do ambiente `lab` deve encaminhar `/api/v1/` para a API. Quando essa
regra não existe, o endereço devolve HTML da aplicação web em vez do envelope
JSON esperado pelo aplicativo.

## Aplicativo de referência

O `vero_campo` continua sendo referência para regras de negócio e casos de erro
dos módulos ainda não portados. A interface deste projeto segue a identidade
visual atual do VERO, mas as regras operacionais devem ser conferidas no app de
campo já utilizado antes de implementar novas rotas.
