---
inclusion: always
---

# Technology Stack

## Runtime & Framework
- **Node.js v22.22.1** — Ambiente de execução JavaScript
- **Sequelize ORM** — Responsável por orquestrar requisições ao banco de dados
- **PostgreSQL v18** — Banco de dados relacional
- **Gemini** — Provedor de LLM para o chatbot
- **ws** — Biblioteca WebSocket para Node.js (`npm install ws`)
- **dotenv** — Carregamento de variáveis de ambiente a partir do `.env`; chamar `require('dotenv').config()` como primeira linha do ponto de entrada (`src/index.js`)

## Banco de Dados — FAQs
Requests e responses são armazenados no PostgreSQL. As tabelas de FAQ são:
- `faqPrazos` — Prazos de entrega
- `faqTrocas` — Política de troca e devolução
- `faqPagamentos` — Formas de pagamento

## Gemini — Modelo e Uso
- Modelo atual: `gemini-2.5-flash-lite` via endpoint REST `generateContent`
- `gemini_client.js` expõe duas funções:
  - `classificar_mensagem(mensagem)` — envia prompt de classificação e retorna uma das intenções: `faq_prazos`, `faq_trocas`, `faq_pagamentos`, `desconhecida`
  - `gerar_resposta_desconhecida(mensagem)` — gera resposta conversacional e amigável para mensagens fora do escopo do FAQ, sempre direcionando ao FAQ
- O prompt de classificação instrui o Gemini a responder APENAS com a palavra da intenção, sem texto adicional
- O prompt de resposta desconhecida instrui o Gemini a ser breve (máximo 3 linhas), natural e amigável, sem inventar informações

## WebSocket — Módulo de Chat em Tempo Real
- Endpoint: `ws://host/ws/chat`
- Controlado pela variável de ambiente `WEBSOCKET_ENABLED` — se `=== 'false'`, o servidor WebSocket não é inicializado
- Protocolo: JSON com campo `tipo` obrigatório em todos os eventos
- Texto puro enviado pelo cliente é automaticamente tratado como `{ tipo: 'mensagem', texto: '...' }`
- Ao conectar, o servidor emite `session_started` seguido de uma mensagem de boas-vindas com o menu de opções
- Arquitetura do módulo WebSocket:
  - `src/utils/uuid.js` — `gerar_uuid_v4()` via `crypto.randomUUID()`
  - `src/dominios/websocket/session_manager.js` — mapa em memória de sessões ativas
  - `src/dominios/websocket/event_handler.js` — handlers puros (sem acesso ao socket)
  - `src/dominios/websocket/websocket_server.js` — servidor WebSocket com injeção de dependência

## Interface Web
- `public/chat.html` — cliente de chat HTML/CSS/JS servido estaticamente pelo Express
- Acessível em `http://localhost:PORT/chat.html`
- Exibe apenas o campo `texto` dos eventos, sem o envelope JSON
- O helmet é configurado com `contentSecurityPolicy: false` para permitir a conexão WebSocket

## Diretrizes de Arquitetura
- Priorizar arquitetura simples e fácil de manter.
- Separar claramente rotas, serviços, repositórios e modelos — cada camada com responsabilidade única.
- Rotas não devem conter regras de negócio; delegar para services.
- Services não devem depender de detalhes do framework HTTP (req/res).
- Isolar o provedor de LLM em uma camada própria para facilitar troca futura.
- Centralizar configurações em `config/` e carregar a partir de variáveis de ambiente.
- O `http.Server` é criado explicitamente em `src/index.js` via `http.createServer(app)` para compartilhar a mesma porta TCP entre Express e WebSocket.
- `chat_service` recebe `gemini_client` como terceira dependência injetada para gerar respostas conversacionais.

## Convenções de Código
- Usar `snake_case` para arquivos, funções e variáveis.
- Preferir composição a herança; usar classes apenas para encapsular estado ou definir contratos.
- Nomear arquivos por domínio — evitar nomes genéricos como `helpers.js`.
- Todas as integrações externas (LLM, clientes HTTP) devem ter interfaces fáceis de mockar em testes.

## Testes
- Cobrir no mínimo: caminho feliz e caminho de fallback/erro.
- Nomear arquivos de teste com prefixo `test_`.
- Nunca acoplar testes ao provedor real de LLM — sempre mockar a camada de LLM.
