# Plano de Implementação: Chatbot FAQ (SupportBot TechStore)

## Visão Geral

Implementação incremental do módulo Chatbot FAQ em Node.js (v22), seguindo a arquitetura em camadas definida no design: utils → dominios/chat → dominios/ticket → routers. Cada etapa integra o componente ao anterior, sem código órfão.

## Tarefas

- [x] 1. Criar modelo Sequelize e migration para a tabela `tickets`
  - Criar `src/models/ticket.js` com campos `id`, `nome`, `email`, `descricao`, `criado_em`
  - Criar `src/database/migrations/YYYYMMDD-create-tickets.js` com `queryInterface.createTable`
  - Registrar o modelo no `src/database/index.js` junto aos demais modelos
  - _Requisitos: 4.2, 4.5_

- [x] 2. Implementar `src/utils/gemini_client.js`
  - [x] 2.1 Implementar o módulo `gemini_client`
    - Exportar função `async classificar_mensagem(mensagem)`
    - Carregar `GEMINI_API_KEY` exclusivamente de `process.env`
    - Lançar erro e encerrar processo (`process.exit(1)`) se a chave não estiver definida na inicialização
    - Retornar a string bruta da resposta do Gemini sem normalização
    - _Requisitos: 5.1, 5.2, 5.3_

  - [ ]* 2.2 Escrever testes de exemplo para `gemini_client`
    - Testar ausência de `GEMINI_API_KEY` (deve lançar erro)
    - Testar resposta válida com mock da API do Gemini
    - Testar comportamento em timeout/erro de rede
    - Arquivo: `src/tests/test_gemini_client.js`
    - _Requisitos: 5.2, 5.3_

- [x] 3. Implementar `src/dominios/chat/classificador.js`
  - [x] 3.1 Implementar o classificador com injeção de dependência
    - Exportar `criar_classificador(gemini_client)` retornando `{ classificar(mensagem) }`
    - Definir `INTENCOES_VALIDAS = ['faq_prazos', 'faq_trocas', 'faq_pagamentos', 'desconhecida']`
    - Normalizar resposta do Gemini (trim + lowercase) antes de validar
    - Retornar `'desconhecida'` para qualquer resposta fora do conjunto válido
    - Capturar exceções do `gemini_client` e retornar `'desconhecida'` sem propagar
    - _Requisitos: 2.1, 2.2, 2.3, 2.4_

  - [ ]* 3.2 Escrever teste de propriedade — Propriedade 3: O Classificador sempre retorna uma intenção válida
    - **Propriedade 3: O Classificador sempre retorna uma intenção válida**
    - **Valida: Requisito 2.2**
    - Para qualquer string de mensagem e qualquer resposta do mock do Gemini_Client, o retorno deve estar em `INTENCOES_VALIDAS`
    - Arquivo: `src/tests/test_classificador.js`
    - `fc.assert(fc.property(fc.string(), fc.string(), ...), { numRuns: 100 })`

  - [ ]* 3.3 Escrever teste de propriedade — Propriedade 4: Respostas inválidas do Gemini resultam em intenção desconhecida
    - **Propriedade 4: Respostas inválidas do Gemini resultam em intenção desconhecida**
    - **Valida: Requisito 2.3**
    - Para qualquer string que não seja uma das quatro intenções válidas, o classificador deve retornar `'desconhecida'`
    - Arquivo: `src/tests/test_classificador.js`

- [x] 4. Implementar `src/dominios/chat/faq_repository.js`
  - [x] 4.1 Implementar o repositório de FAQ
    - Exportar `async buscar_por_intencao(intencao)`
    - Mapear intenção → modelo Sequelize: `faq_prazos` → `FaqPrazos`, `faq_trocas` → `FaqTrocas`, `faq_pagamentos` → `FaqPagamentos`
    - Usar apenas `Model.findAll()` — sem insert, update ou delete
    - Lançar erro se a intenção não corresponder a nenhuma tabela conhecida
    - _Requisitos: 3.1, 3.2, 3.3, 3.6_

  - [ ]* 4.2 Escrever testes de exemplo para `faq_repository`
    - Testar consulta para cada uma das três intenções válidas (mock do Sequelize)
    - Testar retorno de lista vazia
    - Testar erro para intenção desconhecida
    - Arquivo: `src/tests/test_faq_repository.js`
    - _Requisitos: 3.1, 3.2, 3.3_

- [x] 5. Implementar `src/dominios/chat/chat_service.js`
  - [x] 5.1 Implementar o serviço de chat com injeção de dependência
    - Exportar `criar_chat_service(classificador, faq_repository)` retornando `{ processar_mensagem(mensagem) }`
    - Chamar `classificador.classificar(mensagem)` para obter a intenção
    - Se intenção é FAQ conhecida: chamar `faq_repository.buscar_por_intencao(intencao)`
    - Se repositório retorna lista vazia: tratar como `desconhecida`
    - Retornar `{ tipo: 'faq', resposta }` ou `{ tipo: 'desconhecida' }` — sem `req`/`res`
    - _Requisitos: 3.4, 3.5, 4.1_

- [x] 6. Implementar `src/dominios/ticket/ticket_service.js`
  - [x] 6.1 Implementar o serviço de ticket
    - Exportar `async criar_ticket({ nome, email, descricao })`
    - Validar que `nome`, `email` e `descricao` são strings não-vazias (lançar `ValidationError` → HTTP 400)
    - Validar formato de email com regex (lançar `ValidationError` → HTTP 400)
    - Persistir via modelo Sequelize `Ticket`
    - Retornar `{ id }` em caso de sucesso
    - Lançar `DatabaseError` (HTTP 500) em caso de falha na persistência
    - _Requisitos: 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 6.2 Escrever teste de propriedade — Propriedade 6: Criação de ticket com dados válidos sempre persiste e retorna HTTP 201
    - **Propriedade 6: Criação de ticket com dados válidos sempre persiste e retorna HTTP 201**
    - **Valida: Requisitos 4.2, 4.5**
    - Para qualquer combinação válida de `nome`, `email` e `descricao`, deve persistir e retornar `{ id }`
    - Arquivo: `src/tests/test_ticket_service.js`
    - `fc.assert(fc.property(fc.string({ minLength: 1 }), validEmail, fc.string({ minLength: 1 }), ...), { numRuns: 100 })`

  - [ ]* 6.3 Escrever teste de propriedade — Propriedade 7: Campos ausentes ou vazios no ticket sempre retornam HTTP 400
    - **Propriedade 7: Campos ausentes ou vazios no ticket sempre retornam HTTP 400**
    - **Valida: Requisito 4.3**
    - Para qualquer requisição com ao menos um campo ausente ou vazio, deve lançar `ValidationError`
    - Arquivo: `src/tests/test_ticket_service.js`

  - [ ]* 6.4 Escrever teste de propriedade — Propriedade 8: Emails inválidos no ticket sempre retornam HTTP 400
    - **Propriedade 8: Emails inválidos no ticket sempre retornam HTTP 400**
    - **Valida: Requisito 4.4**
    - Para qualquer string que não corresponda ao formato de email válido, deve lançar `ValidationError`
    - Arquivo: `src/tests/test_ticket_service.js`

- [x] 7. Checkpoint — Verificar lógica de negócio
  - Garantir que todos os testes das tarefas 2–6 passam antes de avançar para a camada HTTP.

- [x] 8. Implementar `src/dominios/chat/chat_controller.js`
  - [x] 8.1 Implementar o controller de chat
    - Exportar `async post_chat(req, res, next)` e `async post_ticket(req, res, next)`
    - `post_chat`: validar `mensagem` (ausente/vazio → 400, > 1000 chars → 400), chamar `chat_service.processar_mensagem`, retornar 200 com `{ tipo, resposta }` ou `{ tipo: 'desconhecida', mensagem }`
    - `post_ticket`: extrair `{ nome, email, descricao }` do body, chamar `ticket_service.criar_ticket`, retornar 201 com `{ id }`
    - Capturar `ValidationError` → 400, `DatabaseError` → 500/503, demais → `next(err)`
    - Não conter regras de negócio — apenas tradução HTTP ↔ Service
    - _Requisitos: 1.1, 1.2, 1.3, 3.4, 4.1, 4.5, 6.1, 6.3_

  - [ ]* 8.2 Escrever teste de propriedade — Propriedade 1: Mensagens inválidas são sempre rejeitadas com HTTP 400
    - **Propriedade 1: Mensagens inválidas são sempre rejeitadas com HTTP 400**
    - **Valida: Requisito 1.2**
    - Para qualquer string composta inteiramente de espaços em branco ou requisição sem `mensagem`, deve retornar HTTP 400
    - Arquivo: `src/tests/test_chat_validacao.js`
    - `fc.assert(fc.property(fc.string().filter(s => s.trim() === ''), ...), { numRuns: 100 })`

  - [ ]* 8.3 Escrever teste de propriedade — Propriedade 2: Mensagens longas são sempre rejeitadas com HTTP 400
    - **Propriedade 2: Mensagens longas são sempre rejeitadas com HTTP 400**
    - **Valida: Requisito 1.3**
    - Para qualquer string com comprimento > 1000 caracteres, deve retornar HTTP 400
    - Arquivo: `src/tests/test_chat_validacao.js`
    - `fc.assert(fc.property(fc.string({ minLength: 1001 }), ...), { numRuns: 100 })`

  - [ ]* 8.4 Escrever teste de propriedade — Propriedade 5: Resposta FAQ preserva o texto do banco sem modificação
    - **Propriedade 5: Resposta FAQ preserva o texto do banco sem modificação**
    - **Valida: Requisito 3.4**
    - Para qualquer lista não-vazia de registros FAQ gerada aleatoriamente, a resposta HTTP deve conter o texto exato retornado pelo repositório
    - Arquivo: `src/tests/test_chat_resposta.js`

  - [ ]* 8.5 Escrever testes de exemplo para `chat_controller`
    - Testar fluxo completo FAQ (mock do service retornando `{ tipo: 'faq', resposta }`)
    - Testar fluxo desconhecida (mock retornando `{ tipo: 'desconhecida' }`)
    - Testar erro de banco de dados (503)
    - Testar exceção não tratada (500)
    - Arquivo: `src/tests/test_chat_controller.js`
    - _Requisitos: 3.4, 4.1, 6.1, 6.3_

- [x] 9. Implementar `src/routers/chat_router.js`
  - Criar router Express com `POST /chat` → `chat_controller.post_chat` e `POST /chat/ticket` → `chat_controller.post_ticket`
  - Montar o router em `src/server.js` sob o prefixo `/api`
  - Garantir que o `error_handler` de `src/middlewares/error_handler.js` está registrado após as rotas
  - _Requisitos: 1.1, 4.2_

- [x] 10. Checkpoint final — Garantir que todos os testes passam
  - Executar a suíte completa de testes e garantir que todos passam.
  - Verificar que nenhum teste faz chamada real ao Gemini ou ao banco de dados.

## Notas

- Tarefas marcadas com `*` são opcionais e podem ser puladas para um MVP mais rápido
- Cada tarefa referencia requisitos específicos para rastreabilidade
- O `gemini_client` deve sempre ser injetado como dependência — nunca importado diretamente nos testes
- Modelos Sequelize são mockados com `jest.mock()` nos testes unitários
- Cada arquivo de teste de propriedade deve incluir o comentário de tag: `// Feature: chatbot-faq, Propriedade N: <título>`
- Mínimo de 100 iterações por propriedade: `fc.assert(fc.property(...), { numRuns: 100 })`
