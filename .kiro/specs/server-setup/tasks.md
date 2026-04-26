# Plano de Implementação: server-setup

## Visão Geral

Configuração e inicialização do servidor Express do SupportBot da TechStore. A implementação segue a sequência: configuração do banco → instância do Sequelize → app Express com middlewares e rotas → ponto de entrada com inicialização ordenada.

## Tasks

- [x] 1. Instalar dependências e configurar scripts de teste
  - Instalar `express`, `cors`, `helmet`, `sequelize`, `pg`, `pg-hstore`, `dotenv` como dependências de produção
  - Instalar `jest`, `supertest`, `fast-check` como dependências de desenvolvimento
  - Adicionar script `"test": "jest --runInBand"` no `package.json`
  - _Requirements: 1.1, 2.1, 2.2, 2.3, 2.5, 5.2_

- [x] 2. Implementar configuração do banco de dados
  - [x] 2.1 Criar `src/config/database.js`
    - Exportar objeto com `host`, `port`, `database`, `username`, `password` lidos das variáveis de ambiente e `dialect: 'postgres'` fixo
    - _Requirements: 5.1, 5.5_

  - [ ]* 2.2 Escrever property test para config do banco (Property 5)
    - Criar `src/config/test_config.js`
    - **Property 5: Config reflete as variáveis de ambiente**
    - Usar `fc.record({ host: fc.string(), port: fc.string(), name: fc.string(), user: fc.string(), password: fc.string() })` para gerar combinações arbitrárias
    - Para cada combinação, setar as env vars, re-importar o módulo e verificar que todos os campos batem
    - Incluir comentário `// Feature: server-setup, Property 5: Config do banco reflete as variáveis de ambiente`
    - **Validates: Requirements 5.1, 5.5**

- [x] 3. Implementar instância do Sequelize
  - [x] 3.1 Criar `src/database/index.js`
    - Importar `Sequelize` de `sequelize` e o objeto de config de `src/config/database.js`
    - Instanciar `new Sequelize(config.database, config.username, config.password, config)` e exportar
    - _Requirements: 5.2, 5.5_

- [x] 4. Implementar middleware de tratamento de erros
  - [x] 4.1 Criar `src/middlewares/error_handler.js`
    - Função de 4 parâmetros `(err, req, res, next)`
    - Usar `err.status || 500` como status HTTP da resposta
    - Resposta JSON sempre inclui `message` e `status`
    - Incluir `stack` apenas quando `process.env.NODE_ENV !== 'production'`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 4.2 Escrever property tests para o error handler (Properties 3 e 4)
    - Criar `src/middlewares/test_error_handler.js`
    - **Property 3: Error handler retorna JSON padronizado com message e status**
    - Usar `fc.record({ message: fc.string(), status: fc.option(fc.integer({ min: 400, max: 599 })) })` para gerar erros arbitrários
    - Verificar que a resposta sempre contém `message` e `status`; quando `err.status` ausente, status HTTP deve ser `500`
    - Incluir comentário `// Feature: server-setup, Property 3: Error handler retorna JSON padronizado`
    - **Property 4: Stack presente fora de production, ausente em production**
    - Variar `NODE_ENV` entre `'production'` e outros valores arbitrários (`fc.string()`)
    - Verificar presença/ausência de `stack` conforme o ambiente
    - Incluir comentário `// Feature: server-setup, Property 4: Stack por ambiente`
    - **Validates: Requirements 4.2, 4.3, 4.4, 4.5**

- [x] 5. Implementar router base e app Express
  - [x] 5.1 Criar `src/routers/index.js`
    - Criar um `express.Router()` vazio como placeholder para rotas futuras
    - Exportar o router
    - _Requirements: 3.1, 3.2_

  - [x] 5.2 Criar `src/server.js`
    - Criar instância do Express
    - Registrar middlewares na ordem: `express.json()`, `express.urlencoded({ extended: true })`, `cors({ origin: process.env.CORS_ORIGIN || '*' })`, `helmet()`
    - Montar o router de `src/routers/index.js` sob `/api`
    - Registrar handler 404 após as rotas: retornar `{ message: 'Rota não encontrada' }` com status `404`
    - Registrar `error_handler` como último middleware
    - Exportar `app`
    - _Requirements: 1.1, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.3, 4.1_

  - [ ]* 5.3 Escrever property tests para o app (Properties 1 e 2)
    - Criar `src/test_server.js`
    - **Property 1: CORS origin reflete a variável de ambiente**
    - Usar `fc.webUrl()` ou `fc.constantFrom('http://example.com', 'http://localhost:3000')` para gerar origens
    - Para cada origem, setar `CORS_ORIGIN`, recriar o app e verificar que `Access-Control-Allow-Origin` na resposta bate com a origem enviada
    - Incluir comentário `// Feature: server-setup, Property 1: CORS origin reflete a variável de ambiente`
    - **Property 2: Rotas não registradas retornam 404 com JSON**
    - Usar `fc.string({ minLength: 1 })` para gerar paths aleatórios (prefixar com `/` se necessário, excluir paths registrados)
    - Verificar que a resposta tem status `404` e corpo JSON com chave `message`
    - Incluir comentário `// Feature: server-setup, Property 2: Rotas não registradas retornam 404 com JSON`
    - **Validates: Requirements 2.3, 2.4, 3.3**

  - [ ]* 5.4 Escrever testes unitários para o app
    - No mesmo arquivo `src/test_server.js`
    - Verificar que o módulo exporta uma instância Express válida
    - Verificar que `POST /api` com body JSON retorna status diferente de `400` (middleware json ativo)
    - _Requirements: 1.1, 2.1, 2.2_

- [x] 6. Checkpoint — Garantir que todos os testes passam
  - Garantir que todos os testes passam até aqui. Perguntar ao usuário se houver dúvidas.

- [x] 7. Implementar ponto de entrada
  - [x] 7.1 Criar `src/index.js`
    - Chamar `require('dotenv').config()` como primeira linha para carregar variáveis de ambiente do `.env`
    - Importar `sequelize` de `src/database/index.js` e `app` de `src/server.js`
    - Chamar `sequelize.authenticate()` antes de qualquer `listen`
    - Em caso de sucesso: chamar `app.listen(process.env.PORT || 3000)` e registrar no console a porta em uso
    - Em caso de falha: registrar o erro com `console.error` e chamar `process.exit(1)`
    - _Requirements: 1.2, 1.3, 1.4, 5.3, 5.4_

  - [ ]* 7.2 Escrever testes unitários para o index
    - Criar `src/test_index.js`
    - Mockar `sequelize.authenticate` e `app.listen` para evitar conexão real
    - Verificar: `authenticate` é chamado antes de `listen`; `listen` usa `PORT` do ambiente; fallback para porta `3000`; `console.log` é chamado após `listen`; `process.exit(1)` é chamado quando `authenticate` rejeita
    - _Requirements: 1.2, 1.3, 1.4, 5.3, 5.4_

- [ ] 8. Checkpoint final — Garantir que todos os testes passam
  - Garantir que todos os testes passam. Perguntar ao usuário se houver dúvidas.

## Notas

- Tasks marcadas com `*` são opcionais e podem ser puladas para um MVP mais rápido
- Cada task referencia os requisitos correspondentes para rastreabilidade
- Os testes de propriedade usam **fast-check** com mínimo de 100 iterações por propriedade
- Testes nunca devem conectar ao banco real — mockar `sequelize.authenticate`
- Checkpoints garantem validação incremental antes de avançar
