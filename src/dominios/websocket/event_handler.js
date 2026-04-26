'use strict';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Processa evento de mensagem do cliente.
 *
 * @param {{ texto?: string }} dados
 * @param {{ processar_mensagem(texto: string): Promise<{ tipo: 'faq', resposta: string } | { tipo: 'desconhecida' }> }} chat_service
 * @returns {Promise<{ tipo: 'resposta', texto: string } | { tipo: 'erro', mensagem: string }>}
 */
async function handle_mensagem(dados, chat_service) {
  const texto = dados && dados.texto;

  if (texto === undefined || texto === null || typeof texto !== 'string' || texto.trim() === '') {
    return { tipo: 'erro', mensagem: "O campo 'texto' é obrigatório e não pode estar vazio." };
  }

  if (texto.length > 1000) {
    return { tipo: 'erro', mensagem: 'A mensagem não pode exceder 1000 caracteres.' };
  }

  const result = await chat_service.processar_mensagem(texto);

  if (result.tipo === 'faq') {
    return { tipo: 'resposta', texto: result.resposta };
  }

  return {
    tipo: 'resposta',
    texto: result.resposta || 'Não entendi sua dúvida. Posso te ajudar com prazo de entrega, troca e devolução ou formas de pagamento.',
  };
}

/**
 * Processa evento de abertura de ticket.
 *
 * @param {{ nome?: string, email?: string, descricao?: string }} dados
 * @param {{ criar_ticket(dados: object): Promise<{ id: number }> }} ticket_service
 * @returns {Promise<{ tipo: 'ticket_criado', id: number } | { tipo: 'erro', mensagem: string }>}
 */
async function handle_abrir_ticket(dados, ticket_service) {
  const nome = dados && dados.nome;
  const email = dados && dados.email;
  const descricao = dados && dados.descricao;

  const campo_invalido = (v) => !v || typeof v !== 'string' || v.trim() === '';

  if (campo_invalido(nome) || campo_invalido(email) || campo_invalido(descricao)) {
    return { tipo: 'erro', mensagem: 'Os campos nome, email e descricao são obrigatórios.' };
  }

  if (!EMAIL_REGEX.test(email)) {
    return { tipo: 'erro', mensagem: 'O campo email deve conter um endereço de e-mail válido.' };
  }

  try {
    const result = await ticket_service.criar_ticket({ nome, email, descricao });
    return { tipo: 'ticket_criado', id: result.id };
  } catch (err) {
    return {
      tipo: 'erro',
      mensagem: err.message || 'Erro interno ao registrar o ticket. Tente novamente.',
    };
  }
}

/**
 * Retorna evento de erro para tipo de evento não reconhecido.
 *
 * @param {string} tipo
 * @returns {{ tipo: 'erro', mensagem: string }}
 */
function handle_evento_desconhecido(tipo) {
  return { tipo: 'erro', mensagem: `Tipo de evento não reconhecido: ${tipo}` };
}

/**
 * Retorna evento de erro para JSON inválido.
 *
 * @returns {{ tipo: 'erro', mensagem: string }}
 */
function handle_json_invalido() {
  return { tipo: 'erro', mensagem: 'Formato de mensagem inválido. Envie um JSON válido.' };
}

module.exports = {
  handle_mensagem,
  handle_abrir_ticket,
  handle_evento_desconhecido,
  handle_json_invalido,
};
