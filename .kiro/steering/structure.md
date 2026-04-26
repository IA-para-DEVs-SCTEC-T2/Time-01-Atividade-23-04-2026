---
inclusion: always
---

# Estrutura do Projeto

Define como o código deve ser organizado para que o projeto permaneça simples, previsível e fácil de evoluir.

## Diretório Raiz

- `src/` — Código-fonte principal
- `package.json` — Dependências e scripts
- `.env` — Variáveis de ambiente (nunca commitar)

## Estrutura do `src/`

| Caminho | Responsabilidade |
|---|---|
| `config/` | Configuração do banco de dados e da aplicação |
| `database/` | Migrações e seeds |
| `dominios/` | Controllers e Services (regras de negócio) |
| `middlewares/` | Funções de middleware HTTP |
| `models/` | Modelos de tabelas do banco de dados |
| `routers/` | Definição das rotas da API |
| `utils/` | Funções utilitárias e hooks compartilhados |
| `index.js` | Ponto de entrada da aplicação |
| `server.js` | Inicialização do servidor |

## Regras de Arquitetura

- Cada módulo deve ter responsabilidade única e clara.
- Rotas não devem conter regras de negócio complexas — delegar para services.
- Services não devem depender de detalhes do framework HTTP (req/res).
- Repositórios não devem conter lógica de conversa com o usuário.
- Funções devem ser pequenas e com nomes descritivos.
- Todas as integrações externas (LLM, clientes HTTP) devem ter interfaces fáceis de mockar em testes.

## Convenções de Código

- Usar `snake_case` para arquivos, funções e variáveis.
- Usar classes apenas quando ajudarem a encapsular estado ou definir um contrato.
- Preferir composição a herança.
- Evitar nomes genéricos como `helpers.js` ou `misc.js` — nomear por domínio.
- Centralizar configurações em `config/` e carregar a partir de variáveis de ambiente.

## Convenções de Testes

- Criar testes unitários para respostas de FAQ, classificação de mensagens e abertura de ticket.
- Cobrir no mínimo: o caminho feliz e o caminho de fallback/erro.
- Nomear arquivos de teste com o prefixo `test_`.
- Nunca acoplar testes ao provedor real de LLM — sempre mockar a camada de LLM.
