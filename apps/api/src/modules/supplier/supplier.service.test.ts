import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRepository } from '../../test/mocks/mock-repository';
import { createSupplierFixture } from '../../test/fixtures/entities';

vi.mock('../../config/data-source', () => ({
  AppDataSource: { getRepository: vi.fn() },
}));

import { AppDataSource } from '../../config/data-source';
import { list, getById, create, update, softDelete } from './supplier.service';

describe('supplier.service', () => {
  let mockRepo: ReturnType<typeof createMockRepository>;

  beforeEach(() => {
    mockRepo = createMockRepository();
    vi.mocked(AppDataSource.getRepository).mockReturnValue(mockRepo as never);
  });

  describe('list', () => {
    it('should return paginated results with correct meta', async () => {
      const suppliers = [createSupplierFixture()];
      mockRepo.findAndCount.mockResolvedValue([suppliers, 1]);

      const result = await list('comm-1', {
        page: 1, limit: 20, sortBy: 'name', sortOrder: 'ASC',
      });

      expect(result.data).toEqual(suppliers);
      expect(result.meta).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 });
      expect(mockRepo.findAndCount).toHaveBeenCalledWith(expect.objectContaining({
        where: { commerceId: 'comm-1' },
        skip: 0,
        take: 20,
      }));
    });

    it('should apply search filter with ILike', async () => {
      mockRepo.findAndCount.mockResolvedValue([[], 0]);

      await list('comm-1', {
        page: 1, limit: 20, search: 'test', sortBy: 'name', sortOrder: 'ASC',
      });

      const call = mockRepo.findAndCount.mock.calls[0][0] as { where: Record<string, unknown> };
      expect(call.where.name).toBeDefined();
    });

    it('should apply isActive filter', async () => {
      mockRepo.findAndCount.mockResolvedValue([[], 0]);

      await list('comm-1', {
        page: 1, limit: 20, isActive: 'true', sortBy: 'name', sortOrder: 'ASC',
      });

      const call = mockRepo.findAndCount.mock.calls[0][0] as { where: Record<string, unknown> };
      expect(call.where.isActive).toBe(true);
    });

    it('should calculate totalPages correctly', async () => {
      mockRepo.findAndCount.mockResolvedValue([[], 45]);

      const result = await list('comm-1', {
        page: 1, limit: 20, sortBy: 'name', sortOrder: 'ASC',
      });

      expect(result.meta.totalPages).toBe(3);
    });

    it('should always scope by commerceId', async () => {
      mockRepo.findAndCount.mockResolvedValue([[], 0]);

      await list('specific-comm', {
        page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'DESC',
      });

      const call = mockRepo.findAndCount.mock.calls[0][0] as { where: Record<string, unknown> };
      expect(call.where.commerceId).toBe('specific-comm');
    });
  });

  describe('getById', () => {
    it('should return supplier when found with matching commerceId', async () => {
      const supplier = createSupplierFixture();
      mockRepo.findOne.mockResolvedValue(supplier);

      const result = await getById('supplier-uuid-1', 'commerce-uuid-1');

      expect(result).toEqual(supplier);
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'supplier-uuid-1', commerceId: 'commerce-uuid-1' },
      });
    });

    it('should throw 404 when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(getById('bad-id', 'comm-1')).rejects.toThrow('Supplier not found');
    });
  });

  describe('create', () => {
    it('should create and save supplier with commerceId', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.save.mockImplementation(async (e: unknown) => ({
        ...(e as object), id: 'new-id',
      }));

      const result = await create('comm-1', { name: 'New Supplier', supplierCode: 'NS-1' });

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ commerceId: 'comm-1', name: 'New Supplier' }),
      );
      expect(result).toHaveProperty('id');
    });

    it('should throw 409 when supplierCode already exists for commerce', async () => {
      mockRepo.findOne.mockResolvedValue(createSupplierFixture());

      await expect(create('comm-1', { name: 'Dup', supplierCode: 'SUP-001' }))
        .rejects.toThrow('Supplier code already exists for this commerce');
    });

    it('should handle null optional fields', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.save.mockImplementation(async (e: unknown) => e);

      await create('comm-1', { name: 'Minimal' });

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          supplierCode: null,
          description: null,
          contactName: null,
          contactEmail: null,
          contactPhone: null,
        }),
      );
    });
  });

  describe('update', () => {
    it('should update and save supplier', async () => {
      const supplier = createSupplierFixture();
      mockRepo.findOne.mockResolvedValue(supplier);
      mockRepo.save.mockImplementation(async (e: unknown) => e);

      const result = await update('supplier-uuid-1', 'commerce-uuid-1', { name: 'Updated' });

      expect(result).toHaveProperty('name', 'Updated');
    });

    it('should throw 409 when supplierCode conflicts', async () => {
      const supplier = createSupplierFixture();
      const other = createSupplierFixture({ id: 'other-id', supplierCode: 'TAKEN' });

      mockRepo.findOne
        .mockResolvedValueOnce(supplier) // getById
        .mockResolvedValueOnce(other);   // uniqueness check

      await expect(update('supplier-uuid-1', 'commerce-uuid-1', { supplierCode: 'TAKEN' }))
        .rejects.toThrow('Supplier code already exists for this commerce');
    });

    it('should allow keeping the same supplierCode', async () => {
      const supplier = createSupplierFixture({ supplierCode: 'SAME' });
      mockRepo.findOne
        .mockResolvedValueOnce(supplier)
        .mockResolvedValueOnce(supplier);
      mockRepo.save.mockImplementation(async (e: unknown) => e);

      const result = await update('supplier-uuid-1', 'commerce-uuid-1', { supplierCode: 'SAME' });

      expect(result).toHaveProperty('supplierCode', 'SAME');
    });
  });

  describe('softDelete', () => {
    it('should set isActive to false and save', async () => {
      const supplier = createSupplierFixture({ isActive: true });
      mockRepo.findOne.mockResolvedValue(supplier);
      mockRepo.save.mockImplementation(async (e: unknown) => e);

      const result = await softDelete('supplier-uuid-1', 'commerce-uuid-1');

      expect(result).toHaveProperty('isActive', false);
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('should throw 404 when supplier not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(softDelete('bad-id', 'comm-1')).rejects.toThrow('Supplier not found');
    });
  });
});
