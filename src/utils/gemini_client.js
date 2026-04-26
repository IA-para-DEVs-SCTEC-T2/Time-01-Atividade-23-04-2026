'use strict';

const GEMINI_API_URL_BASE =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent';

/**
 * Envia a mensagem ao Gemini e retorna a string bruta da resposta.
 * Normalização e mapeamento de intenção são responsabilidade do Classificador.
 *
 * A chave GEMINI_API_KEY é lida de process.env no momento da chamada (lazy),
 * para que o módulo possa ser importado em testes sem disparar process.exit.
 *
 * @param {string} mensagem - Texto enviado pelo cliente.
 * @returns {Promise<string>} String bruta retornada pelo Gemini.
 */
async function classificar_mensagem(mensagem) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_API_KEY) {
    console.error('[gemini_client] ERRO: variável de ambiente GEMINI_API_KEY não está definida. Encerrando processo.');
    process.exit(1);
  }

  const GEMINI_API_URL = `${GEMINI_API_URL_BASE}?key=${GEMINI_API_KEY}`;

  const instrucao = `Você é um classificador de intenções para o suporte da TechStore.
Analise a mensagem do cliente e responda APENAS com uma das seguintes palavras, sem nenhum texto adicional:
- faq_prazos (perguntas sobre prazo de entrega)
- faq_trocas (perguntas sobre troca ou devolução)
- faq_pagamentos (perguntas sobre formas de pagamento)
- abrir_ticket (cliente quer abrir um ticket, falar com humano, registrar reclamação ou problema)
- desconhecida (qualquer outro assunto)

Mensagem do cliente: ${mensagem}`;

  const body = {
    contents: [
      {
        parts: [{ text: instrucao }],
      },
    ],
  };

  const resposta = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resposta.ok) {
    throw new Error(`[gemini_client] Erro na API do Gemini: ${resposta.status} ${resposta.statusText}`);
  }

  const dados = await resposta.json();
  return dados.candidates[0].content.parts[0].text;
}

/**
 * Gera uma resposta conversacional e amigável para mensagens fora do escopo do FAQ.
 *
 * @param {string} mensagem - Texto enviado pelo cliente.
 * @returns {Promise<string>} Resposta gerada pelo Gemini.
 */
async function gerar_resposta_desconhecida(mensagem) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_API_KEY) {
    process.exit(1);
  }

  const GEMINI_API_URL = `${GEMINI_API_URL_BASE}?key=${GEMINI_API_KEY}`;

  const instrucao = `Você é o SupportBot da TechStore, um assistente de atendimento ao cliente simpático e prestativo.
O cliente enviou uma mensagem que não se encaixa nos tópicos do FAQ (prazo de entrega, troca/devolução, formas de pagamento).
Responda de forma natural e amigável à mensagem do cliente, reconhecendo o que ele disse, e gentilmente direcione-o para os tópicos que você pode ajudar.
Seja breve (máximo 3 linhas). Não invente informações. Não use listas com bullets.

Mensagem do cliente: ${mensagem}`;

  const body = {
    contents: [{ parts: [{ text: instrucao }] }],
  };

  const resposta = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resposta.ok) {
    throw new Error(`[gemini_client] Erro na API do Gemini: ${resposta.status} ${resposta.statusText}`);
  }

  const dados = await resposta.json();
  return dados.candidates[0].content.parts[0].text;
}

module.exports = { classificar_mensagem, gerar_resposta_desconhecida };
