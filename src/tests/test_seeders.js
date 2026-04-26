'use strict';

const faqPrazosData = require('../database/seeders/faq_prazos_seeder');
const faqTrocasData = require('../database/seeders/faq_trocas_seeder');
const faqPagamentosData = require('../database/seeders/faq_pagamentos_seeder');

const seeders = [
  { name: 'faq_prazos_seeder', data: faqPrazosData },
  { name: 'faq_trocas_seeder', data: faqTrocasData },
  { name: 'faq_pagamentos_seeder', data: faqPagamentosData },
];

describe('FAQ Seeders', () => {
  seeders.forEach(({ name, data }) => {
    describe(name, () => {
      it('exports an array', () => {
        expect(Array.isArray(data)).toBe(true);
      });

      it('has at least 3 entries', () => {
        expect(data.length).toBeGreaterThanOrEqual(3);
      });

      it('every entry has a non-empty pergunta string', () => {
        data.forEach((entry, i) => {
          expect(typeof entry.pergunta).toBe('string');
          expect(entry.pergunta.trim().length).toBeGreaterThan(0);
        });
      });

      it('every entry has a non-empty resposta string', () => {
        data.forEach((entry, i) => {
          expect(typeof entry.resposta).toBe('string');
          expect(entry.resposta.trim().length).toBeGreaterThan(0);
        });
      });
    });
  });
});
