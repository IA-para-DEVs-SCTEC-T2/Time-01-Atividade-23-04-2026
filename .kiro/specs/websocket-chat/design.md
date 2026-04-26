# Documento de Design — WebSocket Chat (SupportBot TechStore)

## Visão Geral

O módulo **WebSocket Chat** adiciona uma camada de transporte bidirecional em tempo real ao SupportBot da TechStore. Ele permite que clientes abram sessões persistentes via WebSocket, enviem mensagens e recebam respostas instantâneas do chatbot — sem polling HTTP.

A lógica de negócio existente (Classificador → Chat_Service → FAQ_Repository / Ticket_Service) é reutilizada integralmente. O WebSocket_Server atua exclusivamente como camada de transporte: recebe eventos JSON, delega ao serviço correto e devolve a resposta ao cliente via evento JSON.

A API REST existente (`POST /api/chat` e `POST /api/chat/ticket`) permanece inalterada e coexiste na mesma porta TCP.

---

## Arquitetura

O WebSocket_Server é integrado ao servidor HTTP Express existente via `http.Server` nativo do Node.js, compartilhando a mesma porta TCP. A biblioteca escolhida é **`ws`** (nativa, sem overhead de protocolo proprietário), já que o projeto não requer salas compartilhadas, namespaces ou reconexão automática — funcionalidades que justificariam o uso de socket.io.

```
Cliente WebSocket
       │  ws://host/ws/chat
       ▼
┌──────────────────────────────────────────────────────┐
│                   http.Server (Node.js)               │
│                                                      │
│   ┌─────────────────┐    ┌────────────────────────┐  │
│   │  Express App    │    │   WebSocket_Server     │  │
│   │  /api/*  (REST) │    │   /ws/chat  (WS)       │  │
│   └─────────────────┘    └──────────┬─────────────┘  │
└──────────────────────────────────────┼───────────────┘
                                       │
                          ┌────────────┴────────────┐
                          │                         │
                          ▼                         ▼
               ┌─────────────────┐      ┌─────────────────┐
               │   Chat_Service  │      │  Ticket_Service  │
               └────────┬────────┘      └─────────────────┘
                        │
               ┌────────┴────────┐
               ▼                 ▼
        ┌──────────┐    ┌────────────────┐
        │Classificad│    │ FAQ_Repository │
        │    or     │    └────────────────┘
        └──────┬────┘
               ▼
        ┌──────────────┐
        │Gemini_Client │
        └──────────────┘
```

**Fluxo de conexão:**
1. Cliente abre conexão WebSocket em `ws://host/ws/chat`.
2. WebSocket_Server gera `session_id` (UUID v4) e emite `session_started`.
3. Cliente envia eventos JSON com campo `tipo`.
4. WebSocket_Server roteia para o handler correto e emite resposta.
5. Ao desconectar, WebSocket_Server libera a sessão do mapa interno.

**Integração com Express:**
O `http.Server` é criado explicitamente em `src/index.js` a partir do `app` Express. O WebSocket_Server recebe esse `http.Server` como dependência injetada e registra o handler de upgrade de protocolo nele.

```
src/index.js
  └── cria http.Server a partir do app Express
  └── cria WebSocket_Server injetando http.Server, chat_service, ticket_service
  └── chama http_server.listen(port)
```

---

## Componentes e Interfaces

### `src/dominios/websocket/websocket_server.js`

Componente central do módulo. Gerencia o ciclo de vida das conexões e o roteamento de eventos.

```js
// Recebe dependências injetadas
function criar_websocket_server(http_server, chat_service, ticket_service) → { fechar() }
```

Responsabilidades:
- Instanciar `ws.WebSocketServer` com `{ server: http_server, path: '/ws/chat' }`.
- Gerar `session_id` (UUID v4) por conexão e emitir `session_started`.
- Manter mapa interno `Map<session_id, ws>` de sessões ativas.
- Rotear eventos recebidos para os handlers corretos.
- Capturar exceções por sessão sem afetar as demais.
- Liberar sessão do mapa ao receber evento `close` ou `error`.
- Expor método `fechar()` para shutdown ordenado.

### `src/dominios/websocket/event_handler.js`

Handlers puros para cada tipo de evento. Recebem os dados do evento e as dependências, retornam o evento de resposta a ser emitido. Sem acesso direto ao socket — facilitam testes unitários.

```js
async function handle_mensagem(dados, chat_service) → EventoResposta
async function handle_abrir_ticket(dados, ticket_service) → EventoResposta
function handle_evento_desconhecido(tipo) → EventoErro
function handle_json_invalido() → EventoErro
```

### `src/dominios/websocket/session_manager.js`

Gerencia o mapa de sessões ativas.

```js
function criar_session_manager() → {
  adicionar(session_id, socket),
  remover(session_id),
  obter(session_id),
  listar_ids(),
  fechar_todas()
}
```

### `src/utils/uuid.js`

Utilitário para geração de UUID v4 usando `crypto.randomUUID()` nativo do Node.js v22.

```js
function gerar_uuid_v4() → string
```

---

## Modelos de Dados

### Protocolo de Eventos (JSON)

Todos os eventos trocados entre cliente e servidor são objetos JSON com campo `tipo` obrigatório.

#### Eventos Cliente → Servidor

```js
// Envio de mensagem
{ "tipo": "mensagem", "texto": string }

// Abertura de ticket
{ "tipo": "abrir_ticket", "nome": string, "email": string, "descricao": string }
```

#### Eventos Servidor → Cliente

```js
// Sessão estabelecida
{ "tipo": "session_started", "session_id": string }

// Resposta do chatbot
{ "tipo": "resposta", "session_id": string, "texto": string }

// Ticket criado com sucesso
{ "tipo": "ticket_criado", "session_id": string, "id": number }

// Erro (sem encerrar sessão)
{ "tipo": "erro", "session_id": string, "mensagem": string }
```

### Mapa de Sessões (em memória)

```js
// Map<string, WebSocket>
// Chave: session_id (UUID v4)
// Valor: instância ws.WebSocket da conexão ativa
Map {
  "550e8400-e29b-41d4-a716-446655440000" → WebSocket,
  "6ba7b810-9dad-11d1-80b4-00c04fd430c8" → WebSocket,
  ...
}
```

Não há persistência de sessões — o mapa é exclusivamente em memória e reiniciado com o processo.

### Integração com Modelos Existentes

O WebSocket_Server não acessa modelos Sequelize diretamente. Toda persistência é delegada ao `ticket_service` existente, que já encapsula o modelo `Ticket`.

---

## Propriedades de Corretude

*Uma propriedade é uma característica ou comportamento que deve ser verdadeiro em todas as execuções válidas do sistema — essencialmente, uma declaração formal sobre o que o sistema deve fazer. Propriedades servem como ponte entre especificações legíveis por humanos e garantias de corretude verificáveis por máquina.*

### Propriedade 1: Unicidade de session_id por conexão

*Para qualquer* conjunto de conexões WebSocket simultâneas, cada conexão deve receber um `session_id` distinto no formato UUID v4 (`xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`).

**Valida: Requisitos 1.2, 1.5**

### Propriedade 2: Limpeza de sessão ao encerrar conexão

*Para qualquer* sessão ativa, ao encerrar a conexão WebSocket (seja por fechamento normal ou por erro inesperado), o `session_id` correspondente deve ser removido do mapa de sessões ativas.

**Valida: Requisitos 1.4, 1.6**

### Propriedade 3: Preservação do texto FAQ sem modificação

*Para qualquer* texto retornado pelo Chat_Service mockado com tipo `faq`, o evento `resposta` emitido ao cliente deve conter exatamente o mesmo texto, sem adição, remoção ou modificação de conteúdo.

**Valida: Requisito 2.5**

### Propriedade 4: Validação de mensagem — texto inválido resulta em evento erro sem encerrar sessão

*Para qualquer* evento `mensagem` onde o campo `texto` está ausente, é uma string vazia, é composto inteiramente de espaços em branco, ou possui comprimento maior que 1000 caracteres, o WebSocket_Server deve emitir um evento `erro` ao cliente e a sessão deve permanecer ativa no mapa de sessões.

**Valida: Requisitos 2.3, 2.4**

### Propriedade 5: Validação de ticket — campos inválidos resultam em evento erro sem encerrar sessão

*Para qualquer* evento `abrir_ticket` onde ao menos um dos campos `nome`, `email` ou `descricao` está ausente, vazio, ou onde `email` não está no formato de endereço de e-mail válido, o WebSocket_Server deve emitir um evento `erro` ao cliente e a sessão deve permanecer ativa no mapa de sessões.

**Valida: Requisitos 3.2, 3.3**

### Propriedade 6: Criação de ticket com dados válidos emite ticket_criado com id correto

*Para qualquer* combinação válida de `nome` (string não-vazia), `email` (formato válido) e `descricao` (string não-vazia), o WebSocket_Server deve invocar o Ticket_Service e emitir um evento `ticket_criado` contendo o `id` retornado pelo Ticket_Service mockado.

**Valida: Requisito 3.1**

### Propriedade 7: Validação de protocolo — eventos inválidos resultam em evento erro sem encerrar sessão

*Para qualquer* mensagem recebida que não seja JSON válido, ou que seja JSON válido mas sem campo `tipo`, ou com campo `tipo` vazio, ou com valor de `tipo` não reconhecido pelo servidor, o WebSocket_Server deve emitir um evento `erro` ao cliente e a sessão deve permanecer ativa no mapa de sessões.

**Valida: Requisitos 4.2, 4.3, 4.4**

### Propriedade 8: Invariante session_id em todos os eventos emitidos

*Para qualquer* evento emitido pelo WebSocket_Server ao cliente (`resposta`, `erro`, `ticket_criado`), o campo `session_id` deve estar presente e ser igual ao UUID da sessão ativa.

**Valida: Requisito 4.5**

### Propriedade 9: Round-trip de serialização JSON dos eventos

*Para qualquer* evento de saída válido gerado pelo WebSocket_Server, aplicar `JSON.stringify` seguido de `JSON.parse` deve produzir um objeto com os mesmos campos e valores do original.

**Valida: Requisitos 4.1, 7.4**

### Propriedade 10: Isolamento de sessões sob falha

*Para qualquer* conjunto de sessões ativas, quando uma exceção ocorre durante o processamento de um evento em uma sessão específica, as demais sessões devem permanecer ativas no mapa de sessões e continuar processando eventos normalmente.

**Valida: Requisitos 6.1, 6.2, 6.3**

---

## Tratamento de Erros

| Situação | Evento Emitido | Campo `mensagem` | Encerra Sessão? |
|---|---|---|---|
| JSON inválido recebido | `erro` | "Formato de mensagem inválido. Envie um JSON válido." | Não |
| Campo `tipo` ausente ou vazio | `erro` | "O campo 'tipo' é obrigatório." | Não |
| Tipo de evento desconhecido | `erro` | "Tipo de evento não reconhecido: {tipo}" | Não |
| Campo `texto` ausente ou vazio | `erro` | "O campo 'texto' é obrigatório e não pode estar vazio." | Não |
| Campo `texto` > 1000 caracteres | `erro` | "A mensagem não pode exceder 1000 caracteres." | Não |
| Campos obrigatórios do ticket ausentes | `erro` | "Os campos nome, email e descricao são obrigatórios." | Não |
| Email inválido no ticket | `erro` | "O campo email deve conter um endereço de e-mail válido." | Não |
| Falha no Ticket_Service | `erro` | "Erro interno ao registrar o ticket. Tente novamente." | Não |
| Exceção não tratada no handler | `erro` | "Erro interno ao processar a solicitação." | Não |

**Regras gerais:**
- Nenhum erro encerra a sessão WebSocket — o cliente pode continuar enviando eventos.
- Todas as exceções são capturadas por sessão com `try/catch` no loop de processamento de eventos.
- Erros são registrados com `console.error` incluindo stack trace completo.
- Erros em uma sessão nunca propagam para outras sessões.
- O `error_handler` Express existente não é utilizado na camada WebSocket — cada sessão tem seu próprio tratamento.

---

## Estratégia de Testes

### Abordagem Dual

Os testes combinam testes de exemplo (casos concretos) e testes baseados em propriedades (cobertura ampla de inputs via `fast-check`, já presente no `package.json`).

### Testes Baseados em Propriedades (fast-check)

Cada propriedade do design é implementada como um teste com mínimo de 100 iterações. O Chat_Service e o Ticket_Service são sempre mockados. Não há conexão real de WebSocket nos testes de propriedade — os handlers são testados como funções puras.

| Arquivo | Propriedades Cobertas |
|---|---|
| `src/tests/test_websocket_session.js` | Propriedades 1, 2 |
| `src/tests/test_websocket_mensagem.js` | Propriedades 3, 4 |
| `src/tests/test_websocket_ticket.js` | Propriedades 5, 6 |
| `src/tests/test_websocket_protocolo.js` | Propriedades 7, 8, 9 |
| `src/tests/test_websocket_resiliencia.js` | Propriedade 10 |

Tag de referência por teste:
```js
// Feature: websocket-chat, Propriedade 3: Preservação do texto FAQ sem modificação
```

Configuração mínima de iterações:
```js
fc.assert(fc.property(...), { numRuns: 100 })
```

### Testes de Exemplo (Jest)

| Arquivo | Casos Cobertos |
|---|---|
| `src/tests/test_websocket_server.js` | Conexão, session_started, shutdown ordenado, WEBSOCKET_ENABLED=false |
| `src/tests/test_websocket_mensagem.js` | Fluxo FAQ completo, fluxo desconhecida, falha no Chat_Service |
| `src/tests/test_websocket_ticket.js` | Criação com sucesso, falha no Ticket_Service |
| `src/tests/test_websocket_protocolo.js` | JSON inválido, tipo desconhecido, tipo ausente |

### Regras de Mock

- `chat_service` e `ticket_service` são sempre injetados como dependências — nunca importados diretamente nos testes.
- `gemini_client` nunca é chamado nos testes do WebSocket_Server — o mock do `chat_service` absorve essa dependência.
- Os handlers de evento (`event_handler.js`) são testados como funções puras, sem instanciar o WebSocket_Server completo.
- Testes de integração opcionais usam `ws` client real contra servidor em porta efêmera.

### Coexistência com REST

Os testes existentes da API REST (`test_chat_controller.js`, `test_ticket_service.js`, etc.) não são modificados. A adição do WebSocket_Server não altera o comportamento do `app` Express — apenas o `http.Server` em `src/index.js` é modificado para registrar o WebSocket_Server.
