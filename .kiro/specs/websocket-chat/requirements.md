# Documento de Requisitos — WebSocket Chat (SupportBot TechStore)

## Introdução

O módulo **WebSocket Chat** adiciona comunicação bidirecional em tempo real ao SupportBot da TechStore. Enquanto a API REST existente (`POST /api/chat` e `POST /api/chat/ticket`) permanece disponível, este módulo permite que clientes abram uma sessão persistente via WebSocket, enviem mensagens e recebam respostas do chatbot instantaneamente — sem polling e sem latência de múltiplas requisições HTTP.

A lógica de negócio existente (Classificador → Chat_Service → FAQ_Repository / Ticket_Service) é reutilizada integralmente. O WebSocket atua como uma nova camada de transporte sobre o mesmo núcleo de processamento.

---

## Glossário

- **SupportBot**: Sistema de atendimento inicial ao cliente da TechStore, composto pelo chatbot e pelo módulo de tickets.
- **WebSocket_Server**: Componente responsável por gerenciar conexões WebSocket, roteamento de eventos e ciclo de vida das sessões.
- **Sessão**: Conexão WebSocket ativa entre um cliente e o WebSocket_Server, identificada por um `session_id` único gerado no momento da conexão.
- **Sala**: Sinônimo de Sessão neste contexto — cada cliente ocupa sua própria sala isolada; não há salas compartilhadas entre clientes distintos.
- **Chat_Service**: Componente existente que orquestra classificação de intenção e consulta ao FAQ_Repository.
- **Classificador**: Componente existente que utiliza o Gemini_Client para determinar a intenção de uma mensagem.
- **FAQ_Repository**: Componente existente responsável por consultar as tabelas de FAQ no banco de dados PostgreSQL.
- **Ticket_Service**: Componente existente responsável por criar e persistir tickets de suporte.
- **Gemini_Client**: Camada de integração com a API do Gemini, isolada para facilitar substituição futura.
- **Evento**: Mensagem estruturada trocada entre cliente e servidor via WebSocket, com campo `tipo` obrigatório.
- **session_id**: Identificador único (UUID v4) gerado pelo WebSocket_Server no momento em que uma conexão é estabelecida.
- **Intenção**: Categoria semântica atribuída a uma mensagem pelo Classificador (`faq_prazos`, `faq_trocas`, `faq_pagamentos`, `desconhecida`).
- **Ticket**: Registro de suporte criado quando o Chatbot não consegue responder à mensagem do cliente.

---

## Requisitos

### Requisito 1: Estabelecimento de Sessão WebSocket

**User Story:** Como cliente da TechStore, quero abrir uma sessão de chat em tempo real com o SupportBot, para que eu possa enviar mensagens e receber respostas instantâneas sem precisar fazer múltiplas requisições HTTP.

#### Critérios de Aceitação

1. THE WebSocket_Server SHALL aceitar conexões WebSocket no endpoint `ws://host/ws/chat`.
2. WHEN um cliente estabelece uma conexão WebSocket, THE WebSocket_Server SHALL gerar um `session_id` único (UUID v4) e emitir um evento `session_started` ao cliente contendo o `session_id`.
3. THE WebSocket_Server SHALL manter a sessão ativa enquanto a conexão WebSocket permanecer aberta.
4. WHEN um cliente encerra a conexão WebSocket, THE WebSocket_Server SHALL liberar todos os recursos associados à sessão e registrar o encerramento no log.
5. THE WebSocket_Server SHALL suportar múltiplas sessões simultâneas de clientes distintos de forma isolada, sem compartilhamento de estado entre sessões.
6. IF a conexão WebSocket for encerrada inesperadamente, THEN THE WebSocket_Server SHALL liberar os recursos da sessão e registrar o evento no log sem afetar as demais sessões ativas.

---

### Requisito 2: Envio e Recebimento de Mensagens em Tempo Real

**User Story:** Como cliente da TechStore, quero enviar mensagens de texto ao chatbot e receber respostas instantâneas dentro da mesma sessão WebSocket, para que o atendimento seja fluido e sem interrupções.

#### Critérios de Aceitação

1. WHEN um cliente envia um evento `mensagem` com campo `texto` válido, THE WebSocket_Server SHALL encaminhar o texto ao Chat_Service para processamento e retornar a resposta ao mesmo cliente via evento `resposta`.
2. THE WebSocket_Server SHALL processar cada mensagem recebida de forma assíncrona, sem bloquear o recebimento de novas mensagens na mesma sessão.
3. IF o campo `texto` estiver ausente ou vazio no evento `mensagem`, THEN THE WebSocket_Server SHALL emitir um evento `erro` ao cliente com uma mensagem descritiva, sem encerrar a sessão.
4. IF o campo `texto` contiver mais de 1000 caracteres, THEN THE WebSocket_Server SHALL emitir um evento `erro` ao cliente indicando o limite excedido, sem encerrar a sessão.
5. WHEN o Chat_Service retornar uma resposta do tipo `faq`, THE WebSocket_Server SHALL emitir um evento `resposta` ao cliente contendo o campo `texto` com o conteúdo recuperado do FAQ_Repository, sem modificação.
6. WHEN o Chat_Service retornar uma resposta do tipo `desconhecida`, THE WebSocket_Server SHALL emitir um evento `resposta` ao cliente informando que a dúvida será encaminhada para atendimento humano e solicitando `nome`, `email` e `descricao` para abertura de ticket.

---

### Requisito 3: Abertura de Ticket via WebSocket

**User Story:** Como cliente da TechStore, quero poder abrir um ticket de suporte diretamente na sessão WebSocket quando o chatbot não souber responder minha dúvida, para que eu não precise sair do chat para registrar meu atendimento.

#### Critérios de Aceitação

1. WHEN um cliente envia um evento `abrir_ticket` com campos `nome`, `email` e `descricao` válidos, THE WebSocket_Server SHALL invocar o Ticket_Service para persistir o ticket e emitir um evento `ticket_criado` ao cliente contendo o `id` do ticket gerado.
2. IF qualquer um dos campos `nome`, `email` ou `descricao` estiver ausente ou vazio no evento `abrir_ticket`, THEN THE WebSocket_Server SHALL emitir um evento `erro` ao cliente indicando os campos obrigatórios ausentes, sem encerrar a sessão.
3. IF o campo `email` no evento `abrir_ticket` não estiver no formato de endereço de e-mail válido, THEN THE WebSocket_Server SHALL emitir um evento `erro` ao cliente com uma mensagem descritiva, sem encerrar a sessão.
4. IF o Ticket_Service falhar ao persistir o ticket, THEN THE WebSocket_Server SHALL emitir um evento `erro` ao cliente com uma mensagem genérica e registrar o erro completo no log da aplicação, sem encerrar a sessão.

---

### Requisito 4: Protocolo de Eventos WebSocket

**User Story:** Como desenvolvedor do SupportBot, quero que a comunicação WebSocket siga um protocolo de eventos bem definido, para que clientes possam integrar-se de forma previsível e sem ambiguidade.

#### Critérios de Aceitação

1. THE WebSocket_Server SHALL utilizar JSON como formato exclusivo de serialização para todos os eventos trocados entre cliente e servidor.
2. THE WebSocket_Server SHALL exigir que todo evento recebido contenha o campo `tipo` como string não-vazia, identificando o tipo do evento.
3. IF um evento recebido não contiver o campo `tipo` ou não for um JSON válido, THEN THE WebSocket_Server SHALL emitir um evento `erro` ao cliente com uma mensagem descritiva, sem encerrar a sessão.
4. IF um evento recebido contiver um valor de `tipo` não reconhecido pelo WebSocket_Server, THEN THE WebSocket_Server SHALL emitir um evento `erro` ao cliente indicando o tipo desconhecido, sem encerrar a sessão.
5. THE WebSocket_Server SHALL incluir o campo `session_id` em todos os eventos emitidos ao cliente, permitindo que o cliente correlacione eventos com a sessão ativa.

#### Tabela de Eventos

| Direção | Tipo de Evento | Campos Obrigatórios | Descrição |
|---|---|---|---|
| Servidor → Cliente | `session_started` | `session_id` | Confirmação de sessão estabelecida |
| Cliente → Servidor | `mensagem` | `tipo`, `texto` | Mensagem de texto do cliente |
| Servidor → Cliente | `resposta` | `session_id`, `texto` | Resposta do chatbot |
| Cliente → Servidor | `abrir_ticket` | `tipo`, `nome`, `email`, `descricao` | Solicitação de abertura de ticket |
| Servidor → Cliente | `ticket_criado` | `session_id`, `id` | Confirmação de ticket criado |
| Servidor → Cliente | `erro` | `session_id`, `mensagem` | Notificação de erro sem encerrar sessão |

---

### Requisito 5: Coexistência com a API REST Existente

**User Story:** Como desenvolvedor do SupportBot, quero que o WebSocket coexista com os endpoints REST existentes, para que clientes que já utilizam a API HTTP não sejam impactados.

#### Critérios de Aceitação

1. THE SupportBot SHALL manter os endpoints REST `POST /api/chat` e `POST /api/chat/ticket` funcionais e sem alteração de comportamento após a adição do WebSocket_Server.
2. THE WebSocket_Server SHALL reutilizar o Chat_Service e o Ticket_Service existentes sem duplicar lógica de negócio.
3. THE WebSocket_Server SHALL ser inicializado no mesmo processo Node.js que o servidor HTTP Express, compartilhando a mesma porta TCP.
4. WHERE a variável de ambiente `WEBSOCKET_ENABLED` estiver definida como `false`, THE SupportBot SHALL inicializar sem o WebSocket_Server, mantendo apenas os endpoints REST disponíveis.

---

### Requisito 6: Tratamento de Erros e Resiliência da Conexão

**User Story:** Como operador do SupportBot, quero que erros na camada WebSocket sejam tratados de forma controlada, para que falhas pontuais não derrubem sessões ativas de outros clientes.

#### Critérios de Aceitação

1. IF uma exceção não tratada ocorrer durante o processamento de um evento WebSocket, THEN THE WebSocket_Server SHALL emitir um evento `erro` ao cliente afetado, registrar o erro no log com stack trace completo e manter as demais sessões ativas.
2. IF o Chat_Service ou o Ticket_Service lançarem uma exceção durante o processamento de um evento, THEN THE WebSocket_Server SHALL capturar a exceção, emitir um evento `erro` ao cliente e registrar o erro no log, sem propagar a exceção para outras sessões.
3. THE WebSocket_Server SHALL processar cada sessão de forma independente, de modo que a falha em uma sessão não afete o processamento das demais.
4. WHEN o WebSocket_Server for encerrado (shutdown), THE WebSocket_Server SHALL fechar todas as sessões ativas de forma ordenada antes de encerrar o processo.

---

### Requisito 7: Testabilidade e Isolamento

**User Story:** Como desenvolvedor do SupportBot, quero que o WebSocket_Server seja testável de forma isolada, para que os testes não dependam de conexões reais de rede ou do provedor de LLM.

#### Critérios de Aceitação

1. THE WebSocket_Server SHALL receber o Chat_Service e o Ticket_Service como dependências injetadas, sem instanciá-los diretamente.
2. WHERE testes unitários forem executados, THE Gemini_Client SHALL poder ser substituído por um mock sem alteração no código do WebSocket_Server, do Classificador ou do Chat_Service.
3. THE WebSocket_Server SHALL expor uma interface que permita a injeção de um servidor HTTP externo, possibilitando o uso de `supertest` ou bibliotecas equivalentes nos testes.
4. FOR ALL pares de evento de entrada válido e resposta do Chat_Service, serializar o evento de saída em JSON e desserializar o resultado SHALL produzir um objeto equivalente ao original (propriedade de round-trip de serialização).
