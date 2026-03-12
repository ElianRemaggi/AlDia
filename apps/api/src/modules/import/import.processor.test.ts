import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRepository } from '../../test/mocks/mock-repository';

vi.mock('../../config/data-source', () => ({
  AppDataSource: { getRepository: vi.fn() },
}));

import { AppDataSource } from '../../config/data-source';
import {
  matchOrCreateProduct,
  detectPriceChanges,
  saveParseResult,
  updatePriceListStatus,
  updateImportJobStatus,
} from './import.processor';
import { PriceListStatus } from './entities/price-list.entity';
import { ImportJobStatus } from './entities/import-job.entity';
import { ParsedRow, ParseResult } from './import.types';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function createSupplierProductFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sp-uuid-1',
    commerceId: 'commerce-uuid-1',
    supplierId: 'supplier-uuid-1',
    supplierProductCode: 'CODE-001',
    name: 'Test Product',
    description: null,
    unit: 'kg',
    brand: 'BrandX',
    category: 'Food',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function createPriceListFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pl-uuid-1',
    commerceId: 'commerce-uuid-1',
    supplierId: 'supplier-uuid-1',
    status: 'processed',
    versionNumber: 1,
    sourceType: 'excel',
    sourceFileUrl: null,
    sourceFileName: null,
    uploadedByUserId: 'user-uuid-1',
    effectiveDate: null,
    notes: null,
    uploadedAt: new Date('2024-01-01'),
    processedAt: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function createPriceListItemFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pli-uuid-1',
    priceListId: 'pl-uuid-1',
    supplierProductId: 'sp-uuid-1',
    rawName: 'Test Product',
    unitCost: '100.00',
    currency: 'ARS',
    positionIndex: 0,
    createdAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function createParsedRow(overrides: Partial<ParsedRow> = {}): ParsedRow {
  return {
    position_index: 0,
    raw_name: 'Test Product',
    supplier_product_code: 'CODE-001',
    unit: 'kg',
    unit_cost: 100,
    currency: 'ARS',
    brand: 'BrandX',
    category: 'Food',
    ...overrides,
  };
}

// ─── Test setup ───────────────────────────────────────────────────────────────

describe('import.processor', () => {
  let mockRepo: ReturnType<typeof createMockRepository> & {
    createQueryBuilder?: ReturnType<typeof vi.fn>;
  };

  // Each test gets its own fresh mock repo; entity doesn't matter since
  // getRepository is called per entity class — we keep it simple and return
  // the same mock for all entities.
  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo = createMockRepository();
    vi.mocked(AppDataSource.getRepository).mockReturnValue(mockRepo as never);
  });

  // ─── matchOrCreateProduct ───────────────────────────────────────────────────

  describe('matchOrCreateProduct', () => {
    it('should return existing product matched by supplier_product_code', async () => {
      const product = createSupplierProductFixture();
      mockRepo.findOne.mockResolvedValue(product);

      const row = createParsedRow({ supplier_product_code: 'CODE-001' });
      const result = await matchOrCreateProduct('supplier-uuid-1', 'commerce-uuid-1', row);

      expect(result).toEqual(product);
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: {
          supplierId: 'supplier-uuid-1',
          commerceId: 'commerce-uuid-1',
          supplierProductCode: 'CODE-001',
        },
      });
      // Should not fall through to name matching or creation
      expect(mockRepo.find).not.toHaveBeenCalled();
    });

    it('should fall back to name matching when code not found', async () => {
      // findOne (by code) returns null, find (all active) returns a match
      mockRepo.findOne.mockResolvedValue(null);
      const product = createSupplierProductFixture({ name: 'Test Product' });
      mockRepo.find.mockResolvedValue([product]);

      const row = createParsedRow({
        supplier_product_code: 'UNKNOWN',
        raw_name: 'Test Product',
      });
      const result = await matchOrCreateProduct('supplier-uuid-1', 'commerce-uuid-1', row);

      expect(result).toEqual(product);
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { supplierId: 'supplier-uuid-1', commerceId: 'commerce-uuid-1', isActive: true },
      });
      // Product found by name — should not create
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('should match by normalized name (whitespace / case insensitive)', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const product = createSupplierProductFixture({ name: '  TEST  PRODUCT  ' });
      mockRepo.find.mockResolvedValue([product]);

      const row = createParsedRow({
        supplier_product_code: null,
        raw_name: 'test product', // normalized form matches
      });
      const result = await matchOrCreateProduct('supplier-uuid-1', 'commerce-uuid-1', row);

      expect(result).toEqual(product);
    });

    it('should create a new product when neither code nor name matches', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.find.mockResolvedValue([]);
      const newProduct = createSupplierProductFixture({ id: 'sp-new', name: 'Brand New Item' });
      mockRepo.save.mockResolvedValue(newProduct);

      const row = createParsedRow({
        supplier_product_code: null,
        raw_name: 'Brand New Item',
        unit: 'un',
        brand: 'BrandY',
        category: 'Electronics',
      });
      const result = await matchOrCreateProduct('supplier-uuid-1', 'commerce-uuid-1', row);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          commerceId: 'commerce-uuid-1',
          supplierId: 'supplier-uuid-1',
          name: 'Brand New Item',
          supplierProductCode: null,
          unit: 'un',
          brand: 'BrandY',
          category: 'Electronics',
          isActive: true,
        }),
      );
      expect(mockRepo.save).toHaveBeenCalled();
      expect(result).toEqual(newProduct);
    });

    it('should skip code lookup when supplier_product_code is null', async () => {
      mockRepo.find.mockResolvedValue([]);
      const newProduct = createSupplierProductFixture({ id: 'sp-new', name: 'No Code Item' });
      mockRepo.save.mockResolvedValue(newProduct);

      const row = createParsedRow({ supplier_product_code: null, raw_name: 'No Code Item' });
      await matchOrCreateProduct('supplier-uuid-1', 'commerce-uuid-1', row);

      expect(mockRepo.findOne).not.toHaveBeenCalled();
    });
  });

  // ─── detectPriceChanges ─────────────────────────────────────────────────────

  describe('detectPriceChanges', () => {
    function makePriceListQb(returnValue: unknown) {
      return {
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(returnValue),
      };
    }

    it('should return early when no previous processed price list exists', async () => {
      const qb = makePriceListQb(null);
      mockRepo.createQueryBuilder = vi.fn().mockReturnValue(qb);

      await detectPriceChanges('pl-new', 'supplier-uuid-1', 'commerce-uuid-1');

      // No item queries should be issued
      expect(mockRepo.find).not.toHaveBeenCalled();
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('should create price_change_events when prices differ', async () => {
      const previousPriceList = createPriceListFixture({ id: 'pl-old', versionNumber: 1 });
      const qb = makePriceListQb(previousPriceList);
      mockRepo.createQueryBuilder = vi.fn().mockReturnValue(qb);

      const newItem = createPriceListItemFixture({
        priceListId: 'pl-new',
        supplierProductId: 'sp-uuid-1',
        unitCost: '150.00',
      });
      const oldItem = createPriceListItemFixture({
        priceListId: 'pl-old',
        supplierProductId: 'sp-uuid-1',
        unitCost: '100.00',
      });

      // find is called twice: once for new items, once for old items
      mockRepo.find
        .mockResolvedValueOnce([newItem]) // new price list items
        .mockResolvedValueOnce([oldItem]); // old price list items

      await detectPriceChanges('pl-new', 'supplier-uuid-1', 'commerce-uuid-1');

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          supplierProductId: 'sp-uuid-1',
          oldPrice: '100.00',
          newPrice: '150.00',
          detectedInPriceListId: 'pl-new',
          commerceId: 'commerce-uuid-1',
          supplierId: 'supplier-uuid-1',
        }),
      );
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('should not create events when prices are equal', async () => {
      const previousPriceList = createPriceListFixture({ id: 'pl-old' });
      const qb = makePriceListQb(previousPriceList);
      mockRepo.createQueryBuilder = vi.fn().mockReturnValue(qb);

      const item = createPriceListItemFixture({ unitCost: '100.00' });
      mockRepo.find
        .mockResolvedValueOnce([item]) // new items
        .mockResolvedValueOnce([item]); // old items (same price)

      await detectPriceChanges('pl-new', 'supplier-uuid-1', 'commerce-uuid-1');

      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('should skip items without a supplierProductId', async () => {
      const previousPriceList = createPriceListFixture({ id: 'pl-old' });
      const qb = makePriceListQb(previousPriceList);
      mockRepo.createQueryBuilder = vi.fn().mockReturnValue(qb);

      const unlinkedItem = createPriceListItemFixture({
        supplierProductId: null,
        unitCost: '999.00',
      });
      mockRepo.find
        .mockResolvedValueOnce([unlinkedItem])
        .mockResolvedValueOnce([unlinkedItem]);

      await detectPriceChanges('pl-new', 'supplier-uuid-1', 'commerce-uuid-1');

      expect(mockRepo.save).not.toHaveBeenCalled();
    });
  });

  // ─── saveParseResult ────────────────────────────────────────────────────────

  describe('saveParseResult', () => {
    it('should save a parse result with parser name and version', async () => {
      const parseResult: ParseResult = {
        parser: 'excel-parser',
        version: '1.0.0',
        source_file: 'test.xlsx',
        total_rows: 5,
        rows: [],
        errors: [],
      };

      mockRepo.save.mockResolvedValue({ id: 'ipr-uuid-1' });

      await saveParseResult('pl-uuid-1', parseResult);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          priceListId: 'pl-uuid-1',
          parserName: 'excel-parser',
          parserVersion: '1.0.0',
        }),
      );
      expect(mockRepo.save).toHaveBeenCalled();
    });
  });

  // ─── updatePriceListStatus ──────────────────────────────────────────────────

  describe('updatePriceListStatus', () => {
    it('should update price list status', async () => {
      const priceList = createPriceListFixture({ status: 'pending' });
      mockRepo.findOne.mockResolvedValue(priceList);
      mockRepo.save.mockImplementation(async (e: unknown) => e);

      await updatePriceListStatus('pl-uuid-1', PriceListStatus.PROCESSED, new Date());

      expect(priceList.status).toBe(PriceListStatus.PROCESSED);
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('should silently return when price list not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(
        updatePriceListStatus('bad-id', PriceListStatus.FAILED),
      ).resolves.toBeUndefined();

      expect(mockRepo.save).not.toHaveBeenCalled();
    });
  });

  // ─── updateImportJobStatus ──────────────────────────────────────────────────

  describe('updateImportJobStatus', () => {
    it('should set startedAt when status is RUNNING', async () => {
      const job = {
        id: 'job-uuid-1',
        priceListId: 'pl-uuid-1',
        status: 'queued',
        startedAt: null,
        finishedAt: null,
        errorMessage: null,
      };
      mockRepo.findOne.mockResolvedValue(job);
      mockRepo.save.mockImplementation(async (e: unknown) => e);

      await updateImportJobStatus('pl-uuid-1', ImportJobStatus.RUNNING);

      expect(job.status).toBe(ImportJobStatus.RUNNING);
      expect(job.startedAt).toBeInstanceOf(Date);
    });

    it('should set finishedAt when status is COMPLETED', async () => {
      const job = {
        id: 'job-uuid-1',
        priceListId: 'pl-uuid-1',
        status: 'running',
        startedAt: new Date(),
        finishedAt: null,
        errorMessage: null,
      };
      mockRepo.findOne.mockResolvedValue(job);
      mockRepo.save.mockImplementation(async (e: unknown) => e);

      await updateImportJobStatus('pl-uuid-1', ImportJobStatus.COMPLETED);

      expect(job.status).toBe(ImportJobStatus.COMPLETED);
      expect(job.finishedAt).toBeInstanceOf(Date);
    });

    it('should set errorMessage when provided', async () => {
      const job = {
        id: 'job-uuid-1',
        priceListId: 'pl-uuid-1',
        status: 'running',
        startedAt: new Date(),
        finishedAt: null,
        errorMessage: null,
      };
      mockRepo.findOne.mockResolvedValue(job);
      mockRepo.save.mockImplementation(async (e: unknown) => e);

      await updateImportJobStatus('pl-uuid-1', ImportJobStatus.FAILED, 'Parser crashed');

      expect(job.status).toBe(ImportJobStatus.FAILED);
      expect(job.errorMessage).toBe('Parser crashed');
      expect(job.finishedAt).toBeInstanceOf(Date);
    });

    it('should silently return when job not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(
        updateImportJobStatus('bad-id', ImportJobStatus.FAILED),
      ).resolves.toBeUndefined();

      expect(mockRepo.save).not.toHaveBeenCalled();
    });
  });
});
