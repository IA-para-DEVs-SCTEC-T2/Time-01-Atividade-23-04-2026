'use strict';

const INTENCOES_FAQ = ['faq_prazos', 'faq_trocas', 'faq_pagamentos'];

function criar_chat_service(classificador, faq_repository, gemini_client) {
  async function processar_mensagem(mensagem) {
    const intencao = await classificador.classificar(mensagem);

    if (intencao === 'abrir_ticket') {
      return { tipo: 'solicitar_ticket' };
    }
    if (!INTENCOES_FAQ.includes(intencao)) {
      let texto_desconhecida;
      try {
        texto_desconhecida = await gemini_client.gerar_resposta_desconhecida(mensagem);
      } catch (_) {
        texto_desconhecida = 'Não entendi sua dúvida. Posso te ajudar com prazo de entrega, troca e devolução ou formas de pagamento. Como posso te ajudar?';
      }
      return { tipo: 'desconhecida', resposta: texto_desconhecida };
    }

    const registros = await faq_repository.buscar_por_intencao(intencao);

    if (!registros || registros.length === 0) {
      return { tipo: 'desconhecida' };
    }

    const resposta = registros.map(r => r.resposta).join('\n');
    return { tipo: 'faq', resposta };
  }

  return { processar_mensagem };
}

module.exports = { criar_chat_service };
