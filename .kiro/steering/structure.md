##Objetivo
Definir como o código deve ser organizado para que o projeto permaneça simples, previsível e fácil de evoluir.

##Organização por camadas
- api/: recebe requisições e retorna respostas.

- services/: contém regras de negócio.

- repositories/: integra com arquivos, banco ou APIs externas.

- models/: define schemas e contratos de dados.

- prompts/: armazena instruções estáveis para o LLM.

- utils/: contém helpers realmente reutilizáveis.

##Regras de estrutura
- Cada módulo deve ter responsabilidade clara.

- Rotas não devem conter regra de negócio complexa.

- Serviços não devem conhecer detalhes do framework HTTP.

- Repositórios não devem conter lógica de conversa com o usuário.

- Funções devem ser pequenas e com nomes objetivos.

##Convenções de código
- Usar snake_case para arquivos, funções e variáveis.

- Usar classes apenas quando ajudarem a encapsular estado ou contrato.

- Preferir composição a herança.

- Evitar arquivos genéricos como helpers.py ou misc.py.

- Toda integração externa deve ter interface fácil de mockar em testes.

##Convenções de testes
- Criar testes unitários para FAQ, classificação e abertura de ticket.

- Cobrir pelo menos o caminho feliz e o fallback.

- Nomear arquivos de teste com prefixo test_.

- Evitar testes acoplados ao provedor real de LLM.