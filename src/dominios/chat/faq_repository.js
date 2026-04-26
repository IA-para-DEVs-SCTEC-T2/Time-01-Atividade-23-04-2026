const FaqPrazos = require('../../models/faq_prazos');
const FaqTrocas = require('../../models/faq_trocas');
const FaqPagamentos = require('../../models/faq_pagamentos');

const MAPA_INTENCOES = {
  faq_prazos: FaqPrazos,
  faq_trocas: FaqTrocas,
  faq_pagamentos: FaqPagamentos,
};

async function buscar_por_intencao(intencao) {
  const Modelo = MAPA_INTENCOES[intencao];

  if (!Modelo) {
    throw new Error(`Intenção desconhecida: "${intencao}"`);
  }

  return Modelo.findAll({ attributes: ['pergunta', 'resposta'] });
}

module.exports = { buscar_por_intencao };
