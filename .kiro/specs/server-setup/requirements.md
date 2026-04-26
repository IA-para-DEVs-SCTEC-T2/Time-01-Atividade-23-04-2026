# Requirements Document

## Introduction

Esta feature cobre a configuração e inicialização do servidor Express do SupportBot da TechStore. O escopo inclui: instância do servidor Express com middlewares básicos (JSON, CORS, segurança), estrutura de rotas, tratamento centralizado de erros e integração com o banco de dados PostgreSQL via Sequelize. O servidor deve ser inicializado a partir de `src/server.js`, com `src/index.js` como ponto de entrada.

## Glossary

- **Server**: Instância do servidor Express definida em `src/server.js`
- **App**: Objeto de aplicação Express configurado com middlewares e rotas
- **Index**: Ponto de entrada da aplicação em `src/index.js`, responsável por iniciar o Server
- **Database**: Camada de acesso ao PostgreSQL gerenciada pelo Sequelize, configurada em `src/config/`
- **Router**: Módulo de definição de rotas localizado em `src/routers/`
- **Error_Handler**: Middleware centralizado de tratamento de erros localizado em `src/middlewares/`
- **Config**: Módulo de configuração centralizado em `src/config/`, carregado via variáveis de ambiente

## Requirements

### Requirement 1: Inicialização do Servidor Express

**User Story:** Como desenvolvedor, quero que o servidor Express seja inicializado de forma isolada em `server.js`, para que o ponto de entrada `index.js` permaneça simples e o servidor seja testável de forma independente.

#### Acceptance Criteria

1. THE Server SHALL exportar uma instância configurada do Express com todos os middlewares e rotas registrados.
2. THE Index SHALL importar o Server e chamar o método de escuta na porta definida pela variável de ambiente `PORT`.
3. IF a variável de ambiente `PORT` não estiver definida, THEN THE Index SHALL utilizar a porta `3000` como valor padrão.
4. WHEN o servidor iniciar com sucesso, THE Index SHALL registrar no console a porta em que o servidor está escutando.

---

### Requirement 2: Configuração de Middlewares Básicos

**User Story:** Como desenvolvedor, quero que o App tenha middlewares essenciais configurados, para que as requisições HTTP sejam processadas corretamente com suporte a JSON e CORS.

#### Acceptance Criteria

1. THE App SHALL aplicar o middleware `express.json()` para processar corpos de requisição no formato JSON.
2. THE App SHALL aplicar o middleware `express.urlencoded({ extended: true })` para processar corpos de requisição no formato URL-encoded.
3. THE App SHALL aplicar o middleware `cors` para permitir requisições de origens configuradas via variável de ambiente `CORS_ORIGIN`.
4. IF a variável de ambiente `CORS_ORIGIN` não estiver definida, THEN THE App SHALL permitir requisições de qualquer origem como valor padrão.
5. THE App SHALL aplicar o middleware `helmet` para definir cabeçalhos HTTP de segurança.

---

### Requirement 3: Estrutura de Rotas

**User Story:** Como desenvolvedor, quero que as rotas da API sejam registradas de forma centralizada no App, para que novos domínios possam ser adicionados sem alterar a inicialização do servidor.

#### Acceptance Criteria

1. THE App SHALL registrar todas as rotas sob o prefixo `/api`.
2. THE Router SHALL exportar um `express.Router()` com as rotas do domínio correspondente.
3. WHEN uma requisição for feita para uma rota não registrada, THE App SHALL retornar uma resposta com status HTTP `404` e um corpo JSON contendo a chave `message`.

---

### Requirement 4: Tratamento Centralizado de Erros

**User Story:** Como desenvolvedor, quero um middleware centralizado de tratamento de erros, para que falhas inesperadas retornem respostas padronizadas sem expor detalhes internos ao cliente.

#### Acceptance Criteria

1. THE Error_Handler SHALL ser registrado no App como o último middleware, após todas as rotas.
2. WHEN um erro for passado via `next(error)`, THE Error_Handler SHALL retornar uma resposta JSON com as chaves `message` e `status`.
3. IF o erro não possuir uma propriedade `status` definida, THEN THE Error_Handler SHALL retornar o status HTTP `500`.
4. WHILE o ambiente de execução for diferente de `production`, THE Error_Handler SHALL incluir a propriedade `stack` na resposta JSON para facilitar o diagnóstico.
5. WHILE o ambiente de execução for `production`, THE Error_Handler SHALL omitir a propriedade `stack` da resposta JSON.

---

### Requirement 5: Integração com o Banco de Dados via Sequelize

**User Story:** Como desenvolvedor, quero que a conexão com o PostgreSQL seja estabelecida e verificada na inicialização da aplicação, para que falhas de conexão sejam detectadas antes de o servidor começar a aceitar requisições.

#### Acceptance Criteria

1. THE Config SHALL exportar um objeto de configuração do Sequelize carregado a partir das variáveis de ambiente `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` e `DB_PASSWORD`.
2. THE Database SHALL exportar uma instância do Sequelize configurada com os valores do Config.
3. WHEN o Index iniciar, THE Database SHALL executar o método `authenticate()` para verificar a conexão com o PostgreSQL antes de o Server começar a escutar requisições.
4. IF o método `authenticate()` lançar um erro, THEN THE Index SHALL registrar o erro no console e encerrar o processo com código de saída `1`.
5. THE Database SHALL utilizar o dialect `postgres` na instância do Sequelize.
