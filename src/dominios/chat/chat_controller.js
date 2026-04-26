'use strict';

const { ValidationError, DatabaseError } = require('../ticket/ticket_service');

const MENSAGEM_DESCONHECIDA =
  'Não consegui responder sua dúvida. Por favor, informe nome, email e descrição para abrirmos um ticket.';

function criar_chat_controller(chat_service, ticket_service) {
  async function post_chat(req, res, next) {
    try {
      const { mensagem } = req.body;

      if (!mensagem || typeof mensagem !== 'string' || mensagem.trim() === '') {
        return res.status(400).json({ erro: 'O campo mensagem é obrigatório e não pode estar vazio.' });
      }

      if (mensagem.length > 1000) {
        return res.status(400).json({ erro: 'A mensagem não pode exceder 1000 caracteres.' });
      }

      const resultado = await chat_service.processar_mensagem(mensagem);

      if (resultado.tipo === 'desconhecida') {
        return res.status(200).json({ tipo: 'desconhecida', mensagem: MENSAGEM_DESCONHECIDA });
      }

      return res.status(200).json({ tipo: resultado.tipo, resposta: resultado.resposta });
    } catch (err) {
      console.error('Erro em post_chat:', err);

      if (err instanceof DatabaseError) {
        return res.status(503).json({ erro: 'Serviço temporariamente indisponível. Tente novamente em instantes.' });
      }

      return next(err);
    }
  }

  async function post_ticket(req, res, next) {
    try {
      const { nome, email, descricao } = req.body;

      const resultado = await ticket_service.criar_ticket({ nome, email, descricao });

      return res.status(201).json({ id: resultado.id });
    } catch (err) {
      console.error('Erro em post_ticket:', err);

      if (err instanceof ValidationError) {
        return res.status(400).json({ erro: err.message });
      }

      if (err instanceof DatabaseError) {
        return res.status(500).json({ erro: 'Erro interno ao registrar o ticket. Tente novamente.' });
      }

      return next(err);
    }
  }

  return { post_chat, post_ticket };
}

module.exports = { criar_chat_controller };
