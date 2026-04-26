---
inclusion: always
---

# Technology Stack

## Runtime & Framework
- **Node.js v22.22.1** — Ambiente de execução JavaScript
- **Sequelize ORM** — Responsável por orquestrar requisições ao banco de dados
- **PostgreSQL v18** — Banco de dados relacional
- **Gemini** — Provedor de LLM para o chatbot

## Banco de Dados — FAQs
Requests e responses são armazenados no PostgreSQL. As tabelas de FAQ são:
- `faqPrazos` — Prazos de entrega
- `faqTrocas` — Política de troca e devolução
- `faqPagamentos` — Formas de pagamento

## Diretrizes de Arquitetura
- Priorizar arquitetura simples e fácil de manter.
- Separar claramente rotas, serviços, repositórios e modelos — cada camada com responsabilidade única.
- Rotas não devem conter regras de negócio; delegar para services.
- Services não devem depender de detalhes do framework HTTP (req/res).
- Isolar o provedor de LLM em uma camada própria para facilitar troca futura.
- Centralizar configurações em `config/` e carregar a partir de variáveis de ambiente.

## Convenções de Código
- Usar `snake_case` para arquivos, funções e variáveis.
- Preferir composição a herança; usar classes apenas para encapsular estado ou definir contratos.
- Nomear arquivos por domínio — evitar nomes genéricos como `helpers.js`.
- Todas as integrações externas (LLM, clientes HTTP) devem ter interfaces fáceis de mockar em testes.

## Testes
- Cobrir no mínimo: caminho feliz e caminho de fallback/erro.
- Nomear arquivos de teste com prefixo `test_`.
- Nunca acoplar testes ao provedor real de LLM — sempre mockar a camada de LLM.
