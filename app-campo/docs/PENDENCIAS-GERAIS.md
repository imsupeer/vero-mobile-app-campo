# Pendências gerais

Este documento retrata o estado atual do aplicativo. O núcleo offline e os
cinco módulos previstos para a primeira etapa já possuem telas funcionais; o
trabalho restante está concentrado em validação integrada, robustez offline do
Packing House e módulos adicionais oferecidos pelo ERP.

## Implementado

### Base do aplicativo

- autenticação real, sessão armazenada e permissões por perfil;
- saída pelo cabeçalho, com confirmação adicional quando a fila possui itens;
- banco SQLite local;
- sincronização incremental de subida e descida;
- fila offline com backoff, idempotência por `client_uuid`, dependência entre
  pai e anexo, tombstones e recuperação de itens presos;
- tela da fila com pendências, recusas e motivo da recusa;
- identidade visual VERO e navegação por módulos.

### Caderno de campo

- lista combinando registros do servidor e itens locais pendentes;
- formulário com tipo, talhão, atividade, máquina, data e observação;
- preenchimento de talhão e atividade a partir do uso recente;
- foto por câmera ou galeria;
- envio multipart do anexo depois da confirmação do apontamento pai;
- detalhe, lançamento de produção e conclusão do serviço.

### Mapa da fazenda

- desenho offline de polígonos GeoJSON e fallback por centroides;
- estados por talhão, ficha agronômica e dados fenológicos;
- dias desde a poda, recomendação de irrigação e indicadores;
- posição GPS e precisão em metros.

O desenho depende de `/sync/talhoes` entregar a geometria como GeoJSON. A
correção de `ST_AsGeoJSON(...)` no ERP continua sendo uma dependência externa.

### Packing House

- hub de processos;
- configuração do posto e consulta de romaneio;
- bipagem por câmera, leitor físico ou digitação;
- tally da produção, mensagens específicas de recusa e fila offline de bipes;
- recepção de cargas, avaliação de gates e registro da recepção.

Parte das consultas do Packing ainda chama a API diretamente. Para cumprir por
completo a arquitetura offline-first, contexto, pendências, romaneios, gates e
tally precisam de estratégia de cache e disponibilidade definida.

### Financeiro

- consulta offline de títulos a pagar e receber;
- filtros por tipo e período;
- indicação de vencidos usando o campo fornecido pelo ERP;
- totais apenas sobre os títulos recebidos, sem inventar saldo contábil.

### Relatórios

- catálogo condicionado às permissões;
- tabela genérica com busca e formatação por tipo;
- consultas de estoque, movimentações, pedidos de compra e cargas de colheita.

## Sincronização consumida atualmente

O motor baixa 13 módulos:

`talhoes`, `safras`, `atividades`, `maquinas`, `fenologia`,
`apontamentos_abertos`, `colaboradores`, `alertas`, `financeiro`, `estoque`,
`estoque_movimentacoes`, `compras_pedidos` e `cargas_colheita`.

As escritas implementadas são:

- `POST /apontamentos`;
- `POST /apontamentos/{id}/producao`;
- `POST /apontamentos/{id}/concluir`;
- `POST /anexos` via multipart;
- `POST /packing/apontar/beep`;
- `POST /packing/recepcao/avaliar`;
- `POST /packing/recepcao`.

## Pendências prioritárias

1. Executar o roteiro completo em Android: sincronizar, entrar em modo avião,
   criar registros, matar o processo, reabrir, reconectar e conferir no ERP que
   cada registro chegou uma única vez.
2. Validar login, expiração de token, 401/403 e perfis com combinações de
   permissões diferentes.
3. Validar fotos multipart em aparelho real, incluindo retomada, arquivo grande
   e falha depois da confirmação do apontamento pai.
4. Definir e implementar o comportamento offline das consultas do Packing.
5. Corrigir ou confirmar no ERP as pendências de geometria, `json_encode` e o
   roteamento `/api/v1/` no ambiente de laboratório.

## Módulos adicionais ainda não implementados

- aplicações de defensivos e assinaturas;
- MIP e monitoramento fitossanitário;
- irrigação;
- colheita e criação de cargas;
- máquinas, horímetro e abastecimento;
- solicitações, aprovação e recebimento de compras;
- recebimentos e operações de estoque;
- reconhecimento de alertas;
- parâmetros e calculadora de mão de obra;
- notificações push;
- assistente e transcrição por voz.

## Pendências do ERP

- `/sync/talhoes` deve retornar a geometria com `ST_AsGeoJSON(...)`;
- `api_ok()` deve tratar explicitamente falhas de `json_encode`;
- o ambiente `lab` precisa encaminhar `/api/v1/` para a API, sem devolver HTML
  da aplicação web.

## Critério de conclusão

Um módulo só é considerado concluído depois de passar o roteiro offline de
[`ENTREGA.md`](ENTREGA.md). Compilar, abrir a tela e passar em testes unitários
não substitui a validação em aparelho e a conferência dos dados no ERP.
