# Plano de Implementação: WebSocket Chat (SupportBot TechStore)

## Visão Geral

Implementação incremental do módulo WebSocket Chat em Node.js (v22), seguindo a arquitetura definida no design: utils → session_manager → event_handler → websocket_server → integração com index.js. Cada etapa integra o componente ao anterior, sem código órfão. A lógica de negócio existente (chat_service, ticket_service) é reutilizada via injeção de dependência.

## Tarefas

- [x] 1. Criar `src/utils/uuid.js`
  - Exportar função `gerar_uuid_v4()` usando `crypto.randomUUID()` nativo do Node.js v22
  - Não adicionar dependências externas — usar apenas o módulo `crypto` nativo
  - _Requisitos: 1.2_

- [x] 2. Implementar `src/dominios/websocket/session_manager.js`
  - [x] 2.1 Implementar o gerenciador de sessões
    - Exportar `criar_session_manager()` retornando `{ adicionar, remover, obter, listar_ids, fechar_todas }`
    - Manter mapa interno `Map<session_id, WebSocket>` em memória
    - `adicionar(session_id, socket)` — insere no mapa
    - `remover(session_id)` — remove do mapa; não lança erro se ausente
    - `obter(session_id)` — retorna o socket ou `undefined`
    - `listar_ids()` — retorna array com todos os session_ids ativos
    - `fechar_todas()` — chama `socket.terminate()` em cada entrada e limpa o mapa
    - _Requisitos: 1.3, 1.4, 1.5, 1.6, 6.4_

  - [ ]* 2.2 Escrever teste de propriedade — Propriedade 1: Unicidade de session_id por conexão
    - **Propriedade 1: Unicidade de session_id por conexão**
    - **Valida: Requisitos 1.2, 1.5**
    - Para qualquer conjunto de N UUIDs v4 gerados, todos devem ser distintos e corresponder ao formato `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`
    - Arquivo: `src/tests/test_websocket_session.js`
    - Tag: `// Feature: websocket-chat, Propriedade 1: Unicidade de session_id por conexão`
    - `fc.assert(fc.property(...), { numRuns: 100 })`

  - [ ]* 2.3 Escrever teste de propriedade — Propriedade 2: Limpeza de sessão ao encerrar conexão
    - **Propriedade 2: Limpeza de sessão ao encerrar conexão**
    - **Valida: Requisitos 1.4, 1.6**
    - Para qualquer session_id adicionado ao mapa, após chamar `remover(session_id)`, `obter(session_id)` deve retornar `undefined` e `listar_ids()` não deve conter o id removido
    - Arquivo: `src/tests/test_websocket_session.js`
    - `fc.assert(fc.property(...), { numRuns: 100 })`

- [x] 3. Implementar `src/dominios/websocket/event_handler.js`
  - [x] 3.1 Implementar os handlers de evento como funções puras
    - Exportar `handle_mensagem(dados, chat_service)`, `handle_abrir_ticket(dados, ticket_service)`, `handle_evento_desconhecido(tipo)`, `handle_json_invalido()`
    - `handle_mensagem`: validar `texto` (ausente/vazio → erro, > 1000 chars → erro); chamar `chat_service.processar_mensagem`; retornar evento `resposta` ou `erro`
    - `handle_abrir_ticket`: validar `nome`, `email` (formato), `descricao`; chamar `ticket_service.criar_ticket`; retornar evento `ticket_criado` ou `erro`
    - `handle_evento_desconhecido(tipo)`: retornar evento `erro` com mensagem `"Tipo de evento não reconhecido: {tipo}"`
    - `handle_json_invalido()`: retornar evento `erro` com mensagem `"Formato de mensagem inválido. Envie um JSON válido."`
    - Nenhum handler acessa o socket diretamente — apenas retornam o objeto de evento
    - _Requisitos: 2.1, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 4.2, 4.3, 4.4_

  - [ ]* 3.2 Escrever teste de propriedade — Propriedade 3: Preservação do texto FAQ sem modificação
    - **Propriedade 3: Preservação do texto FAQ sem modificação**
    - **Valida: Requisito 2.5**
    - Para qualquer texto retornado pelo mock do chat_service com tipo `faq`, o evento `resposta` retornado por `handle_mensagem` deve conter exatamente o mesmo texto
    - Arquivo: `src/tests/test_websocket_mensagem.js`
    - Tag: `// Feature: websocket-chat, Propriedade 3: Preservação do texto FAQ sem modificação`
    - `fc.assert(fc.property(...), { numRuns: 100 })`

  - [ ]* 3.3 Escrever teste de propriedade — Propriedade 4: Validação de mensagem — texto inválido resulta em evento erro sem encerrar sessão
    - **Propriedade 4: Validação de mensagem — texto inválido resulta em evento erro sem encerrar sessão**
    - **Valida: Requisitos 2.3, 2.4**
    - Para qualquer `texto` ausente, vazio, composto só de espaços ou com mais de 1000 caracteres, `handle_mensagem` deve retornar evento com `tipo: 'erro'`
    - Arquivo: `src/tests/test_websocket_mensagem.js`
    - `fc.assert(fc.property(...), { numRuns: 100 })`

  - [ ]* 3.4 Escrever teste de propriedade — Propriedade 5: Validação de ticket — campos inválidos resultam em evento erro sem encerrar sessão
    - **Propriedade 5: Validação de ticket — campos inválidos resultam em evento erro sem encerrar sessão**
    - **Valida: Requisitos 3.2, 3.3**
    - Para qualquer combinação de `nome`, `email` ou `descricao` ausente, vazio ou com email fora do formato válido, `handle_abrir_ticket` deve retornar evento com `tipo: 'erro'`
    - Arquivo: `src/tests/test_websocket_ticket.js`
    - Tag: `// Feature: websocket-chat, Propriedade 5: Validação de ticket`
    - `fc.assert(fc.property(...), { numRuns: 100 })`

  - [ ]* 3.5 Escrever teste de propriedade — Propriedade 6: Criação de ticket com dados válidos emite ticket_criado com id correto
    - **Propriedade 6: Criação de ticket com dados válidos emite ticket_criado com id correto**
    - **Valida: Requisito 3.1**
    - Para qualquer combinação válida de `nome`, `email` (formato válido) e `descricao`, `handle_abrir_ticket` deve retornar evento `ticket_criado` com o `id` retornado pelo mock do ticket_service
    - Arquivo: `src/tests/test_websocket_ticket.js`
    - `fc.assert(fc.property(...), { numRuns: 100 })`

- [x] 4. Checkpoint — Verificar handlers e session_manager
  - Garantir que todos os testes das tarefas 2–3 passam antes de avançar para o WebSocket_Server.

- [x] 5. Implementar `src/dominios/websocket/websocket_server.js`
  - [x] 5.1 Implementar o servidor WebSocket com injeção de dependência
    - Exportar `criar_websocket_server(http_server, chat_service, ticket_service)` retornando `{ fechar() }`
    - Instanciar `ws.WebSocketServer` com `{ server: http_server, path: '/ws/chat' }`
    - No evento `connection`: gerar `session_id` via `gerar_uuid_v4()`, adicionar ao `session_manager`, emitir evento `session_started` com o `session_id`
    - No evento `message`: parsear JSON; rotear para `handle_mensagem`, `handle_abrir_ticket` ou `handle_evento_desconhecido` conforme o campo `tipo`; emitir o evento de resposta com `session_id` incluído
    - Capturar exceções por sessão com `try/catch`; emitir evento `erro` ao cliente afetado; registrar com `console.error` incluindo stack trace
    - Nos eventos `close` e `error` do socket: chamar `session_manager.remover(session_id)` e registrar no log
    - `fechar()`: chamar `session_manager.fechar_todas()` e `wss.close()`
    - Respeitar variável de ambiente `WEBSOCKET_ENABLED` — não instanciar se `=== 'false'`
    - _Requisitos: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 4.1, 4.5, 5.2, 5.3, 6.1, 6.2, 6.3, 6.4, 7.1, 7.3_

  - [ ]* 5.2 Escrever teste de propriedade — Propriedade 7: Validação de protocolo — eventos inválidos resultam em evento erro sem encerrar sessão
    - **Propriedade 7: Validação de protocolo — eventos inválidos resultam em evento erro sem encerrar sessão**
    - **Valida: Requisitos 4.2, 4.3, 4.4**
    - Para qualquer mensagem que não seja JSON válido, ou JSON sem campo `tipo`, ou com `tipo` vazio, ou com `tipo` não reconhecido, o servidor deve emitir evento `erro` e a sessão deve permanecer no mapa
    - Arquivo: `src/tests/test_websocket_protocolo.js`
    - Tag: `// Feature: websocket-chat, Propriedade 7: Validação de protocolo`
    - `fc.assert(fc.property(...), { numRuns: 100 })`

  - [ ]* 5.3 Escrever teste de propriedade — Propriedade 8: Invariante session_id em todos os eventos emitidos
    - **Propriedade 8: Invariante session_id em todos os eventos emitidos**
    - **Valida: Requisito 4.5**
    - Para qualquer evento emitido pelo servidor (`resposta`, `erro`, `ticket_criado`), o campo `session_id` deve estar presente e ser igual ao UUID da sessão ativa
    - Arquivo: `src/tests/test_websocket_protocolo.js`
    - `fc.assert(fc.property(...), { numRuns: 100 })`

  - [ ]* 5.4 Escrever teste de propriedade — Propriedade 9: Round-trip de serialização JSON dos eventos
    - **Propriedade 9: Round-trip de serialização JSON dos eventos**
    - **Valida: Requisitos 4.1, 7.4**
    - Para qualquer evento de saída válido, `JSON.parse(JSON.stringify(evento))` deve produzir objeto com os mesmos campos e valores
    - Arquivo: `src/tests/test_websocket_protocolo.js`
    - `fc.assert(fc.property(...), { numRuns: 100 })`

  - [ ]* 5.5 Escrever teste de propriedade — Propriedade 10: Isolamento de sessões sob falha
    - **Propriedade 10: Isolamento de sessões sob falha**
    - **Valida: Requisitos 6.1, 6.2, 6.3**
    - Para qualquer conjunto de sessões ativas, quando uma exceção ocorre em uma sessão, as demais devem permanecer no mapa e continuar processando eventos normalmente
    - Arquivo: `src/tests/test_websocket_resiliencia.js`
    - Tag: `// Feature: websocket-chat, Propriedade 10: Isolamento de sessões sob falha`
    - `fc.assert(fc.property(...), { numRuns: 100 })`

  - [ ]* 5.6 Escrever testes de exemplo para `websocket_server`
    - Testar conexão e emissão de `session_started` com `session_id` UUID v4
    - Testar shutdown ordenado via `fechar()` — todas as sessões encerradas
    - Testar que `WEBSOCKET_ENABLED=false` impede a inicialização do servidor WebSocket
    - Testar fluxo FAQ completo: evento `mensagem` → mock chat_service → evento `resposta`
    - Testar fluxo desconhecida: evento `mensagem` → mock retorna `desconhecida` → evento `resposta`
    - Testar falha no chat_service: exceção capturada → evento `erro` emitido
    - Testar criação de ticket com sucesso: evento `abrir_ticket` → mock ticket_service → evento `ticket_criado`
    - Testar falha no ticket_service: exceção capturada → evento `erro` emitido
    - Testar JSON inválido recebido → evento `erro`
    - Testar tipo de evento desconhecido → evento `erro`
    - Arquivo: `src/tests/test_websocket_server.js`
    - _Requisitos: 1.1, 1.2, 2.1, 2.5, 2.6, 3.1, 3.4, 4.3, 4.4, 5.4, 6.1, 6.2_

- [x] 6. Atualizar `src/index.js` para integrar o WebSocket_Server
  - Criar `http.Server` explicitamente a partir do `app` Express: `const http_server = require('http').createServer(app)`
  - Importar e instanciar `chat_service` e `ticket_service` com suas dependências reais
  - Se `process.env.WEBSOCKET_ENABLED !== 'false'`, chamar `criar_websocket_server(http_server, chat_service, ticket_service)`
  - Substituir `app.listen(port, ...)` por `http_server.listen(port, ...)`
  - Manter o `sequelize.authenticate()` antes do listen
  - A API REST existente (`/api/chat`, `/api/chat/ticket`) deve continuar funcionando sem alteração
  - _Requisitos: 1.1, 5.1, 5.3, 5.4_

- [x] 7. Checkpoint final — Garantir que todos os testes passam
  - Executar a suíte completa de testes e garantir que todos passam.
  - Verificar que nenhum teste faz chamada real ao Gemini, ao banco de dados ou abre conexão WebSocket real (exceto testes de integração opcionais).
  - Verificar que os testes REST existentes continuam passando sem modificação.

## Notas

- Tarefas marcadas com `*` são opcionais e podem ser puladas para um MVP mais rápido
- Cada tarefa referencia requisitos específicos para rastreabilidade
- `chat_service` e `ticket_service` são sempre injetados como dependências — nunca importados diretamente nos testes
- Os handlers de `event_handler.js` são testados como funções puras, sem instanciar o WebSocket_Server completo
- Cada arquivo de teste de propriedade deve incluir o comentário de tag: `// Feature: websocket-chat, Propriedade N: <título>`
- Mínimo de 100 iterações por propriedade: `fc.assert(fc.property(...), { numRuns: 100 })`
- `ws` não está listado em `package.json` — adicionar como dependência antes de implementar a tarefa 5
