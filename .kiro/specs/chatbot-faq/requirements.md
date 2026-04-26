# Documento de Requisitos

## Introdução

O **Chatbot FAQ da TechStore** é o módulo de atendimento inicial do SupportBot. Ele recebe mensagens de clientes via API, classifica a intenção usando o modelo de linguagem Gemini e responde com base nas FAQs cadastradas no banco de dados (prazos de entrega, troca/devolução e formas de pagamento). Quando a intenção não corresponde a nenhuma FAQ conhecida, o sistema coleta nome, e-mail e descrição do cliente e abre um ticket de suporte para atendimento humano.

---

## Glossário

- **SupportBot**: Sistema de atendimento inicial ao cliente da TechStore, composto pelo chatbot e pelo módulo de tickets.
- **Chatbot**: Componente do SupportBot responsável por receber mensagens, classificar intenções e retornar respostas.
- **Classificador**: Componente que utiliza o Gemini para determinar a intenção de uma mensagem recebida.
- **FAQ_Repository**: Componente responsável por consultar as tabelas de FAQ no banco de dados PostgreSQL.
- **Ticket_Service**: Componente responsável por criar e persistir tickets de suporte no banco de dados.
- **Gemini_Client**: Camada de integração com a API do Gemini, isolada para facilitar substituição futura.
- **Intenção**: Categoria semântica atribuída a uma mensagem pelo Classificador (ex.: `faq_prazos`, `faq_trocas`, `faq_pagamentos`, `desconhecida`).
- **Ticket**: Registro de suporte criado quando o Chatbot não consegue responder à mensagem do cliente, contendo `nome`, `email` e `descricao`.
- **Mensagem**: Texto enviado pelo cliente ao Chatbot via requisição HTTP.

---

## Requisitos

### Requisito 1: Recebimento de Mensagem

**User Story:** Como cliente da TechStore, quero enviar uma mensagem de texto ao chatbot via API, para que eu receba uma resposta sobre minha dúvida.

#### Critérios de Aceitação

1. THE Chatbot SHALL expor um endpoint `POST /api/chat` que aceita um corpo JSON contendo o campo `mensagem`.
2. IF o campo `mensagem` estiver ausente ou vazio na requisição, THEN THE Chatbot SHALL retornar HTTP 400 com uma mensagem de erro descritiva.
3. IF o campo `mensagem` contiver mais de 1000 caracteres, THEN THE Chatbot SHALL retornar HTTP 400 com uma mensagem de erro indicando o limite excedido.
4. WHEN uma mensagem válida é recebida, THE Chatbot SHALL encaminhar o texto ao Classificador para determinação da intenção.

---

### Requisito 2: Classificação de Intenção

**User Story:** Como desenvolvedor do SupportBot, quero que o Chatbot classifique automaticamente a intenção de cada mensagem usando o Gemini, para que o fluxo correto de resposta seja acionado.

#### Critérios de Aceitação

1. WHEN uma mensagem é encaminhada ao Classificador, THE Classificador SHALL enviar a mensagem ao Gemini_Client para obter a intenção.
2. THE Classificador SHALL retornar exatamente uma das seguintes intenções: `faq_prazos`, `faq_trocas`, `faq_pagamentos` ou `desconhecida`.
3. IF a resposta do Gemini_Client não corresponder a nenhuma intenção válida, THEN THE Classificador SHALL retornar a intenção `desconhecida`.
4. IF o Gemini_Client retornar um erro ou timeout, THEN THE Classificador SHALL retornar a intenção `desconhecida` sem propagar a exceção ao Chatbot.
5. THE Gemini_Client SHALL ser isolado em módulo próprio de forma que possa ser substituído por outro provedor de LLM sem alteração nas demais camadas.

---

### Requisito 3: Resposta a FAQ Conhecida

**User Story:** Como cliente da TechStore, quero receber uma resposta precisa sobre prazos de entrega, troca/devolução ou formas de pagamento, para que minha dúvida seja resolvida sem intervenção humana.

#### Critérios de Aceitação

1. WHEN a intenção classificada for `faq_prazos`, THE FAQ_Repository SHALL consultar a tabela `faqPrazos` e retornar os registros correspondentes.
2. WHEN a intenção classificada for `faq_trocas`, THE FAQ_Repository SHALL consultar a tabela `faqTrocas` e retornar os registros correspondentes.
3. WHEN a intenção classificada for `faq_pagamentos`, THE FAQ_Repository SHALL consultar a tabela `faqPagamentos` e retornar os registros correspondentes.
4. WHEN o FAQ_Repository retornar ao menos um registro, THE Chatbot SHALL retornar HTTP 200 com o campo `resposta` contendo o texto recuperado do banco de dados, sem modificação ou improviso.
5. IF a tabela de FAQ consultada não contiver registros, THEN THE Chatbot SHALL tratar a situação como intenção `desconhecida` e acionar o fluxo de abertura de ticket.
6. THE FAQ_Repository SHALL realizar apenas leitura nas tabelas de FAQ, sem inserir, atualizar ou excluir registros.

---

### Requisito 4: Abertura de Ticket para Intenção Desconhecida

**User Story:** Como cliente da TechStore, quero que minha dúvida seja registrada como ticket quando o chatbot não souber responder, para que um atendente humano possa me ajudar.

#### Critérios de Aceitação

1. WHEN a intenção classificada for `desconhecida`, THE Chatbot SHALL retornar HTTP 200 com uma mensagem informando que a dúvida será encaminhada para atendimento humano e solicitando `nome`, `email` e `descricao`.
2. WHEN o cliente fornecer `nome`, `email` e `descricao` válidos em uma requisição subsequente ao endpoint `POST /api/chat/ticket`, THE Ticket_Service SHALL persistir o ticket no banco de dados.
3. IF qualquer um dos campos `nome`, `email` ou `descricao` estiver ausente ou vazio na requisição de ticket, THEN THE Ticket_Service SHALL retornar HTTP 400 com uma mensagem de erro indicando os campos obrigatórios ausentes.
4. IF o campo `email` não estiver no formato de endereço de e-mail válido, THEN THE Ticket_Service SHALL retornar HTTP 400 com uma mensagem de erro descritiva.
5. WHEN o ticket for persistido com sucesso, THE Ticket_Service SHALL retornar HTTP 201 com o identificador único do ticket criado.
6. IF ocorrer falha na persistência do ticket, THEN THE Ticket_Service SHALL retornar HTTP 500 com uma mensagem de erro genérica e registrar o erro no log da aplicação.

---

### Requisito 5: Isolamento e Testabilidade da Integração com Gemini

**User Story:** Como desenvolvedor do SupportBot, quero que a integração com o Gemini seja isolada e mockável, para que os testes não dependam do provedor real de LLM.

#### Critérios de Aceitação

1. THE Gemini_Client SHALL expor uma interface com ao menos a função `classificar_mensagem(mensagem)` que retorna a intenção como string.
2. THE Gemini_Client SHALL carregar a chave de API do Gemini exclusivamente a partir da variável de ambiente `GEMINI_API_KEY`, sem valores fixos no código.
3. IF a variável de ambiente `GEMINI_API_KEY` não estiver definida na inicialização, THEN THE SupportBot SHALL registrar um erro no log e encerrar o processo com código de saída diferente de zero.
4. WHERE testes unitários forem executados, THE Gemini_Client SHALL poder ser substituído por um mock sem alteração no código do Classificador ou do Chatbot.

---

### Requisito 6: Tratamento de Erros e Resiliência

**User Story:** Como operador do SupportBot, quero que erros internos sejam tratados de forma controlada, para que o serviço permaneça disponível mesmo diante de falhas pontuais.

#### Critérios de Aceitação

1. IF uma exceção não tratada ocorrer durante o processamento de uma requisição, THEN THE SupportBot SHALL retornar HTTP 500 com uma mensagem de erro genérica sem expor detalhes internos ao cliente.
2. WHEN qualquer erro ocorrer durante o processamento, THE SupportBot SHALL registrar o erro completo no log da aplicação, incluindo stack trace.
3. IF a conexão com o banco de dados falhar durante uma consulta de FAQ, THEN THE Chatbot SHALL retornar HTTP 503 com uma mensagem indicando indisponibilidade temporária.
4. THE SupportBot SHALL processar cada requisição de forma independente, de modo que a falha em uma requisição não afete o processamento das demais.
