require('dotenv').config();

const http = require('http');
const sequelize = require('./database/index');
const app = require('./server');

const gemini_client = require('./utils/gemini_client');
const { criar_classificador } = require('./dominios/chat/classificador');
const faq_repository = require('./dominios/chat/faq_repository');
const { criar_chat_service } = require('./dominios/chat/chat_service');
const ticket_service = require('./dominios/ticket/ticket_service');
const { criar_websocket_server } = require('./dominios/websocket/websocket_server');

const port = process.env.PORT || 3000;

const http_server = http.createServer(app);

const classificador = criar_classificador(gemini_client);
const chat_service = criar_chat_service(classificador, faq_repository, gemini_client);

if (process.env.WEBSOCKET_ENABLED !== 'false') {
  criar_websocket_server(http_server, chat_service, ticket_service);
}

sequelize.authenticate()
  .then(() => {
    http_server.listen(port, () => {
      console.log(`Servidor rodando em http://localhost:${port}`);
      console.log(`Chat disponível em http://localhost:${port}/chat.html`);
    });
  })
  .catch((error) => {
    console.error('Falha ao conectar ao banco de dados:', error);
    process.exit(1);
  });
