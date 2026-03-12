import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRepository } from '../../test/mocks/mock-repository';
import { createSupplierProductFixture } from '../../test/fixtures/entities';

vi.mock('../../config/data-source', () => ({
  AppDataSource: { getRepository: vi.fn() },
}));

import { AppDataSource } from '../../config/data-source';
import {
  listProducts,
  getProduct,
  getPriceHistory,
  getPriceChanges,
  toggleFavorite,
} from './catalog.service';

function createMockQb() {
  const qb: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = [
    'select', 'addSelect', 'leftJoin', 'leftJoinAndSelect', 'innerJoin', 'innerJoinAndSelect',
    'where', 'andWhere', 'orderBy', 'addOrderBy', 'skip', 'take',
  ];
  for (const m of methods) {
    qb[m] = vi.fn().mockImplementation(() => qb);
  }
  qb['getManyAndCount'] = vi.fn().mockResolvedValue([[], 0]);
  qb['getMany'] = vi.fn().mockResolvedValue([]);
  qb['getOne'] = vi.fn().mockResolvedValue(null);
  qb['getRawOne'] = vi.fn().mockResolvedValue(null);
  qb['getRawMany'] = vi.fn().mockResolvedValue([]);
  return qb;
}

describe('catalog.service', () => {
  let mockRepo: ReturnType<typeof createMockRepository> & {
    createQueryBuilder: ReturnType<typeof vi.fn>;
  };
  let mockQb: ReturnType<typeof createMockQb>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockQb = createMockQb();

    mockRepo = {
      ...createMockRepository(),
      createQueryBuilder: vi.fn().mockReturnValue(mockQb),
    };

    vi.mocked(AppDataSource.getRepository).mockReturnValue(mockRepo as never);
  });

  describe('listProducts', () => {
    it('should return paginated products with meta', async () => {
      const products = [createSupplierProductFixture()];
      mockQb.getManyAndCount.mockResolvedValue([products, 1]);
      mockRepo.find.mockResolvedValue([]);

      const result = await listProducts('commerce-uuid-1', {
        page: 1,
        limit: 20,
        sortOrder: 'ASC',
        favoritesOnly: false,
      });

      expect(result.meta).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 });
      expect(result.data).toHaveLength(1);
    });

    it('should apply supplierId filter', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);
      mockRepo.find.mockResolvedValue([]);

      await listProducts('commerce-uuid-1', {
        page: 1,
        limit: 20,
        supplierId: 'supplier-uuid-1',
        sortOrder: 'ASC',
        favoritesOnly: false,
      });

      expect(mockQb.andWhere).toHaveBeenCalledWith('sp.supplierId = :supplierId', {
        supplierId: 'supplier-uuid-1',
      });
    });

    it('should apply category filter', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);
      mockRepo.find.mockResolvedValue([]);

      await listProducts('commerce-uuid-1', {
        page: 1,
        limit: 20,
        category: 'Beverages',
        sortOrder: 'ASC',
        favoritesOnly: false,
      });

      expect(mockQb.andWhere).toHaveBeenCalledWith('sp.category = :category', {
        category: 'Beverages',
      });
    });

    it('should apply search filter with ILIKE', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);
      mockRepo.find.mockResolvedValue([]);

      await listProducts('commerce-uuid-1', {
        page: 1,
        limit: 20,
        search: 'coca',
        sortOrder: 'ASC',
        favoritesOnly: false,
      });

      expect(mockQb.andWhere).toHaveBeenCalledWith('sp.name ILIKE :search', {
        search: '%coca%',
      });
    });

    it('should apply favoritesOnly filter', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);
      mockRepo.find.mockResolvedValue([]);

      await listProducts('commerce-uuid-1', {
        page: 1,
        limit: 20,
        favoritesOnly: true,
        sortOrder: 'ASC',
      });

      expect(mockQb.andWhere).toHaveBeenCalledWith('cpsl.is_favorite = true');
    });

    it('should enrich products with unitCost and isFavorite', async () => {
      const product = createSupplierProductFixture({ id: 'sp-uuid-1' });
      mockQb.getManyAndCount.mockResolvedValue([[product], 1]);
      mockQb.getRawMany
        .mockResolvedValueOnce([{ supplierProductId: 'sp-uuid-1', unitCost: '100.00' }])
        .mockResolvedValueOnce([{ supplierProductId: 'sp-uuid-1', changePercentage: '5.00' }]);
      mockRepo.find.mockResolvedValue([
        { supplierProductId: 'sp-uuid-1', isFavorite: true },
      ]);

      const result = await listProducts('commerce-uuid-1', {
        page: 1,
        limit: 20,
        sortOrder: 'ASC',
        favoritesOnly: false,
      });

      expect(result.data[0]).toHaveProperty('unitCost', '100.00');
      expect(result.data[0]).toHaveProperty('changePercentage', '5.00');
      expect(result.data[0]).toHaveProperty('isFavorite', true);
    });
  });

  describe('getProduct', () => {
    it('should return product with enriched data', async () => {
      const product = createSupplierProductFixture();
      mockQb.getOne.mockResolvedValue(product);
      mockQb.getRawOne
        .mockResolvedValueOnce({ unitCost: '150.00' })
        .mockResolvedValueOnce({ changePercentage: '10.00' });
      mockRepo.findOne.mockResolvedValue({ supplierProductId: 'sp-uuid-1', isFavorite: false });

      const result = await getProduct('sp-uuid-1', 'commerce-uuid-1');

      expect(result).toHaveProperty('unitCost', '150.00');
      expect(result).toHaveProperty('changePercentage', '10.00');
    });

    it('should throw 404 when product not found', async () => {
      mockQb.getOne.mockResolvedValue(null);

      await expect(getProduct('bad-id', 'commerce-uuid-1')).rejects.toThrow('Product not found');
    });

    it('should return null unitCost when no price exists', async () => {
      const product = createSupplierProductFixture();
      mockQb.getOne.mockResolvedValue(product);
      mockQb.getRawOne.mockResolvedValue(null);
      mockRepo.findOne.mockResolvedValue(null);

      const result = await getProduct('sp-uuid-1', 'commerce-uuid-1');

      expect(result).toHaveProperty('unitCost', null);
      expect(result).toHaveProperty('isFavorite', false);
    });
  });

  describe('getPriceHistory', () => {
    it('should return price history for a product', async () => {
      const product = createSupplierProductFixture();
      mockRepo.findOne.mockResolvedValue(product);
      const items = [{ id: 'pli-1', unitCost: '100.00' }];
      mockQb.getMany.mockResolvedValue(items);

      const result = await getPriceHistory('sp-uuid-1', 'commerce-uuid-1');

      expect(result.data).toEqual(items);
    });

    it('should throw 404 when product not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(getPriceHistory('bad-id', 'commerce-uuid-1')).rejects.toThrow(
        'Product not found',
      );
    });
  });

  describe('getPriceChanges', () => {
    it('should return price change events for a product', async () => {
      const product = createSupplierProductFixture();
      mockRepo.findOne.mockResolvedValue(product);
      const events = [{ id: 'pce-1', changePercentage: '5.00' }];
      mockRepo.find.mockResolvedValue(events);

      const result = await getPriceChanges('sp-uuid-1', 'commerce-uuid-1');

      expect(result.data).toEqual(events);
    });

    it('should throw 404 when product not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(getPriceChanges('bad-id', 'commerce-uuid-1')).rejects.toThrow(
        'Product not found',
      );
    });
  });

  describe('toggleFavorite', () => {
    it('should create a favorite link when none exists', async () => {
      const product = createSupplierProductFixture();
      mockRepo.findOne
        .mockResolvedValueOnce(product) // product check
        .mockResolvedValueOnce(null); // existing link check
      mockRepo.create.mockImplementation((data: unknown) => ({ ...data as object }));
      mockRepo.save.mockImplementation(async (e: unknown) => e);

      await toggleFavorite('sp-uuid-1', 'commerce-uuid-1', true);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ isFavorite: true, supplierProductId: 'sp-uuid-1' }),
      );
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('should delete the link when unfavoriting with no commerce product', async () => {
      const product = createSupplierProductFixture();
      const existingLink = { id: 'link-uuid-1', commerceProductId: null, isFavorite: true };
      mockRepo.findOne
        .mockResolvedValueOnce(product)
        .mockResolvedValueOnce(existingLink);
      mockRepo.delete.mockResolvedValue({ affected: 1 });

      await toggleFavorite('sp-uuid-1', 'commerce-uuid-1', false);

      expect(mockRepo.delete).toHaveBeenCalledWith({ id: 'link-uuid-1' });
    });

    it('should update isFavorite when link has a commerce product', async () => {
      const product = createSupplierProductFixture();
      const existingLink = { id: 'link-uuid-1', commerceProductId: 'cp-uuid-1', isFavorite: true };
      mockRepo.findOne
        .mockResolvedValueOnce(product)
        .mockResolvedValueOnce(existingLink);
      mockRepo.save.mockImplementation(async (e: unknown) => e);

      await toggleFavorite('sp-uuid-1', 'commerce-uuid-1', false);

      expect(existingLink.isFavorite).toBe(false);
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('should do nothing when removing a non-existing favorite', async () => {
      const product = createSupplierProductFixture();
      mockRepo.findOne
        .mockResolvedValueOnce(product)
        .mockResolvedValueOnce(null);

      await toggleFavorite('sp-uuid-1', 'commerce-uuid-1', false);

      expect(mockRepo.save).not.toHaveBeenCalled();
      expect(mockRepo.delete).not.toHaveBeenCalled();
    });

    it('should throw 404 when product not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(toggleFavorite('bad-id', 'commerce-uuid-1', true)).rejects.toThrow(
        'Product not found',
      );
    });
  });
});
