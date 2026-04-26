# Documento de Design — Chatbot FAQ (SupportBot TechStore)

## Visão Geral

O módulo **Chatbot FAQ** é o núcleo de atendimento do SupportBot da TechStore. Ele expõe dois endpoints HTTP:

- `POST /api/chat` — recebe uma mensagem de texto, classifica a intenção via Gemini e retorna a resposta FAQ correspondente ou solicita dados para abertura de ticket.
- `POST /api/chat/ticket` — recebe nome, email e descrição e persiste um ticket de suporte no banco de dados.

O design prioriza simplicidade, separação clara de responsabilidades e testabilidade total sem dependência do provedor real de LLM.

---

## Arquitetura

O sistema segue uma arquitetura em camadas com fluxo unidirecional de dependências:

```
HTTP Request
     │
     ▼
┌─────────────┐
│   Router    │  src/routers/chat_router.js
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Controller │  src/dominios/chat/chat_controller.js
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Service   │  src/dominios/chat/chat_service.js
└──────┬──────┘
       │
  ┌────┴────┐
  │         │
  ▼         ▼
┌──────┐  ┌──────────────┐
│Classif│  │FAQ_Repository│  src/dominios/chat/faq_repository.js
│icador │  └──────────────┘
└──┬───┘
   │
   ▼
┌──────────────┐
│Gemini_Client │  src/utils/gemini_client.js
└──────────────┘
```

**Fluxo `POST /api/chat`:**
1. Router valida campos obrigatórios e encaminha ao Controller.
2. Controller chama `chat_service.processar_mensagem(mensagem)`.
3. Service chama `classificador.classificar(mensagem)` → obtém intenção.
4. Se intenção é FAQ conhecida → `faq_repository.buscar(intencao)` → retorna resposta.
5. Se intenção é `desconhecida` ou FAQ vazia → retorna mensagem solicitando dados para ticket.

**Fluxo `POST /api/chat/ticket`:**
1. Router valida campos obrigatórios e encaminha ao Controller.
2. Controller chama `ticket_service.criar_ticket({ nome, email, descricao })`.
3. Service valida email e persiste via modelo Sequelize `Ticket`.
4. Retorna HTTP 201 com `{ id }`.

---

## Componentes e Interfaces

### `src/utils/gemini_client.js`

Camada de isolamento do provedor LLM. Único ponto de contato com a API do Gemini.

```js
// Interface pública
async function classificar_mensagem(mensagem) → String
```

- Carrega `GEMINI_API_KEY` exclusivamente de `process.env`.
- Lança erro se a chave não estiver definida na inicialização.
- Retorna a string bruta da resposta do Gemini (normalização feita pelo Classificador).

### `src/dominios/chat/classificador.js`

Responsável por interpretar a resposta do Gemini e mapear para uma intenção válida.

```js
// Recebe gemini_client como dependência injetada
function criar_classificador(gemini_client) → { classificar(mensagem) }

// Intenções válidas
const INTENCOES_VALIDAS = ['faq_prazos', 'faq_trocas', 'faq_pagamentos', 'desconhecida']
```

- Normaliza a resposta do Gemini (trim, lowercase).
- Se a resposta não estiver em `INTENCOES_VALIDAS`, retorna `'desconhecida'`.
- Captura qualquer exceção do `gemini_client` e retorna `'desconhecida'` sem propagar.

### `src/dominios/chat/faq_repository.js`

Consulta somente leitura nas tabelas de FAQ.

```js
async function buscar_por_intencao(intencao) → Array<{ pergunta, resposta }>
```

- Mapeia intenção → modelo Sequelize: `faq_prazos` → `FaqPrazos`, etc.
- Usa apenas `Model.findAll()` — sem insert, update ou delete.
- Lança erro se a intenção não corresponder a nenhuma tabela conhecida.

### `src/dominios/chat/chat_service.js`

Orquestra o fluxo de classificação e resposta.

```js
function criar_chat_service(classificador, faq_repository) → { processar_mensagem(mensagem) }

// Retorno
{ tipo: 'faq', resposta: String }
{ tipo: 'desconhecida' }
```

- Chama `classificador.classificar(mensagem)`.
- Se intenção é FAQ: chama `faq_repository.buscar_por_intencao(intencao)`.
- Se repositório retorna lista vazia: trata como `desconhecida`.
- Não conhece `req`/`res` — retorna objeto de resultado puro.

### `src/dominios/ticket/ticket_service.js`

Valida e persiste tickets de suporte.

```js
async function criar_ticket({ nome, email, descricao }) → { id }
```

- Valida que `nome`, `email` e `descricao` são strings não-vazias.
- Valida formato de email com regex.
- Persiste via modelo Sequelize `Ticket`.
- Lança `ValidationError` (HTTP 400) ou `DatabaseError` (HTTP 500) conforme o caso.

### `src/dominios/chat/chat_controller.js`

Traduz HTTP ↔ Service. Não contém regras de negócio.

```js
async function post_chat(req, res, next)
async function post_ticket(req, res, next)
```

### `src/routers/chat_router.js`

Define as rotas e aplica validação de entrada básica.

```
POST /chat        → chat_controller.post_chat
POST /chat/ticket → chat_controller.post_ticket
```

---

## Modelos de Dados

### Tabelas FAQ (existentes, somente leitura)

Todas as três tabelas seguem o mesmo schema:

| Coluna    | Tipo    | Restrição    |
|-----------|---------|--------------|
| `id`      | INTEGER | PK, auto-inc |
| `pergunta`| STRING  | NOT NULL     |
| `resposta`| TEXT    | NOT NULL     |

Tabelas: `faqPrazos`, `faqTrocas`, `faqPagamentos`.

### Tabela `tickets` (nova)

| Coluna      | Tipo      | Restrição         |
|-------------|-----------|-------------------|
| `id`        | INTEGER   | PK, auto-inc      |
| `nome`      | STRING    | NOT NULL          |
| `email`     | STRING    | NOT NULL          |
| `descricao` | TEXT      | NOT NULL          |
| `criado_em` | TIMESTAMP | DEFAULT NOW()     |

Migration: `src/database/migrations/YYYYMMDD-create-tickets.js`
Model: `src/models/ticket.js`

### Mapeamento de Intenções

| Intenção         | Modelo Sequelize | Tabela         |
|------------------|------------------|----------------|
| `faq_prazos`     | `FaqPrazos`      | `faqPrazos`    |
| `faq_trocas`     | `FaqTrocas`      | `faqTrocas`    |
| `faq_pagamentos` | `FaqPagamentos`  | `faqPagamentos`|
| `desconhecida`   | —                | —              |

---

## Propriedades de Corretude

*Uma propriedade é uma característica ou comportamento que deve ser verdadeiro em todas as execuções válidas do sistema — essencialmente, uma declaração formal sobre o que o sistema deve fazer. Propriedades servem como ponte entre especificações legíveis por humanos e garantias de corretude verificáveis por máquina.*

### Propriedade 1: Mensagens inválidas são sempre rejeitadas com HTTP 400

*Para qualquer* string composta inteiramente de espaços em branco, ou para qualquer requisição sem o campo `mensagem`, o endpoint `POST /api/chat` deve retornar HTTP 400.

**Valida: Requisito 1.2**

### Propriedade 2: Mensagens longas são sempre rejeitadas com HTTP 400

*Para qualquer* string com comprimento maior que 1000 caracteres enviada como `mensagem`, o endpoint `POST /api/chat` deve retornar HTTP 400.

**Valida: Requisito 1.3**

### Propriedade 3: O Classificador sempre retorna uma intenção válida

*Para qualquer* string de mensagem e qualquer resposta retornada pelo mock do Gemini_Client, o Classificador deve retornar exatamente um valor do conjunto `{faq_prazos, faq_trocas, faq_pagamentos, desconhecida}`.

**Valida: Requisito 2.2**

### Propriedade 4: Respostas inválidas do Gemini resultam em intenção desconhecida

*Para qualquer* string que não seja uma das quatro intenções válidas retornada pelo mock do Gemini_Client, o Classificador deve retornar `'desconhecida'`.

**Valida: Requisito 2.3**

### Propriedade 5: Resposta FAQ preserva o texto do banco sem modificação

*Para qualquer* lista não-vazia de registros FAQ gerada aleatoriamente (com campos `pergunta` e `resposta` arbitrários), quando o mock do repositório retornar esses registros, a resposta HTTP deve conter o campo `resposta` com o texto exato retornado pelo repositório, sem alteração, adição ou remoção de conteúdo.

**Valida: Requisito 3.4**

### Propriedade 6: Criação de ticket com dados válidos sempre persiste e retorna HTTP 201

*Para qualquer* combinação válida de `nome` (string não-vazia), `email` (formato válido) e `descricao` (string não-vazia), o endpoint `POST /api/chat/ticket` deve persistir o ticket e retornar HTTP 201 com um campo `id`.

**Valida: Requisitos 4.2, 4.5**

### Propriedade 7: Campos ausentes ou vazios no ticket sempre retornam HTTP 400

*Para qualquer* requisição ao endpoint `POST /api/chat/ticket` onde ao menos um dos campos `nome`, `email` ou `descricao` está ausente ou é uma string vazia/somente espaços, a resposta deve ser HTTP 400.

**Valida: Requisito 4.3**

### Propriedade 8: Emails inválidos no ticket sempre retornam HTTP 400

*Para qualquer* string que não corresponda ao formato de endereço de email válido (ex.: sem `@`, sem domínio, com espaços), quando enviada como campo `email` no endpoint `POST /api/chat/ticket`, a resposta deve ser HTTP 400.

**Valida: Requisito 4.4**

---

## Tratamento de Erros

| Situação | Código HTTP | Resposta |
|---|---|---|
| Campo `mensagem` ausente ou vazio | 400 | `{ "erro": "O campo mensagem é obrigatório e não pode estar vazio." }` |
| Campo `mensagem` > 1000 caracteres | 400 | `{ "erro": "A mensagem não pode exceder 1000 caracteres." }` |
| Campos obrigatórios do ticket ausentes | 400 | `{ "erro": "Os campos nome, email e descricao são obrigatórios.", "campos_ausentes": [...] }` |
| Email inválido no ticket | 400 | `{ "erro": "O campo email deve conter um endereço de e-mail válido." }` |
| FAQ vazia / intenção desconhecida | 200 | `{ "tipo": "desconhecida", "mensagem": "Não consegui responder sua dúvida. Por favor, informe nome, email e descrição para abrirmos um ticket." }` |
| Falha no banco de dados (FAQ) | 503 | `{ "erro": "Serviço temporariamente indisponível. Tente novamente em instantes." }` |
| Falha na persistência do ticket | 500 | `{ "erro": "Erro interno ao registrar o ticket. Tente novamente." }` |
| Exceção não tratada | 500 | `{ "erro": "Erro interno do servidor." }` (sem stack trace em produção) |

**Regras gerais:**
- Todos os erros são registrados no log com stack trace completo via `console.error`.
- O `error_handler` existente em `src/middlewares/error_handler.js` é reutilizado para exceções não tratadas.
- Erros do Gemini_Client são absorvidos pelo Classificador — nunca propagados ao cliente HTTP.
- Cada requisição é processada de forma independente; não há estado compartilhado entre requisições.

---

## Estratégia de Testes

### Abordagem Dual

Os testes combinam testes de exemplo (casos concretos) e testes baseados em propriedades (cobertura ampla de inputs via `fast-check`, já presente no `package.json`).

### Testes Baseados em Propriedades (fast-check)

Cada propriedade do design é implementada como um teste com mínimo de 100 iterações. O Gemini_Client é sempre mockado.

| Arquivo | Propriedades Cobertas |
|---|---|
| `src/tests/test_chat_validacao.js` | Propriedades 1, 2 |
| `src/tests/test_classificador.js` | Propriedades 3, 4 |
| `src/tests/test_chat_resposta.js` | Propriedade 5 |
| `src/tests/test_ticket_service.js` | Propriedades 6, 7, 8 |

Tag de referência por teste:
```js
// Feature: chatbot-faq, Propriedade 3: O Classificador sempre retorna uma intenção válida
```

### Testes de Exemplo (Jest)

| Arquivo | Casos Cobertos |
|---|---|
| `src/tests/test_chat_controller.js` | Fluxo completo FAQ, fluxo desconhecida, erro de banco (503), erro não tratado (500) |
| `src/tests/test_faq_repository.js` | Consulta por cada intenção, lista vazia |
| `src/tests/test_ticket_service.js` | Criação com sucesso, falha no banco (500), validação de email |
| `src/tests/test_gemini_client.js` | Ausência de GEMINI_API_KEY, resposta válida, timeout/erro |

### Regras de Mock

- `gemini_client` é sempre injetado como dependência — nunca importado diretamente nos testes.
- Modelos Sequelize são mockados com `jest.mock()` — sem conexão real ao banco nos testes unitários.
- Testes de integração (opcionais) usam banco `test_supportbot` com prefixo `test_` nas tabelas.

### Configuração

```js
// jest.config (já em package.json)
"testMatch": ["**/tests/test_*.js"]

// Mínimo de iterações por propriedade
fc.assert(fc.property(...), { numRuns: 100 })
```
