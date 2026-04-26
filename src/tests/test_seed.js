'use strict';

const faqPrazosData = require('../database/seeders/faq_prazos_seeder');
const faqTrocasData = require('../database/seeders/faq_trocas_seeder');
const faqPagamentosData = require('../database/seeders/faq_pagamentos_seeder');

// Flush all pending promises/microtasks so the async seed() call completes
async function flushPromises() {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

describe('seed.js', () => {
  let mockExit;
  let mockLog;
  let mockError;

  beforeEach(() => {
    mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
    mockLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('calls bulkCreate once per table with the correct data', async () => {
    await jest.isolateModulesAsync(async () => {
      const mockBulkCreatePrazos = jest.fn().mockResolvedValue([]);
      const mockBulkCreateTrocas = jest.fn().mockResolvedValue([]);
      const mockBulkCreatePagamentos = jest.fn().mockResolvedValue([]);
      const mockClose = jest.fn().mockResolvedValue(undefined);

      jest.doMock('../database/index', () => ({ close: mockClose }));
      jest.doMock('../models/faq_prazos', () => ({ bulkCreate: mockBulkCreatePrazos }));
      jest.doMock('../models/faq_trocas', () => ({ bulkCreate: mockBulkCreateTrocas }));
      jest.doMock('../models/faq_pagamentos', () => ({ bulkCreate: mockBulkCreatePagamentos }));

      require('../database/seed');
      await flushPromises();

      expect(mockBulkCreatePrazos).toHaveBeenCalledTimes(1);
      expect(mockBulkCreatePrazos).toHaveBeenCalledWith(faqPrazosData, expect.any(Object));
      expect(mockBulkCreateTrocas).toHaveBeenCalledTimes(1);
      expect(mockBulkCreateTrocas).toHaveBeenCalledWith(faqTrocasData, expect.any(Object));
      expect(mockBulkCreatePagamentos).toHaveBeenCalledTimes(1);
      expect(mockBulkCreatePagamentos).toHaveBeenCalledWith(faqPagamentosData, expect.any(Object));
    });
  });

  it('calls bulkCreate with { ignoreDuplicates: true } for all tables', async () => {
    await jest.isolateModulesAsync(async () => {
      const mockBulkCreatePrazos = jest.fn().mockResolvedValue([]);
      const mockBulkCreateTrocas = jest.fn().mockResolvedValue([]);
      const mockBulkCreatePagamentos = jest.fn().mockResolvedValue([]);
      const mockClose = jest.fn().mockResolvedValue(undefined);

      jest.doMock('../database/index', () => ({ close: mockClose }));
      jest.doMock('../models/faq_prazos', () => ({ bulkCreate: mockBulkCreatePrazos }));
      jest.doMock('../models/faq_trocas', () => ({ bulkCreate: mockBulkCreateTrocas }));
      jest.doMock('../models/faq_pagamentos', () => ({ bulkCreate: mockBulkCreatePagamentos }));

      require('../database/seed');
      await flushPromises();

      expect(mockBulkCreatePrazos).toHaveBeenCalledWith(expect.any(Array), { ignoreDuplicates: true });
      expect(mockBulkCreateTrocas).toHaveBeenCalledWith(expect.any(Array), { ignoreDuplicates: true });
      expect(mockBulkCreatePagamentos).toHaveBeenCalledWith(expect.any(Array), { ignoreDuplicates: true });
    });
  });

  it('executes seeds in order: faqPrazos → faqTrocas → faqPagamentos', async () => {
    await jest.isolateModulesAsync(async () => {
      const callOrder = [];
      const mockClose = jest.fn().mockResolvedValue(undefined);

      jest.doMock('../database/index', () => ({ close: mockClose }));
      jest.doMock('../models/faq_prazos', () => ({
        bulkCreate: jest.fn().mockImplementation(async () => { callOrder.push('faqPrazos'); }),
      }));
      jest.doMock('../models/faq_trocas', () => ({
        bulkCreate: jest.fn().mockImplementation(async () => { callOrder.push('faqTrocas'); }),
      }));
      jest.doMock('../models/faq_pagamentos', () => ({
        bulkCreate: jest.fn().mockImplementation(async () => { callOrder.push('faqPagamentos'); }),
      }));

      require('../database/seed');
      await flushPromises();

      expect(callOrder).toEqual(['faqPrazos', 'faqTrocas', 'faqPagamentos']);
    });
  });

  it('calls console.log after each table is populated', async () => {
    await jest.isolateModulesAsync(async () => {
      const mockClose = jest.fn().mockResolvedValue(undefined);

      jest.doMock('../database/index', () => ({ close: mockClose }));
      jest.doMock('../models/faq_prazos', () => ({ bulkCreate: jest.fn().mockResolvedValue([]) }));
      jest.doMock('../models/faq_trocas', () => ({ bulkCreate: jest.fn().mockResolvedValue([]) }));
      jest.doMock('../models/faq_pagamentos', () => ({ bulkCreate: jest.fn().mockResolvedValue([]) }));

      require('../database/seed');
      await flushPromises();

      // seed.js logs once per table (3 tables)
      const seedLogs = mockLog.mock.calls.filter(([msg]) =>
        typeof msg === 'string' && msg.includes('populado com sucesso')
      );
      expect(seedLogs).toHaveLength(3);
    });
  });

  it('calls console.error and process.exit(1) when bulkCreate rejects', async () => {
    await jest.isolateModulesAsync(async () => {
      const mockClose = jest.fn().mockResolvedValue(undefined);

      jest.doMock('../database/index', () => ({ close: mockClose }));
      jest.doMock('../models/faq_prazos', () => ({
        bulkCreate: jest.fn().mockRejectedValue(new Error('DB failure')),
      }));
      jest.doMock('../models/faq_trocas', () => ({ bulkCreate: jest.fn().mockResolvedValue([]) }));
      jest.doMock('../models/faq_pagamentos', () => ({ bulkCreate: jest.fn().mockResolvedValue([]) }));

      require('../database/seed');
      await flushPromises();

      expect(mockError).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  it('calls sequelize.close() on success', async () => {
    await jest.isolateModulesAsync(async () => {
      const mockClose = jest.fn().mockResolvedValue(undefined);

      jest.doMock('../database/index', () => ({ close: mockClose }));
      jest.doMock('../models/faq_prazos', () => ({ bulkCreate: jest.fn().mockResolvedValue([]) }));
      jest.doMock('../models/faq_trocas', () => ({ bulkCreate: jest.fn().mockResolvedValue([]) }));
      jest.doMock('../models/faq_pagamentos', () => ({ bulkCreate: jest.fn().mockResolvedValue([]) }));

      require('../database/seed');
      await flushPromises();

      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });

  it('calls sequelize.close() even when bulkCreate rejects', async () => {
    await jest.isolateModulesAsync(async () => {
      const mockClose = jest.fn().mockResolvedValue(undefined);

      jest.doMock('../database/index', () => ({ close: mockClose }));
      jest.doMock('../models/faq_prazos', () => ({
        bulkCreate: jest.fn().mockRejectedValue(new Error('fail')),
      }));
      jest.doMock('../models/faq_trocas', () => ({ bulkCreate: jest.fn().mockResolvedValue([]) }));
      jest.doMock('../models/faq_pagamentos', () => ({ bulkCreate: jest.fn().mockResolvedValue([]) }));

      require('../database/seed');
      await flushPromises();

      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });
});
