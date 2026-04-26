'use strict';

const ws = require('ws');
const { criar_session_manager } = require('./session_manager');
const { gerar_uuid_v4 } = require('../../utils/uuid');
const {
  handle_mensagem,
  handle_abrir_ticket,
  handle_evento_desconhecido,
  handle_json_invalido,
} = require('./event_handler');

/**
 * Cria e inicializa o servidor WebSocket integrado ao http.Server existente.
 *
 * @param {import('http').Server} http_server
 * @param {object} chat_service
 * @param {object} ticket_service
 * @returns {{ fechar(): void }}
 */
function criar_websocket_server(http_server, chat_service, ticket_service) {
  if (process.env.WEBSOCKET_ENABLED === 'false') {
    return { fechar() {} };
  }

  const session_manager = criar_session_manager();
  const wss = new ws.WebSocketServer({ server: http_server, path: '/ws/chat' });

  wss.on('connection', (socket) => {
    const session_id = gerar_uuid_v4();
    session_manager.adicionar(session_id, socket);

    socket.send(JSON.stringify({ tipo: 'session_started', session_id }));
    socket.send(JSON.stringify({
      tipo: 'resposta',
      session_id,
      texto: 'Olá! Sou o SupportBot da TechStore 👋\n\nPosso te ajudar com:\n• Prazo de entrega\n• Troca e devolução\n• Formas de pagamento\n\nComo posso te ajudar hoje?'
    }));

    socket.on('message', async (raw) => {
      try {
        let dados;
        try {
          dados = JSON.parse(raw);
        } catch (_) {
          // texto puro → tratar como mensagem de chat
          dados = { tipo: 'mensagem', texto: raw.toString() };
        }

        let resultado;
        if (dados.tipo === 'mensagem') {
          resultado = await handle_mensagem(dados, chat_service);
        } else if (dados.tipo === 'abrir_ticket') {
          resultado = await handle_abrir_ticket(dados, ticket_service);
        } else {
          resultado = handle_evento_desconhecido(dados.tipo);
        }

        socket.send(JSON.stringify({ ...resultado, session_id }));
      } catch (err) {
        console.error('Erro ao processar mensagem WebSocket:', err.stack || err);
        socket.send(JSON.stringify({ tipo: 'erro', session_id, mensagem: 'Erro interno ao processar a solicitação.' }));
      }
    });

    socket.on('close', () => {
      session_manager.remover(session_id);
      console.log(`Sessão encerrada: ${session_id}`);
    });

    socket.on('error', (err) => {
      session_manager.remover(session_id);
      console.error(`Erro na sessão ${session_id}:`, err);
    });
  });

  function fechar() {
    session_manager.fechar_todas();
    wss.close();
  }

  return { fechar };
}

module.exports = { criar_websocket_server };
