import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRepository } from '../../test/mocks/mock-repository';
import {
  createMarkupRuleFixture,
  createSupplierProductFixture,
} from '../../test/fixtures/entities';
import { MarkupRule, MarkupScopeType } from '../markup/entities/markup-rule.entity';

vi.mock('../../config/data-source', () => ({
  AppDataSource: { getRepository: vi.fn(), query: vi.fn() },
}));

import { AppDataSource } from '../../config/data-source';
import {
  listProducts,
  listCategories,
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

    mockRepo.find.mockResolvedValue([]);

    vi.mocked(AppDataSource.getRepository).mockReturnValue(mockRepo as never);
  });

  describe('listProducts', () => {
    const baseQuery = {
      page: 1,
      limit: 20,
      sortBy: 'name' as const,
      sortOrder: 'ASC' as const,
      favoritesOnly: false,
      hasRecentChange: false,
    };

    function productRow(overrides: Record<string, unknown> = {}) {
      return {
        id: 'sp-1',
        supplier_id: 'supplier-uuid-1',
        supplier_name: 'Distribuidora',
        supplier_product_code: 'A-1',
        name: 'Leche',
        description: null,
        unit: 'unidad',
        brand: null,
        category: 'Lacteos',
        unit_cost: '1000.00',
        previous_price: '900.00',
        change_percentage: '11.11',
        last_change_at: new Date('2026-11-01'),
        is_favorite: false,
        commerce_product_id: null,
        ...overrides,
      };
    }

    /** First call = COUNT, second = rows. */
    function mockQuery(rows: unknown[], total = rows.length) {
      vi.mocked(AppDataSource.query).mockResolvedValueOnce([{ total }]).mockResolvedValueOnce(rows);
    }
    const sqlOf = (call: number) => vi.mocked(AppDataSource.query).mock.calls[call][0] as string;
    const paramsOf = (call: number) => vi.mocked(AppDataSource.query).mock.calls[call][1] as unknown[];

    it('returns mapped rows and pagination meta', async () => {
      mockQuery([productRow()], 41);

      const result = await listProducts('commerce-uuid-1', { ...baseQuery, page: 2 });

      expect(result.meta).toEqual({ total: 41, page: 2, limit: 20, totalPages: 3 });
      expect(result.data[0]).toMatchObject({
        id: 'sp-1',
        supplier: { id: 'supplier-uuid-1', name: 'Distribuidora' },
        supplierProductCode: 'A-1',
        unitCost: '1000.00',
        previousPrice: '900.00',
        changePercentage: '11.11',
        isFavorite: false,
      });
      // LIMIT / OFFSET are the last two params of the rows query
      expect(paramsOf(1).slice(-2)).toEqual([20, 20]);
    });

    it('always scopes by commerce and active products', async () => {
      mockQuery([]);
      await listProducts('commerce-uuid-1', baseQuery);

      expect(sqlOf(0)).toContain('sp.commerce_id = $1');
      expect(sqlOf(0)).toContain('sp.is_active = true');
      expect(paramsOf(0)[0]).toBe('commerce-uuid-1');
    });

    it('adds parameterized filters', async () => {
      mockQuery([]);
      await listProducts('commerce-uuid-1', {
        ...baseQuery,
        supplierId: 'supplier-uuid-1',
        category: 'Lacteos',
        search: 'lech',
        favoritesOnly: true,
        hasRecentChange: true,
      });

      const sql = sqlOf(0);
      expect(sql).toContain('sp.supplier_id = $2');
      expect(sql).toContain('sp.category = $3');
      expect(sql).toContain('(sp.name ILIKE $4 OR sp.supplier_product_code ILIKE $4)');
      expect(sql).toContain('fav.is_favorite IS TRUE');
      expect(sql).toContain('chg.created_at >= now() - make_interval(days => 30)');
      expect(paramsOf(0)).toEqual(['commerce-uuid-1', 'supplier-uuid-1', 'Lacteos', '%lech%']);
    });

    it.each([
      ['name', 'ASC', 'ORDER BY sp.name ASC NULLS LAST'],
      ['price', 'DESC', 'ORDER BY cur.unit_cost DESC NULLS LAST'],
      ['change', 'DESC', 'ORDER BY chg.change_percentage DESC NULLS LAST'],
    ] as const)('sorts by %s %s with a stable tiebreak', async (sortBy, sortOrder, expected) => {
      mockQuery([]);
      await listProducts('commerce-uuid-1', { ...baseQuery, sortBy, sortOrder });

      expect(sqlOf(1)).toContain(`${expected}, sp.name ASC, sp.id ASC`);
    });

    it('skips loading markup rules when the page is empty', async () => {
      mockQuery([]);
      await listProducts('commerce-uuid-1', baseQuery);
      expect(mockRepo.find).not.toHaveBeenCalled();
    });

    it('applies the supplier markup rule', async () => {
      mockQuery([productRow()]);
      mockRepo.find.mockResolvedValue([
        createMarkupRuleFixture({ supplierId: 'supplier-uuid-1', markupPercentage: '30.00' }),
      ]);

      const result = await listProducts('commerce-uuid-1', baseQuery);

      expect(result.data[0]).toMatchObject({ markupPercentage: 30, salePrice: 1300 });
    });

    it('prefers the commerce_product rule of a linked product', async () => {
      mockQuery([productRow({ commerce_product_id: 'cp-1', is_favorite: true })]);
      mockRepo.find.mockResolvedValue([
        createMarkupRuleFixture({ supplierId: 'supplier-uuid-1', markupPercentage: '30.00' }),
        createMarkupRuleFixture({
          scopeType: MarkupScopeType.COMMERCE_PRODUCT,
          supplierId: null,
          commerceProductId: 'cp-1',
          markupPercentage: '40.00',
        }),
      ]);

      const result = await listProducts('commerce-uuid-1', baseQuery);

      expect(result.data[0]).toMatchObject({ markupPercentage: 40, salePrice: 1400, isFavorite: true });
    });

    it('returns null salePrice without a price', async () => {
      mockQuery([productRow({ unit_cost: null })]);
      mockRepo.find.mockResolvedValue([createMarkupRuleFixture({ markupPercentage: '50.00' })]);

      const result = await listProducts('commerce-uuid-1', baseQuery);

      expect(result.data[0]).toMatchObject({ unitCost: null, markupPercentage: 50, salePrice: null });
    });
  });

  describe('listCategories', () => {
    it('returns distinct category names for the commerce', async () => {
      vi.mocked(AppDataSource.query).mockResolvedValueOnce([{ category: 'Bebidas' }, { category: 'Lacteos' }]);

      expect(await listCategories('commerce-uuid-1')).toEqual(['Bebidas', 'Lacteos']);
      expect(vi.mocked(AppDataSource.query).mock.calls[0][1]).toEqual(['commerce-uuid-1']);
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
  describe('markup in detail', () => {
    let rulesRepo: ReturnType<typeof createMockRepository>;

    beforeEach(() => {
      rulesRepo = createMockRepository();
      rulesRepo.find.mockResolvedValue([]);
      vi.mocked(AppDataSource.getRepository).mockImplementation(
        (entity) => (entity === MarkupRule ? rulesRepo : mockRepo) as never,
      );
    });

    it('should apply markup in getProduct', async () => {
      mockQb.getOne.mockResolvedValue(createSupplierProductFixture({ id: 'sp-1' }));
      mockQb.getRawOne
        .mockResolvedValueOnce({ unitCost: '150.00' })
        .mockResolvedValueOnce(null);
      mockRepo.findOne.mockResolvedValue(null);
      rulesRepo.find.mockResolvedValue([
        createMarkupRuleFixture({ supplierId: 'supplier-uuid-1', markupPercentage: '20.00' }),
      ]);

      const result = await getProduct('sp-1', 'commerce-uuid-1');

      expect(result).toMatchObject({ unitCost: '150.00', markupPercentage: 20, salePrice: 180 });
    });
  });
});
