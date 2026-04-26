'use strict';

jest.mock('../database/index', () => {
  const mockSequelize = {
    define: jest.fn((modelName, attributes, options) => ({
      modelName,
      rawAttributes: attributes,
      options,
      sequelize: mockSequelize,
    })),
  };
  return mockSequelize;
});

describe('FAQ Models', () => {
  let sequelize;
  let FaqPrazos, FaqTrocas, FaqPagamentos;

  beforeAll(() => {
    sequelize = require('../database/index');
    FaqPrazos = require('../models/faq_prazos');
    FaqTrocas = require('../models/faq_trocas');
    FaqPagamentos = require('../models/faq_pagamentos');
  });

  const models = [
    { name: 'FaqPrazos', tableName: 'faqPrazos', getter: () => FaqPrazos },
    { name: 'FaqTrocas', tableName: 'faqTrocas', getter: () => FaqTrocas },
    { name: 'FaqPagamentos', tableName: 'faqPagamentos', getter: () => FaqPagamentos },
  ];

  models.forEach(({ name, tableName, getter }) => {
    describe(name, () => {
      it('defines pergunta as STRING NOT NULL', () => {
        const model = getter();
        expect(model.rawAttributes.pergunta.type.key || model.rawAttributes.pergunta.type.constructor.name)
          .toMatch(/STRING/i);
        expect(model.rawAttributes.pergunta.allowNull).toBe(false);
      });

      it('defines resposta as TEXT NOT NULL', () => {
        const model = getter();
        expect(model.rawAttributes.resposta.type.key || model.rawAttributes.resposta.type.constructor.name)
          .toMatch(/TEXT/i);
        expect(model.rawAttributes.resposta.allowNull).toBe(false);
      });

      it('has timestamps: false', () => {
        const model = getter();
        expect(model.options.timestamps).toBe(false);
      });

      it('uses the shared sequelize instance', () => {
        const model = getter();
        expect(model.sequelize).toBe(sequelize);
      });

      it(`has tableName "${tableName}"`, () => {
        const model = getter();
        expect(model.options.tableName).toBe(tableName);
      });
    });
  });
});
