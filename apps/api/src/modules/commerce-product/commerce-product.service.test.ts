import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRepository } from '../../test/mocks/mock-repository';
import {
  createCommerceProductFixture,
  createCommerceProductSupplierLinkFixture,
} from '../../test/fixtures/entities';

vi.mock('../../config/data-source', () => ({
  AppDataSource: { getRepository: vi.fn() },
}));

import { AppDataSource } from '../../config/data-source';
import {
  listCommerceProducts,
  createCommerceProduct,
  getCommerceProduct,
  updateCommerceProduct,
  deleteCommerceProduct,
  addSupplierLink,
  removeSupplierLink,
} from './commerce-product.service';

describe('commerce-product.service', () => {
  let mockRepo: ReturnType<typeof createMockRepository>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo = createMockRepository();
    vi.mocked(AppDataSource.getRepository).mockReturnValue(mockRepo as never);
  });

  describe('listCommerceProducts', () => {
    it('should return paginated products', async () => {
      const products = [createCommerceProductFixture()];
      mockRepo.findAndCount.mockResolvedValue([products, 1]);

      const result = await listCommerceProducts('commerce-uuid-1', 1, 20);

      expect(result.data).toEqual(products);
      expect(result.meta).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 });
      expect(mockRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { commerceId: 'commerce-uuid-1' } }),
      );
    });
  });

  describe('createCommerceProduct', () => {
    it('should create a commerce product', async () => {
      mockRepo.create.mockImplementation((data: unknown) => ({ ...data as object }));
      mockRepo.save.mockImplementation(async (e: unknown) => ({ ...e as object, id: 'new-id' }));

      const result = await createCommerceProduct('commerce-uuid-1', {
        name: 'Test Product',
        category: 'Food',
      });

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          commerceId: 'commerce-uuid-1',
          name: 'Test Product',
          category: 'Food',
          isActive: true,
        }),
      );
      expect(result).toHaveProperty('id');
    });

    it('should set optional fields to null when not provided', async () => {
      mockRepo.create.mockImplementation((data: unknown) => ({ ...data as object }));
      mockRepo.save.mockImplementation(async (e: unknown) => e);

      await createCommerceProduct('commerce-uuid-1', { name: 'Minimal' });

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          internalCode: null,
          description: null,
          category: null,
        }),
      );
    });
  });

  describe('getCommerceProduct', () => {
    it('should return product with supplier links', async () => {
      const product = createCommerceProductFixture();
      const links = [createCommerceProductSupplierLinkFixture()];
      mockRepo.findOne.mockResolvedValue(product);
      mockRepo.find.mockResolvedValue(links);

      const result = await getCommerceProduct('cp-uuid-1', 'commerce-uuid-1');

      expect(result).toHaveProperty('links');
      expect(result.links).toEqual(links);
    });

    it('should throw 404 when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(getCommerceProduct('bad-id', 'commerce-uuid-1')).rejects.toThrow(
        'Commerce product not found',
      );
    });
  });

  describe('updateCommerceProduct', () => {
    it('should update product fields', async () => {
      const product = createCommerceProductFixture();
      mockRepo.findOne.mockResolvedValue(product);
      mockRepo.save.mockImplementation(async (e: unknown) => e);

      const result = await updateCommerceProduct('cp-uuid-1', 'commerce-uuid-1', {
        name: 'Updated Name',
      });

      expect(result).toHaveProperty('name', 'Updated Name');
    });

    it('should throw 404 when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(
        updateCommerceProduct('bad-id', 'commerce-uuid-1', { name: 'X' }),
      ).rejects.toThrow('Commerce product not found');
    });
  });

  describe('deleteCommerceProduct', () => {
    it('should soft delete by setting isActive to false', async () => {
      const product = createCommerceProductFixture({ isActive: true });
      mockRepo.findOne.mockResolvedValue(product);
      mockRepo.save.mockImplementation(async (e: unknown) => e);

      await deleteCommerceProduct('cp-uuid-1', 'commerce-uuid-1');

      expect(product.isActive).toBe(false);
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('should throw 404 when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(deleteCommerceProduct('bad-id', 'commerce-uuid-1')).rejects.toThrow(
        'Commerce product not found',
      );
    });
  });

  describe('addSupplierLink', () => {
    it('should create a new supplier link', async () => {
      const product = createCommerceProductFixture();
      mockRepo.findOne
        .mockResolvedValueOnce(product) // commerce product check
        .mockResolvedValueOnce(null);   // existing link check
      mockRepo.create.mockImplementation((data: unknown) => ({ ...data as object }));
      mockRepo.save.mockImplementation(async (e: unknown) => ({ ...e as object, id: 'link-id' }));

      const result = await addSupplierLink('cp-uuid-1', 'commerce-uuid-1', {
        supplierProductId: 'sp-uuid-1',
        isFavorite: true,
      });

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          commerceProductId: 'cp-uuid-1',
          supplierProductId: 'sp-uuid-1',
          isFavorite: true,
        }),
      );
      expect(result).toHaveProperty('id');
    });

    it('should update existing link if supplier product already linked', async () => {
      const product = createCommerceProductFixture();
      const existingLink = createCommerceProductSupplierLinkFixture({ isFavorite: false });
      mockRepo.findOne
        .mockResolvedValueOnce(product)
        .mockResolvedValueOnce(existingLink);
      mockRepo.save.mockImplementation(async (e: unknown) => e);

      await addSupplierLink('cp-uuid-1', 'commerce-uuid-1', {
        supplierProductId: 'sp-uuid-1',
        isFavorite: true,
      });

      expect(existingLink.isFavorite).toBe(true);
      expect(existingLink.commerceProductId).toBe('cp-uuid-1');
    });

    it('should throw 404 when commerce product not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(
        addSupplierLink('bad-id', 'commerce-uuid-1', { supplierProductId: 'sp-uuid-1' }),
      ).rejects.toThrow('Commerce product not found');
    });
  });

  describe('removeSupplierLink', () => {
    it('should delete the link', async () => {
      const link = createCommerceProductSupplierLinkFixture();
      mockRepo.findOne.mockResolvedValue(link);
      mockRepo.delete.mockResolvedValue({ affected: 1 });

      await removeSupplierLink('cp-uuid-1', 'link-uuid-1', 'commerce-uuid-1');

      expect(mockRepo.delete).toHaveBeenCalledWith({ id: link.id });
    });

    it('should throw 404 when link not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(
        removeSupplierLink('cp-uuid-1', 'bad-link', 'commerce-uuid-1'),
      ).rejects.toThrow('Supplier link not found');
    });
  });
});
