'use strict';

const ws = require('ws');
const { criar_session_manager } = require('./session_manager');
const { gerar_uuid_v4 } = require('../../utils/uuid');
const {
  handle_mensagem,
  handle_abrir_ticket,
  handle_evento_desconhecido,
} = require('./event_handler');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function criar_websocket_server(http_server, chat_service, ticket_service) {
  if (process.env.WEBSOCKET_ENABLED === 'false') {
    return { fechar() {} };
  }

  const session_manager = criar_session_manager();
  const wss = new ws.WebSocketServer({ server: http_server, path: '/ws/chat' });

  wss.on('connection', (socket) => {
    const session_id = gerar_uuid_v4();
    session_manager.adicionar(session_id, socket);

    // estado do fluxo de ticket por sessão
    let ticket_state = null; // null | { etapa: 'nome'|'email'|'descricao', nome?, email? }

    function enviar(obj) {
      socket.send(JSON.stringify({ ...obj, session_id }));
    }

    socket.send(JSON.stringify({ tipo: 'session_started', session_id }));
    enviar({
      tipo: 'resposta',
      texto: 'Olá! Sou o SupportBot da TechStore 👋\n\nPosso te ajudar com:\n• Prazo de entrega\n• Troca e devolução\n• Formas de pagamento\n\nComo posso te ajudar hoje?'
    });

    socket.on('message', async (raw) => {
      try {
        const texto = (() => {
          try { const d = JSON.parse(raw); return d.texto || null; }
          catch (_) { return raw.toString().trim(); }
        })();

        if (!texto) return;

        // fluxo de coleta de ticket passo a passo
        if (ticket_state) {
          if (ticket_state.etapa === 'nome') {
            ticket_state.nome = texto;
            ticket_state.etapa = 'email';
            enviar({ tipo: 'resposta', texto: 'Qual é o seu e-mail?' });
            return;
          }

          if (ticket_state.etapa === 'email') {
            if (!EMAIL_REGEX.test(texto)) {
              enviar({ tipo: 'resposta', texto: 'E-mail inválido. Por favor, informe um e-mail válido.' });
              return;
            }
            ticket_state.email = texto;
            ticket_state.etapa = 'descricao';
            enviar({ tipo: 'resposta', texto: 'Descreva sua dúvida ou problema:' });
            return;
          }

          if (ticket_state.etapa === 'descricao') {
            const { nome, email } = ticket_state;
            ticket_state = null;
            enviar({ tipo: 'digitando' });
            const resultado = await handle_abrir_ticket(
              { tipo: 'abrir_ticket', nome, email, descricao: texto },
              ticket_service
            );
            if (resultado.tipo === 'ticket_criado') {
              enviar({ tipo: 'resposta', texto: `Ticket #${resultado.id} criado com sucesso! Nossa equipe entrará em contato em breve.` });
            } else {
              enviar(resultado);
            }
            return;
          }
        }

        // fluxo normal
        enviar({ tipo: 'digitando' });
        const result = await handle_mensagem({ tipo: 'mensagem', texto }, chat_service);

        if (result.tipo === 'resposta' && result._solicitar_ticket) {
          ticket_state = { etapa: 'nome' };
          enviar({ tipo: 'resposta', texto: result.texto });
          enviar({ tipo: 'resposta', texto: 'Qual é o seu nome?' });
          return;
        }

        // verificar se chat_service sinalizou solicitar_ticket
        if (result._solicitar_ticket || (result.tipo === 'resposta' && result.texto && result.texto.includes('abrir um ticket'))) {
          ticket_state = { etapa: 'nome' };
          enviar(result);
          enviar({ tipo: 'resposta', texto: 'Qual é o seu nome?' });
          return;
        }

        enviar(result);
      } catch (err) {
        console.error('Erro ao processar mensagem WebSocket:', err.stack || err);
        enviar({ tipo: 'erro', mensagem: 'Erro interno ao processar a solicitação.' });
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
