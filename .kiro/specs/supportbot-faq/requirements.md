# Documento de Requisitos

## Introdução

Esta feature implementa o FAQ do SupportBot da TechStore: um assistente interno que responde perguntas frequentes dos clientes via API REST. Quando a confiança na resposta for baixa, o sistema solicita os dados do cliente e abre um ticket automaticamente para atendimento humano.

## Glossário

- **SupportBot**: sistema de atendimento inicial ao cliente da TechStore, responsável por responder FAQs e escalar casos não cobertos.
- **FAQ_Service**: serviço responsável por buscar e retornar respostas da base de conhecimento.
- **Classifier_Service**: serviço responsável por avaliar a confiança da resposta gerada pelo LLM.
- **LLM_Service**: serviço responsável por se comunicar com o modelo de linguagem (Claude Haiku 4.5).
- **Ticket_Service**: serviço responsável por criar e persistir tickets de atendimento.
- **FAQ_Repository**: repositório responsável por carregar e consultar a base de FAQs a partir do arquivo `data/faqs.json`.
- **Ticket_Repository**: repositório responsável por persistir tickets de atendimento.
- **Chat_API**: rota REST que recebe a mensagem do cliente e retorna a resposta do SupportBot.
- **Ticket_API**: rota REST que recebe os dados do cliente e registra um ticket.
- **Confidence_Score**: valor numérico entre 0.0 e 1.0 que representa o grau de certeza do LLM ao responder uma pergunta.
- **Confidence_Threshold**: valor mínimo de Confidence_Score acima do qual o SupportBot considera a resposta confiável. Valor padrão: 0.7.
- **Ticket**: registro de atendimento contendo nome, e-mail e descrição da dúvida do cliente.

---

## Requisitos

### Requisito 1: Responder perguntas frequentes via API REST

**User Story:** Como cliente da TechStore, quero enviar uma pergunta em linguagem natural e receber uma resposta baseada nas FAQs, para que eu resolva minha dúvida sem precisar de atendimento humano.

#### Critérios de Aceitação

1. WHEN o cliente envia uma mensagem para `POST /chat`, THE Chat_API SHALL retornar uma resposta em linguagem natural com status HTTP 200.
2. WHEN a mensagem do cliente é recebida, THE FAQ_Service SHALL consultar o FAQ_Repository para identificar a FAQ mais relevante.
3. WHEN uma FAQ relevante é identificada, THE LLM_Service SHALL gerar uma resposta baseada no conteúdo da FAQ correspondente.
4. THE Chat_API SHALL retornar no corpo da resposta o campo `answer` com o texto da resposta e o campo `confidence` com o Confidence_Score calculado.
5. IF a mensagem recebida estiver vazia ou contiver apenas espaços em branco, THEN THE Chat_API SHALL retornar status HTTP 422 com mensagem de erro descritiva.
6. IF o LLM_Service não estiver disponível, THEN THE Chat_API SHALL retornar status HTTP 503 com mensagem de erro descritiva.

---

### Requisito 2: Classificar confiança da resposta

**User Story:** Como operador da TechStore, quero que o SupportBot avalie automaticamente a confiança de cada resposta, para que casos incertos sejam escalados sem intervenção manual.

#### Critérios de Aceitação

1. WHEN o LLM_Service gera uma resposta, THE Classifier_Service SHALL calcular um Confidence_Score entre 0.0 e 1.0 para essa resposta.
2. WHEN o Confidence_Score é maior ou igual ao Confidence_Threshold, THE SupportBot SHALL retornar a resposta ao cliente sem solicitar abertura de ticket.
3. WHEN o Confidence_Score é menor que o Confidence_Threshold, THE SupportBot SHALL indicar na resposta que o caso será escalado para atendimento humano.
4. THE Classifier_Service SHALL utilizar o Confidence_Threshold configurado via variável de ambiente `CONFIDENCE_THRESHOLD`, com valor padrão de 0.7.

---

### Requisito 3: Abrir ticket automaticamente quando a confiança for baixa

**User Story:** Como cliente da TechStore, quero que minha dúvida seja registrada automaticamente quando o bot não souber responder com segurança, para que eu receba atendimento humano sem precisar repetir minha solicitação.

#### Critérios de Aceitação

1. WHEN o Confidence_Score é menor que o Confidence_Threshold, THE Chat_API SHALL retornar ao cliente uma instrução para fornecer nome, e-mail e descrição da dúvida.
2. WHEN o cliente envia `POST /ticket` com nome, e-mail e descrição, THE Ticket_API SHALL acionar o Ticket_Service para criar um Ticket.
3. WHEN o Ticket_Service cria um Ticket, THE Ticket_Repository SHALL persistir o Ticket e retornar um identificador único.
4. WHEN o Ticket é criado com sucesso, THE Ticket_API SHALL retornar status HTTP 201 com o identificador do Ticket e uma mensagem de confirmação ao cliente.
5. IF o campo `name` estiver ausente ou vazio na requisição de ticket, THEN THE Ticket_API SHALL retornar status HTTP 422 com mensagem de erro descritiva.
6. IF o campo `email` não for um endereço de e-mail válido, THEN THE Ticket_API SHALL retornar status HTTP 422 com mensagem de erro descritiva.
7. IF o campo `description` estiver ausente ou vazio na requisição de ticket, THEN THE Ticket_API SHALL retornar status HTTP 422 com mensagem de erro descritiva.

---

### Requisito 4: Gerenciar a base de FAQs

**User Story:** Como operador da TechStore, quero que as FAQs sejam carregadas a partir de um arquivo estruturado, para que eu possa atualizar o conteúdo sem alterar o código.

#### Critérios de Aceitação

1. WHEN o SupportBot é iniciado, THE FAQ_Repository SHALL carregar todas as FAQs do arquivo `data/faqs.json`.
2. THE FAQ_Repository SHALL cobrir as seguintes categorias iniciais: prazo de entrega, troca e devolução, formas de pagamento e status básico de pedido.
3. IF o arquivo `data/faqs.json` não for encontrado no momento da inicialização, THEN THE SupportBot SHALL registrar um erro no log e encerrar a inicialização com código de saída diferente de zero.
4. IF o arquivo `data/faqs.json` contiver JSON inválido, THEN THE SupportBot SHALL registrar um erro descritivo no log e encerrar a inicialização com código de saída diferente de zero.
5. FOR ALL FAQs carregadas pelo FAQ_Repository, serializar e desserializar o conteúdo SHALL produzir um objeto equivalente ao original (propriedade de round-trip).

---

### Requisito 5: Observabilidade e rastreabilidade

**User Story:** Como operador da TechStore, quero que todas as interações e erros sejam registrados em log, para que eu possa monitorar o comportamento do sistema e diagnosticar problemas.

#### Critérios de Aceitação

1. WHEN o Chat_API recebe uma requisição, THE SupportBot SHALL registrar em log a mensagem recebida, o Confidence_Score calculado e a ação tomada (resposta direta ou escalada).
2. WHEN o Ticket_Service cria um Ticket, THE SupportBot SHALL registrar em log o identificador do Ticket e o e-mail do cliente.
3. IF qualquer serviço interno lançar uma exceção não tratada, THEN THE SupportBot SHALL registrar o stack trace completo no log e retornar status HTTP 500 com mensagem genérica ao cliente.
4. THE SupportBot SHALL registrar logs no formato estruturado (JSON) com os campos `timestamp`, `level`, `service` e `message`.
