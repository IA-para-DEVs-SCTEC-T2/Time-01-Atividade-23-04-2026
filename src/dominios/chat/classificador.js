'use strict';

const INTENCOES_VALIDAS = ['faq_prazos', 'faq_trocas', 'faq_pagamentos', 'desconhecida'];

/**
 * Cria um classificador de intenções com o gemini_client injetado.
 *
 * @param {{ classificar_mensagem(mensagem: string): Promise<string> }} gemini_client
 * @returns {{ classificar(mensagem: string): Promise<string> }}
 */
function criar_classificador(gemini_client) {
  async function classificar(mensagem) {
    try {
      const resposta_bruta = await gemini_client.classificar_mensagem(mensagem);
      const intencao = resposta_bruta.trim().toLowerCase();

      if (INTENCOES_VALIDAS.includes(intencao)) {
        return intencao;
      }

      return 'desconhecida';
    } catch (err) {
      console.error('[classificador] erro ao chamar Gemini:', err);
      return 'desconhecida';
    }
  }

  return { classificar };
}

module.exports = { criar_classificador, INTENCOES_VALIDAS };
