# Implementation Plan: database-setup

## Overview

Configurar a camada de persistência do SupportBot: instalar dependências, criar `.sequelizerc`, definir os três models de FAQ, gerar as migrações, criar os seeders com dados iniciais e o script orquestrador `seed.js`. Testes unitários com Jest e mocks cobrem models, seeders e o script de seed.

## Tasks

- [x] 1. Instalar sequelize-cli e criar .sequelizerc
  - Adicionar `sequelize-cli` como devDependency via `npm install --save-dev sequelize-cli`
  - Criar `.sequelizerc` na raiz apontando `src/config/database.js`, `src/models`, `src/database/migrations` e `src/database/seeders`
  - _Requirements: 3.4, 3.6_

- [x] 2. Criar os models de FAQ
  - [x] 2.1 Criar `src/models/faq_prazos.js`
    - Definir campos `pergunta` (STRING, NOT NULL) e `resposta` (TEXT, NOT NULL)
    - Configurar `tableName: 'faqPrazos'` e `timestamps: false`
    - Importar a instância Sequelize de `src/database/index.js`
    - _Requirements: 2.1, 2.4, 2.5_
  - [x] 2.2 Criar `src/models/faq_trocas.js`
    - Mesma estrutura de `faq_prazos.js` com `tableName: 'faqTrocas'`
    - _Requirements: 2.2, 2.4, 2.5_
  - [x] 2.3 Criar `src/models/faq_pagamentos.js`
    - Mesma estrutura de `faq_prazos.js` com `tableName: 'faqPagamentos'`
    - _Requirements: 2.3, 2.4, 2.5_
  - [ ]* 2.4 Escrever testes unitários para os três models (`src/tests/test_models.js`)
    - Verificar que cada model define `pergunta` como STRING NOT NULL e `resposta` como TEXT NOT NULL
    - Verificar `timestamps: false` e `tableName` correto em cada model
    - Verificar que cada model usa a instância Sequelize compartilhada (`model.sequelize === sequelize`)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3. Criar as migrações das tabelas
  - [x] 3.1 Criar migração `src/database/migrations/YYYYMMDDHHMMSS-create-faq-prazos.js`
    - Implementar `up` com `createTable('faqPrazos', { id, pergunta, resposta })`
    - Implementar `down` com `dropTable('faqPrazos')`
    - _Requirements: 3.1, 3.2, 3.3_
  - [x] 3.2 Criar migração `src/database/migrations/YYYYMMDDHHMMSS-create-faq-trocas.js`
    - Mesma estrutura para `faqTrocas`
    - _Requirements: 3.1, 3.2, 3.3_
  - [x] 3.3 Criar migração `src/database/migrations/YYYYMMDDHHMMSS-create-faq-pagamentos.js`
    - Mesma estrutura para `faqPagamentos`
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 4. Checkpoint — Verificar estrutura de migrações
  - Confirmar que os três arquivos de migração existem em `src/database/migrations/`
  - Confirmar que cada migração implementa `up` e `down`
  - Confirmar que `.sequelizerc` aponta os diretórios corretos
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Criar os seeders com dados iniciais
  - [x] 5.1 Criar `src/database/seeders/faq_prazos_seeder.js`
    - Exportar array com ao menos 3 FAQ_Entries sobre prazos de entrega da TechStore
    - Cada entrada deve conter `pergunta` (string não vazia) e `resposta` (string não vazia)
    - _Requirements: 4.1, 4.4_
  - [x] 5.2 Criar `src/database/seeders/faq_trocas_seeder.js`
    - Exportar array com ao menos 3 FAQ_Entries sobre política de troca e devolução
    - _Requirements: 4.2, 4.4_
  - [x] 5.3 Criar `src/database/seeders/faq_pagamentos_seeder.js`
    - Exportar array com ao menos 3 FAQ_Entries sobre formas de pagamento aceitas
    - _Requirements: 4.3, 4.4_
  - [ ]* 5.4 Escrever testes unitários para os seeders (`src/tests/test_seeders.js`)
    - Verificar que cada seeder exporta um array com ao menos 3 entradas
    - Verificar que cada entrada contém `pergunta` e `resposta` como strings não vazias
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 6. Criar o script orquestrador `src/database/seed.js`
  - Importar os três models e os três seeders
  - Executar `bulkCreate` com `{ ignoreDuplicates: true }` para cada tabela na ordem: `faqPrazos` → `faqTrocas` → `faqPagamentos`
  - Logar mensagem de confirmação no console após cada tabela populada com sucesso
  - Capturar erros: chamar `console.error` e `process.exit(1)` em caso de falha
  - Chamar `sequelize.close()` ao final (sucesso ou falha)
  - _Requirements: 4.4, 4.5, 4.6, 5.1, 5.2, 5.3, 5.4_
  - [ ]* 6.1 Escrever testes unitários para `seed.js` (`src/tests/test_seed.js`)
    - Mockar os três models e verificar que `bulkCreate` é chamado uma vez por tabela com o array correto
    - Verificar que `bulkCreate` é chamado com `{ ignoreDuplicates: true }` em todas as chamadas
    - Verificar a ordem de execução: `faqPrazos` → `faqTrocas` → `faqPagamentos`
    - Verificar que `console.log` é chamado após cada tabela populada com sucesso
    - Verificar que quando `bulkCreate` rejeita: `console.error` é chamado e `process.exit(1)` é invocado
    - Verificar que `sequelize.close()` é chamado ao final em ambos os cenários (sucesso e falha)
    - _Requirements: 4.4, 4.5, 4.6, 5.2, 5.3, 5.4_

- [x] 7. Checkpoint final — Ensure all tests pass, ask the user if questions arise.

## Notes

- Tarefas marcadas com `*` são opcionais e podem ser puladas para um MVP mais rápido
- Cada tarefa referencia os requisitos específicos para rastreabilidade
- O design não inclui Correctness Properties — testes são exclusivamente unitários com mocks (sem PBT)
- Migrações devem ser executadas manualmente via `npx sequelize-cli db:migrate`
- O seed pode ser executado via `node src/database/seed.js` após as migrações
