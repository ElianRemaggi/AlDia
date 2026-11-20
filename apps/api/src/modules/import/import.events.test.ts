import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRepository } from '../../test/mocks/mock-repository';

vi.mock('../../config/data-source', () => ({
  AppDataSource: { getRepository: vi.fn() },
}));
// The queue module opens Redis connections at import time.
vi.mock('./import.queue', () => ({
  documentProcessingQueue: {},
  documentProcessingEvents: { on: vi.fn(), run: vi.fn() },
}));
vi.mock('./import.processor', () => ({
  saveParseResult: vi.fn(),
  matchOrCreateProduct: vi.fn(),
  createPriceListItems: vi.fn(),
  detectPriceChanges: vi.fn(),
  generateNotifications: vi.fn(),
  updatePriceListStatus: vi.fn(),
  updateImportJobStatus: vi.fn(),
}));

import { AppDataSource } from '../../config/data-source';
import * as processor from './import.processor';
import { onJobActive, onJobCompleted, onJobFailed, parseReturnValue } from './import.events';
import { PriceListStatus } from './entities/price-list.entity';
import { ImportJob, ImportJobStatus } from './entities/import-job.entity';
import type { JobResult, ParseResult } from './import.types';

const PL = 'pl-1';

function parseResult(overrides: Partial<ParseResult> = {}): ParseResult {
  return {
    parser: 'excel',
    version: '1.0.0',
    source_file: 'lista.xlsx',
    total_rows: 2,
    rows: [
      { position_index: 0, raw_name: 'A', supplier_product_code: 'A1', unit: null, unit_cost: 10, currency: 'ARS', brand: null, category: null },
      { position_index: 1, raw_name: 'B', supplier_product_code: 'B1', unit: null, unit_cost: 20, currency: 'ARS', brand: null, category: null },
    ],
    errors: [],
    ...overrides,
  };
}

describe('import.events', () => {
  let priceListRepo: ReturnType<typeof createMockRepository> & { update: ReturnType<typeof vi.fn> };
  let importJobRepo: ReturnType<typeof createMockRepository> & { update: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    priceListRepo = { ...createMockRepository(), update: vi.fn(), findOneOrFail: vi.fn() } as never;
    importJobRepo = { ...createMockRepository(), update: vi.fn() } as never;
    (priceListRepo as unknown as { findOneOrFail: ReturnType<typeof vi.fn> }).findOneOrFail.mockResolvedValue({
      id: PL,
      supplierId: 'sup-1',
      commerceId: 'com-1',
    });
    vi.mocked(AppDataSource.getRepository).mockImplementation(
      (entity) => (entity === ImportJob ? importJobRepo : priceListRepo) as never,
    );
    vi.mocked(processor.matchOrCreateProduct).mockImplementation(
      async (_s, _c, row) => ({ id: `prod-${row.position_index}` }) as never,
    );
  });

  describe('onJobActive', () => {
    it('only moves still-waiting records to running/processing', async () => {
      await onJobActive(PL);

      expect(importJobRepo.update).toHaveBeenCalledWith(
        { priceListId: PL, status: ImportJobStatus.QUEUED },
        expect.objectContaining({ status: ImportJobStatus.RUNNING }),
      );
      expect(priceListRepo.update).toHaveBeenCalledWith(
        { id: PL, status: PriceListStatus.PENDING },
        { status: PriceListStatus.PROCESSING },
      );
    });
  });

  describe('onJobCompleted', () => {
    it('runs the pipeline and marks the import processed with a summary', async () => {
      const result: JobResult = { priceListId: PL, status: 'success', parseResult: parseResult(), errorMessage: null };

      await onJobCompleted(result);

      expect(processor.saveParseResult).toHaveBeenCalledWith(PL, result.parseResult);
      expect(processor.matchOrCreateProduct).toHaveBeenCalledTimes(2);
      expect(processor.createPriceListItems).toHaveBeenCalledWith(PL, result.parseResult!.rows, expect.any(Map));
      expect(processor.detectPriceChanges).toHaveBeenCalledWith(PL, 'sup-1', 'com-1');
      expect(processor.generateNotifications).toHaveBeenCalledWith('com-1', PL);
      expect(processor.updatePriceListStatus).toHaveBeenCalledWith(PL, PriceListStatus.PROCESSED, expect.any(Date));
      expect(processor.updateImportJobStatus).toHaveBeenCalledWith(
        PL,
        ImportJobStatus.COMPLETED,
        undefined,
        { parser: 'excel', total_rows: 2, error_count: 0 },
      );
    });

    it('marks partially processed when the parser reported row errors', async () => {
      await onJobCompleted({
        priceListId: PL,
        status: 'partial',
        parseResult: parseResult({ errors: [{ row: 3, reason: 'price missing' }] }),
        errorMessage: null,
      });

      expect(processor.updatePriceListStatus).toHaveBeenCalledWith(
        PL,
        PriceListStatus.PARTIALLY_PROCESSED,
        expect.any(Date),
      );
    });

    it('marks failed when Python reported a failed parse', async () => {
      await onJobCompleted({ priceListId: PL, status: 'failed', parseResult: null, errorMessage: 'bad file' });

      expect(processor.saveParseResult).not.toHaveBeenCalled();
      expect(processor.updatePriceListStatus).toHaveBeenCalledWith(PL, PriceListStatus.FAILED);
      expect(processor.updateImportJobStatus).toHaveBeenCalledWith(PL, ImportJobStatus.FAILED, 'bad file');
    });

    it('marks failed if a pipeline step throws', async () => {
      vi.mocked(processor.detectPriceChanges).mockRejectedValueOnce(new Error('db down'));

      await onJobCompleted({ priceListId: PL, status: 'success', parseResult: parseResult(), errorMessage: null });

      expect(processor.updateImportJobStatus).toHaveBeenCalledWith(PL, ImportJobStatus.FAILED, 'db down');
    });
  });

  describe('onJobFailed', () => {
    it('marks both records failed with the reason', async () => {
      await onJobFailed(PL, 'worker crashed');

      expect(processor.updatePriceListStatus).toHaveBeenCalledWith(PL, PriceListStatus.FAILED);
      expect(processor.updateImportJobStatus).toHaveBeenCalledWith(PL, ImportJobStatus.FAILED, 'worker crashed');
    });
  });

  describe('parseReturnValue', () => {
    it('parses the JSON string BullMQ emits', () => {
      expect(parseReturnValue('{"priceListId":"pl-1","status":"success"}')).toMatchObject({ priceListId: 'pl-1' });
    });

    it('accepts an already-parsed object', () => {
      expect(parseReturnValue({ priceListId: 'pl-1' })).toEqual({ priceListId: 'pl-1' });
    });

    it('returns null for empty or invalid values', () => {
      expect(parseReturnValue(undefined)).toBeNull();
      expect(parseReturnValue('not json')).toBeNull();
    });
  });
});
