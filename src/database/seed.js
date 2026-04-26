require('dotenv').config();

const FaqPrazos = require('../models/faq_prazos');
const FaqTrocas = require('../models/faq_trocas');
const FaqPagamentos = require('../models/faq_pagamentos');

const faq_prazos_data = require('./seeders/faq_prazos_seeder');
const faq_trocas_data = require('./seeders/faq_trocas_seeder');
const faq_pagamentos_data = require('./seeders/faq_pagamentos_seeder');

const sequelize = require('./index');

async function seed() {
  try {
    await FaqPrazos.bulkCreate(faq_prazos_data, { ignoreDuplicates: true });
    console.log('faqPrazos populado com sucesso.');

    await FaqTrocas.bulkCreate(faq_trocas_data, { ignoreDuplicates: true });
    console.log('faqTrocas populado com sucesso.');

    await FaqPagamentos.bulkCreate(faq_pagamentos_data, { ignoreDuplicates: true });
    console.log('faqPagamentos populado com sucesso.');
  } catch (error) {
    console.error('Erro ao popular o banco de dados:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seed();
