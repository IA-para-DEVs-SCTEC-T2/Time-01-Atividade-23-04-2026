# Requirements Document

## Introduction

Esta feature configura a integração completa do Sequelize com o banco de dados PostgreSQL no SupportBot da TechStore. Inclui a definição dos modelos das três tabelas de FAQ (`faqPrazos`, `faqTrocas`, `faqPagamentos`), a sincronização das tabelas no banco e a execução de seeds com dados iniciais para que o bot possa responder perguntas frequentes desde o primeiro deploy.

## Glossary

- **Sequelize**: ORM utilizado para mapear modelos JavaScript às tabelas do PostgreSQL.
- **PostgreSQL**: Banco de dados relacional onde os dados de FAQ são persistidos.
- **Database**: Instância do Sequelize conectada ao PostgreSQL via variáveis de ambiente.
- **Model**: Representação de uma tabela do banco de dados como classe Sequelize.
- **Seed**: Script que popula o banco com dados iniciais necessários para o funcionamento do sistema.
- **Seeder**: Módulo responsável por executar os seeds de uma ou mais tabelas.
- **faqPrazos**: Tabela que armazena perguntas e respostas sobre prazos de entrega.
- **faqTrocas**: Tabela que armazena perguntas e respostas sobre política de troca e devolução.
- **faqPagamentos**: Tabela que armazena perguntas e respostas sobre formas de pagamento.
- **FAQ_Entry**: Registro individual de uma tabela de FAQ, composto por `pergunta` e `resposta`.

---

## Requirements

### Requirement 1: Conexão com o Banco de Dados

**User Story:** As a developer, I want the application to connect to PostgreSQL using environment variables, so that the database credentials are never hardcoded in the source code.

#### Acceptance Criteria

1. THE Database SHALL read `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` e `DB_PASSWORD` exclusivamente a partir das variáveis de ambiente.
2. WHEN a aplicação é iniciada, THE Database SHALL estabelecer a conexão com o PostgreSQL antes de qualquer operação de banco de dados ser executada.
3. IF a conexão com o PostgreSQL falhar, THEN THE Database SHALL lançar um erro descritivo contendo o motivo da falha.
4. THE Database SHALL utilizar o dialect `postgres` na configuração do Sequelize.

---

### Requirement 2: Definição dos Modelos de FAQ

**User Story:** As a developer, I want Sequelize models defined for each FAQ table, so that the application can read and write FAQ entries in a structured and type-safe way.

#### Acceptance Criteria

1. THE Model `faqPrazos` SHALL definir os campos `pergunta` (STRING, NOT NULL) e `resposta` (TEXT, NOT NULL).
2. THE Model `faqTrocas` SHALL definir os campos `pergunta` (STRING, NOT NULL) e `resposta` (TEXT, NOT NULL).
3. THE Model `faqPagamentos` SHALL definir os campos `pergunta` (STRING, NOT NULL) e `resposta` (TEXT, NOT NULL).
4. WHEN um Model é instanciado, THE Model SHALL utilizar a instância compartilhada do Database para todas as operações.
5. THE Model SHALL desabilitar a criação automática das colunas `createdAt` e `updatedAt` (timestamps: false).

---

### Requirement 3: Migrações das Tabelas

**User Story:** As a developer, I want Sequelize migrations to create the FAQ tables, so that schema changes are versioned, reproducible and safe to run in any environment.

#### Acceptance Criteria

1. THE Database SHALL utilizar migrações Sequelize (via `sequelize-cli`) para criar as tabelas `faqPrazos`, `faqTrocas` e `faqPagamentos` — não usar `sync()` para criação de schema em produção.
2. EACH migration SHALL criar uma tabela com os campos `id` (INTEGER, PRIMARY KEY, AUTO INCREMENT), `pergunta` (STRING, NOT NULL) e `resposta` (TEXT, NOT NULL).
3. EACH migration SHALL implementar o método `down` que desfaz a criação da tabela (`dropTable`).
4. THE migrations SHALL ser executadas via `npx sequelize-cli db:migrate`.
5. IF uma migração já tiver sido executada, THEN THE sequelize-cli SHALL ignorá-la sem erro (idempotência nativa do sequelize-cli).
6. THE projeto SHALL conter um arquivo `.sequelizerc` apontando os diretórios corretos de config, models, migrations e seeders.

---

### Requirement 4: Seeds de Dados Iniciais

**User Story:** As a developer, I want seed scripts to populate the FAQ tables with initial data, so that the SupportBot can answer customer questions immediately after the first deploy.

#### Acceptance Criteria

1. THE Seeder de `faqPrazos` SHALL inserir ao menos 3 FAQ_Entries com perguntas e respostas sobre prazos de entrega da TechStore.
2. THE Seeder de `faqTrocas` SHALL inserir ao menos 3 FAQ_Entries com perguntas e respostas sobre política de troca e devolução da TechStore.
3. THE Seeder de `faqPagamentos` SHALL inserir ao menos 3 FAQ_Entries com perguntas e respostas sobre formas de pagamento aceitas pela TechStore.
4. WHEN um seed é executado, THE Seeder SHALL utilizar `bulkCreate` para inserir todos os registros de uma tabela em uma única operação.
5. IF um seed for executado mais de uma vez, THEN THE Seeder SHALL ignorar registros duplicados sem lançar erro (idempotência via `ignoreDuplicates: true`).
6. THE Seeder SHALL executar os seeds das três tabelas em sequência: `faqPrazos`, `faqTrocas`, `faqPagamentos`.

---

### Requirement 5: Script de Execução dos Seeds

**User Story:** As a developer, I want a runnable seed script, so that I can populate the database with a single command without modifying application code.

#### Acceptance Criteria

1. THE Seeder SHALL ser executável diretamente via `node src/database/seed.js`.
2. WHEN o script de seed é executado com sucesso, THE Seeder SHALL exibir uma mensagem de confirmação no console para cada tabela populada.
3. IF o script de seed falhar em qualquer tabela, THEN THE Seeder SHALL exibir o erro no console e encerrar o processo com código de saída diferente de zero.
4. THE Seeder SHALL encerrar a conexão com o banco de dados após a conclusão de todos os seeds.
