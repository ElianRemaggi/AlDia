import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRepository } from '../../test/mocks/mock-repository';

vi.mock('../../config/data-source', () => ({
  AppDataSource: { getRepository: vi.fn() },
}));

vi.mock('./import.queue', () => ({
  documentProcessingQueue: { add: vi.fn() },
}));

vi.mock('../../shared/storage/storage', () => ({
  uploadFile: vi.fn(),
  getFileUrl: vi.fn(),
}));

import { AppDataSource } from '../../config/data-source';
import { documentProcessingQueue } from './import.queue';
import { uploadFile, getFileUrl } from '../../shared/storage/storage';
import {
  uploadPriceList,
  listPriceLists,
  getPriceList,
  getImportJob,
} from './import.service';
import { Supplier } from '../supplier/entities/supplier.entity';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function createPriceListFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pl-uuid-1',
    commerceId: 'commerce-uuid-1',
    supplierId: 'supplier-uuid-1',
    sourceType: 'excel',
    sourceFileUrl: '/uploads/file.xlsx',
    sourceFileName: 'test.xlsx',
    uploadedByUserId: 'user-uuid-1',
    status: 'pending',
    versionNumber: 1,
    effectiveDate: null,
    notes: null,
    uploadedAt: new Date('2024-01-01'),
    processedAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function createImportJobFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'job-uuid-1',
    priceListId: 'pl-uuid-1',
    jobType: 'parse_document',
    status: 'queued',
    startedAt: null,
    finishedAt: null,
    errorMessage: null,
    metaJson: null,
    createdAt: new Date('2024-01-01'),
    priceList: createPriceListFixture(),
    ...overrides,
  };
}

const mockFile: Express.Multer.File = {
  originalname: 'test.xlsx',
  buffer: Buffer.from('test'),
  mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  size: 100,
} as Express.Multer.File;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('import.service', () => {
  let mockRepo: ReturnType<typeof createMockRepository> & {
    createQueryBuilder?: ReturnType<typeof vi.fn>;
  };
  let supplierRepo: ReturnType<typeof createMockRepository>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo = createMockRepository();

    // Default chainable QueryBuilder for versionNumber computation
    const mockQb = {
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      getRawOne: vi.fn().mockResolvedValue({ max: null }),
    };
    mockRepo.createQueryBuilder = vi.fn().mockReturnValue(mockQb);

    supplierRepo = createMockRepository();
    supplierRepo.findOne.mockResolvedValue({ id: 'supplier-uuid-1', commerceId: 'commerce-uuid-1', isActive: true });
    vi.mocked(AppDataSource.getRepository).mockImplementation(
      (entity) => (entity === Supplier ? supplierRepo : mockRepo) as never,
    );
  });

  // ─── uploadPriceList ────────────────────────────────────────────────────────

  describe('uploadPriceList', () => {
    it('should create price_list and import_job then enqueue a BullMQ job', async () => {
      const priceList = createPriceListFixture();

      // save returns entity for both priceList saves and importJob save
      mockRepo.save
        .mockResolvedValueOnce(priceList) // first save (pending, no URL)
        .mockResolvedValueOnce({ ...priceList, sourceFileUrl: '/uploads/file.xlsx' }) // second save (with URL)
        .mockResolvedValueOnce({ id: 'job-uuid-1', priceListId: priceList.id }); // importJob save

      vi.mocked(uploadFile).mockResolvedValue('/uploads/file.xlsx');
      vi.mocked(getFileUrl).mockResolvedValue('/uploads/file.xlsx');
      vi.mocked(documentProcessingQueue.add).mockResolvedValue({ id: 'job-uuid-1' } as never);

      const result = await uploadPriceList(
        'supplier-uuid-1',
        'commerce-uuid-1',
        'user-uuid-1',
        mockFile,
        {},
      );

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          supplierId: 'supplier-uuid-1',
          commerceId: 'commerce-uuid-1',
          uploadedByUserId: 'user-uuid-1',
          status: 'pending',
          sourceType: 'excel',
        }),
      );

      expect(uploadFile).toHaveBeenCalledWith(
        'commerce-uuid-1',
        'supplier-uuid-1',
        expect.any(String), // priceList.id
        'test.xlsx',
        mockFile.buffer,
        mockFile.mimetype,
      );

      expect(documentProcessingQueue.add).toHaveBeenCalledWith(
        'parse-document',
        expect.objectContaining({
          supplierId: 'supplier-uuid-1',
          commerceId: 'commerce-uuid-1',
          fileName: 'test.xlsx',
          sourceType: 'excel',
        }),
        expect.any(Object),
      );

      expect(result).toHaveProperty('priceList');
      expect(result).toHaveProperty('importJob');
    });

    it('should throw 404 when the supplier belongs to another commerce', async () => {
      supplierRepo.findOne.mockResolvedValue(null);

      await expect(
        uploadPriceList('other-supplier', 'commerce-uuid-1', 'user-uuid-1', mockFile, {}),
      ).rejects.toThrow('Supplier not found');
      expect(supplierRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'other-supplier', commerceId: 'commerce-uuid-1' },
      });
      expect(documentProcessingQueue.add).not.toHaveBeenCalled();
    });

    it('should throw 422 when the supplier is inactive', async () => {
      supplierRepo.findOne.mockResolvedValue({ id: 'supplier-uuid-1', isActive: false });

      await expect(
        uploadPriceList('supplier-uuid-1', 'commerce-uuid-1', 'user-uuid-1', mockFile, {}),
      ).rejects.toThrow('Supplier is inactive');
    });

    it('should throw 422 for unsupported file type', async () => {
      const docxFile = { ...mockFile, originalname: 'invoice.docx' } as Express.Multer.File;

      await expect(
        uploadPriceList('supplier-uuid-1', 'commerce-uuid-1', 'user-uuid-1', docxFile, {}),
      ).rejects.toThrow('Unsupported file type');
    });

    it('should resolve pdf source type and enqueue it as pdf', async () => {
      const pdfFile = {
        ...mockFile,
        originalname: 'lista.pdf',
        mimetype: 'application/pdf',
      } as Express.Multer.File;

      const priceList = createPriceListFixture({ sourceType: 'pdf' });
      mockRepo.save
        .mockResolvedValueOnce(priceList)
        .mockResolvedValueOnce(priceList)
        .mockResolvedValueOnce({ id: 'job-uuid-1' });

      vi.mocked(uploadFile).mockResolvedValue('/uploads/lista.pdf');
      vi.mocked(getFileUrl).mockResolvedValue('/uploads/lista.pdf');
      vi.mocked(documentProcessingQueue.add).mockResolvedValue({ id: 'job-uuid-1' } as never);

      await uploadPriceList('supplier-uuid-1', 'commerce-uuid-1', 'user-uuid-1', pdfFile, {
        priceFormat: 'decimal_comma',
      });

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ sourceType: 'pdf' }),
      );
      expect(documentProcessingQueue.add).toHaveBeenCalledWith(
        'parse-document',
        expect.objectContaining({
          sourceType: 'pdf',
          fileName: 'lista.pdf',
          parserConfig: expect.objectContaining({ price_format: 'decimal_comma' }),
        }),
        expect.any(Object),
      );
    });

    it('should resolve csv source type for .csv files', async () => {
      const csvFile = {
        ...mockFile,
        originalname: 'prices.csv',
        mimetype: 'text/csv',
      } as Express.Multer.File;

      const priceList = createPriceListFixture({ sourceType: 'csv' });
      mockRepo.save
        .mockResolvedValueOnce(priceList)
        .mockResolvedValueOnce(priceList)
        .mockResolvedValueOnce({ id: 'job-uuid-1' });

      vi.mocked(uploadFile).mockResolvedValue('/uploads/prices.csv');
      vi.mocked(getFileUrl).mockResolvedValue('/uploads/prices.csv');
      vi.mocked(documentProcessingQueue.add).mockResolvedValue({ id: 'job-uuid-1' } as never);

      const result = await uploadPriceList(
        'supplier-uuid-1',
        'commerce-uuid-1',
        'user-uuid-1',
        csvFile,
        {},
      );

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ sourceType: 'csv' }),
      );
      expect(result).toHaveProperty('priceList');
    });

    it('should use version 1 when no previous price list exists', async () => {
      const priceList = createPriceListFixture();
      mockRepo.save
        .mockResolvedValueOnce(priceList)
        .mockResolvedValueOnce(priceList)
        .mockResolvedValueOnce({ id: 'job-uuid-1' });

      vi.mocked(uploadFile).mockResolvedValue('/uploads/file.xlsx');
      vi.mocked(getFileUrl).mockResolvedValue('/uploads/file.xlsx');
      vi.mocked(documentProcessingQueue.add).mockResolvedValue({ id: 'job-uuid-1' } as never);

      await uploadPriceList(
        'supplier-uuid-1',
        'commerce-uuid-1',
        'user-uuid-1',
        mockFile,
        {},
      );

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ versionNumber: 1 }),
      );
    });

    it('should increment versionNumber when previous price lists exist', async () => {
      // Override the QueryBuilder mock to return max = 3
      const mockQb = {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getRawOne: vi.fn().mockResolvedValue({ max: 3 }),
      };
      mockRepo.createQueryBuilder = vi.fn().mockReturnValue(mockQb);

      const priceList = createPriceListFixture({ versionNumber: 4 });
      mockRepo.save
        .mockResolvedValueOnce(priceList)
        .mockResolvedValueOnce(priceList)
        .mockResolvedValueOnce({ id: 'job-uuid-1' });

      vi.mocked(uploadFile).mockResolvedValue('/uploads/file.xlsx');
      vi.mocked(getFileUrl).mockResolvedValue('/uploads/file.xlsx');
      vi.mocked(documentProcessingQueue.add).mockResolvedValue({ id: 'job-uuid-1' } as never);

      await uploadPriceList(
        'supplier-uuid-1',
        'commerce-uuid-1',
        'user-uuid-1',
        mockFile,
        {},
      );

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ versionNumber: 4 }),
      );
    });
  });

  // ─── listPriceLists ─────────────────────────────────────────────────────────

  describe('listPriceLists', () => {
    it('should return paginated results with correct meta', async () => {
      const priceLists = [createPriceListFixture()];
      mockRepo.findAndCount.mockResolvedValue([priceLists, 1]);

      const result = await listPriceLists('supplier-uuid-1', 'commerce-uuid-1', {
        page: 1,
        limit: 20,
        sortOrder: 'DESC',
      });

      expect(result.data).toEqual(priceLists);
      expect(result.meta).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 });
      expect(mockRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { supplierId: 'supplier-uuid-1', commerceId: 'commerce-uuid-1' },
          skip: 0,
          take: 20,
        }),
      );
    });

    it('should apply status filter when provided', async () => {
      mockRepo.findAndCount.mockResolvedValue([[], 0]);

      await listPriceLists('supplier-uuid-1', 'commerce-uuid-1', {
        page: 1,
        limit: 20,
        status: 'processed',
        sortOrder: 'DESC',
      });

      const call = mockRepo.findAndCount.mock.calls[0][0] as { where: Record<string, unknown> };
      expect(call.where.status).toBe('processed');
    });

    it('should calculate totalPages correctly', async () => {
      mockRepo.findAndCount.mockResolvedValue([[], 45]);

      const result = await listPriceLists('supplier-uuid-1', 'commerce-uuid-1', {
        page: 1,
        limit: 20,
        sortOrder: 'DESC',
      });

      expect(result.meta.totalPages).toBe(3);
    });

    it('should always scope by supplierId and commerceId', async () => {
      mockRepo.findAndCount.mockResolvedValue([[], 0]);

      await listPriceLists('specific-supplier', 'specific-commerce', {
        page: 1,
        limit: 10,
        sortOrder: 'ASC',
      });

      const call = mockRepo.findAndCount.mock.calls[0][0] as { where: Record<string, unknown> };
      expect(call.where.supplierId).toBe('specific-supplier');
      expect(call.where.commerceId).toBe('specific-commerce');
    });
  });

  // ─── getPriceList ───────────────────────────────────────────────────────────

  describe('getPriceList', () => {
    it('should return price list when found', async () => {
      const priceList = createPriceListFixture();
      mockRepo.findOne.mockResolvedValue(priceList);

      const result = await getPriceList('pl-uuid-1', 'supplier-uuid-1', 'commerce-uuid-1');

      expect(result).toEqual(priceList);
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'pl-uuid-1', supplierId: 'supplier-uuid-1', commerceId: 'commerce-uuid-1' },
      });
    });

    it('should throw 404 when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(
        getPriceList('bad-id', 'supplier-uuid-1', 'commerce-uuid-1'),
      ).rejects.toThrow('Price list not found');
    });
  });

  // ─── getImportJob ───────────────────────────────────────────────────────────

  describe('getImportJob', () => {
    it('should return import job when found and commerce matches', async () => {
      const job = createImportJobFixture();
      mockRepo.findOne.mockResolvedValue(job);

      const result = await getImportJob('job-uuid-1', 'commerce-uuid-1');

      expect(result).toEqual(job);
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'job-uuid-1' },
        relations: ['priceList'],
      });
    });

    it('should throw 404 when job not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(getImportJob('bad-id', 'commerce-uuid-1')).rejects.toThrow(
        'Import job not found',
      );
    });

    it('should throw 404 when commerce does not match', async () => {
      const job = createImportJobFixture({
        priceList: createPriceListFixture({ commerceId: 'other-commerce' }),
      });
      mockRepo.findOne.mockResolvedValue(job);

      await expect(getImportJob('job-uuid-1', 'commerce-uuid-1')).rejects.toThrow(
        'Import job not found',
      );
    });
  });
});
