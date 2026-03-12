import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRepository } from '../../test/mocks/mock-repository';
import {
  createPurchaseListFixture,
  createPurchaseListItemFixture,
  createSupplierProductFixture,
} from '../../test/fixtures/entities';

vi.mock('../../config/data-source', () => ({
  AppDataSource: { getRepository: vi.fn() },
}));

import { AppDataSource } from '../../config/data-source';
import {
  listPurchaseLists,
  createPurchaseList,
  getPurchaseList,
  updatePurchaseList,
  deletePurchaseList,
  addPurchaseItem,
  updatePurchaseItem,
  removePurchaseItem,
  exportToWhatsApp,
} from './purchase.service';
import { PurchaseListStatus } from './entities/purchase-list.entity';

function createMockQb() {
  const qb: Record<string, ReturnType<typeof vi.fn>> = {};
  const chainMethods = ['select', 'innerJoin', 'where', 'orderBy'];
  for (const m of chainMethods) {
    qb[m] = vi.fn().mockImplementation(() => qb);
  }
  qb['getRawOne'] = vi.fn().mockResolvedValue(null);
  return qb;
}

describe('purchase.service', () => {
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

  describe('listPurchaseLists', () => {
    it('should return paginated purchase lists', async () => {
      const lists = [createPurchaseListFixture()];
      mockRepo.findAndCount.mockResolvedValue([lists, 1]);

      const result = await listPurchaseLists('commerce-uuid-1', 1, 20);

      expect(result.data).toEqual(lists);
      expect(result.meta).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 });
      expect(mockRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { commerceId: 'commerce-uuid-1' } }),
      );
    });
  });

  describe('createPurchaseList', () => {
    it('should create a purchase list', async () => {
      mockRepo.create.mockImplementation((data: unknown) => ({ ...data as object }));
      mockRepo.save.mockImplementation(async (e: unknown) => ({ ...e as object, id: 'new-id' }));

      const result = await createPurchaseList('commerce-uuid-1', { name: 'My List' });

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          commerceId: 'commerce-uuid-1',
          name: 'My List',
          notes: null,
        }),
      );
      expect(result).toHaveProperty('id');
    });
  });

  describe('getPurchaseList', () => {
    it('should return purchase list with items', async () => {
      const list = createPurchaseListFixture();
      const items = [createPurchaseListItemFixture()];
      mockRepo.findOne.mockResolvedValue(list);
      mockRepo.find.mockResolvedValue(items);

      const result = await getPurchaseList('pl-uuid-1', 'commerce-uuid-1');

      expect(result).toHaveProperty('items');
      expect(result.items).toEqual(items);
    });

    it('should throw 404 when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(getPurchaseList('bad-id', 'commerce-uuid-1')).rejects.toThrow(
        'Purchase list not found',
      );
    });
  });

  describe('updatePurchaseList', () => {
    it('should update list fields', async () => {
      const list = createPurchaseListFixture({ name: 'Old Name' });
      mockRepo.findOne.mockResolvedValue(list);
      mockRepo.save.mockImplementation(async (e: unknown) => e);

      const result = await updatePurchaseList('pl-uuid-1', 'commerce-uuid-1', {
        name: 'New Name',
        status: PurchaseListStatus.ORDERED,
      });

      expect(result).toHaveProperty('name', 'New Name');
      expect(result).toHaveProperty('status', PurchaseListStatus.ORDERED);
    });

    it('should throw 404 when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(
        updatePurchaseList('bad-id', 'commerce-uuid-1', { name: 'X' }),
      ).rejects.toThrow('Purchase list not found');
    });
  });

  describe('deletePurchaseList', () => {
    it('should hard delete the list', async () => {
      const list = createPurchaseListFixture();
      mockRepo.findOne.mockResolvedValue(list);
      mockRepo.delete.mockResolvedValue({ affected: 1 });

      await deletePurchaseList('pl-uuid-1', 'commerce-uuid-1');

      expect(mockRepo.delete).toHaveBeenCalledWith({ id: list.id });
    });

    it('should throw 404 when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(deletePurchaseList('bad-id', 'commerce-uuid-1')).rejects.toThrow(
        'Purchase list not found',
      );
    });
  });

  describe('addPurchaseItem', () => {
    it('should add item with price snapshot', async () => {
      const list = createPurchaseListFixture();
      const product = createSupplierProductFixture();
      mockRepo.findOne
        .mockResolvedValueOnce(list)     // purchase list check
        .mockResolvedValueOnce(product); // supplier product check
      mockQb.getRawOne.mockResolvedValue({ unitCost: '100.00' });
      mockRepo.create.mockImplementation((data: unknown) => ({ ...data as object }));
      mockRepo.save.mockImplementation(async (e: unknown) => ({ ...e as object, id: 'item-id' }));

      const result = await addPurchaseItem('pl-uuid-1', 'commerce-uuid-1', {
        supplierProductId: 'sp-uuid-1',
        quantity: 3,
      });

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          purchaseListId: 'pl-uuid-1',
          supplierProductId: 'sp-uuid-1',
          quantity: 3,
          unitCostSnapshot: '100.00',
          currency: 'ARS',
        }),
      );
      expect(result).toHaveProperty('id');
    });

    it('should throw 422 when no price available', async () => {
      const list = createPurchaseListFixture();
      const product = createSupplierProductFixture();
      mockRepo.findOne
        .mockResolvedValueOnce(list)
        .mockResolvedValueOnce(product);
      mockQb.getRawOne.mockResolvedValue(null);

      await expect(
        addPurchaseItem('pl-uuid-1', 'commerce-uuid-1', {
          supplierProductId: 'sp-uuid-1',
          quantity: 1,
        }),
      ).rejects.toThrow('No processed price available for this product');
    });

    it('should throw 404 when purchase list not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(
        addPurchaseItem('bad-id', 'commerce-uuid-1', {
          supplierProductId: 'sp-uuid-1',
          quantity: 1,
        }),
      ).rejects.toThrow('Purchase list not found');
    });

    it('should throw 404 when product not found in commerce', async () => {
      const list = createPurchaseListFixture();
      mockRepo.findOne
        .mockResolvedValueOnce(list)
        .mockResolvedValueOnce(null); // product not found

      await expect(
        addPurchaseItem('pl-uuid-1', 'commerce-uuid-1', {
          supplierProductId: 'bad-product',
          quantity: 1,
        }),
      ).rejects.toThrow('Product not found');
    });
  });

  describe('updatePurchaseItem', () => {
    it('should update item quantity', async () => {
      const list = createPurchaseListFixture();
      const item = createPurchaseListItemFixture({ quantity: 1 });
      mockRepo.findOne
        .mockResolvedValueOnce(list)
        .mockResolvedValueOnce(item);
      mockRepo.save.mockImplementation(async (e: unknown) => e);

      const result = await updatePurchaseItem('pl-uuid-1', 'item-uuid-1', 'commerce-uuid-1', {
        quantity: 5,
      });

      expect(result).toHaveProperty('quantity', 5);
    });

    it('should throw 404 when item not found', async () => {
      const list = createPurchaseListFixture();
      mockRepo.findOne
        .mockResolvedValueOnce(list)
        .mockResolvedValueOnce(null);

      await expect(
        updatePurchaseItem('pl-uuid-1', 'bad-item', 'commerce-uuid-1', { quantity: 5 }),
      ).rejects.toThrow('Purchase list item not found');
    });
  });

  describe('removePurchaseItem', () => {
    it('should delete the item', async () => {
      const list = createPurchaseListFixture();
      const item = createPurchaseListItemFixture();
      mockRepo.findOne
        .mockResolvedValueOnce(list)
        .mockResolvedValueOnce(item);
      mockRepo.delete.mockResolvedValue({ affected: 1 });

      await removePurchaseItem('pl-uuid-1', 'item-uuid-1', 'commerce-uuid-1');

      expect(mockRepo.delete).toHaveBeenCalledWith({ id: item.id });
    });
  });

  describe('exportToWhatsApp', () => {
    it('should export list as WhatsApp-formatted text', async () => {
      const list = createPurchaseListFixture({ name: 'Pedido Semana 1' });
      const supplier = { id: 'supplier-uuid-1', name: 'Proveedor ABC' };
      const product = createSupplierProductFixture({
        name: 'Coca Cola 1.5L',
        supplierId: 'supplier-uuid-1',
        supplier,
      });
      const item = createPurchaseListItemFixture({
        quantity: 5,
        unitCostSnapshot: '200.00',
        supplierProduct: product,
      });

      mockRepo.findOne.mockResolvedValue(list);
      mockRepo.find.mockResolvedValue([item]);

      const text = await exportToWhatsApp('pl-uuid-1', 'commerce-uuid-1');

      expect(text).toContain('Lista: Pedido Semana 1');
      expect(text).toContain('Proveedor ABC');
      expect(text).toContain('Coca Cola 1.5L');
      expect(text).toContain('5 unidades');
      expect(text).toContain('$200.00');
      expect(text).toContain('Total estimado: $1000.00');
    });

    it('should group items by supplier', async () => {
      const list = createPurchaseListFixture({ name: 'Test List' });
      const supplier1 = { id: 'supplier-1', name: 'Proveedor Uno' };
      const supplier2 = { id: 'supplier-2', name: 'Proveedor Dos' };
      const product1 = createSupplierProductFixture({
        id: 'sp-1',
        name: 'Producto A',
        supplierId: 'supplier-1',
        supplier: supplier1,
      });
      const product2 = createSupplierProductFixture({
        id: 'sp-2',
        name: 'Producto B',
        supplierId: 'supplier-2',
        supplier: supplier2,
      });
      const item1 = createPurchaseListItemFixture({
        id: 'item-1',
        supplierProductId: 'sp-1',
        quantity: 2,
        unitCostSnapshot: '100.00',
        supplierProduct: product1,
      });
      const item2 = createPurchaseListItemFixture({
        id: 'item-2',
        supplierProductId: 'sp-2',
        quantity: 3,
        unitCostSnapshot: '50.00',
        supplierProduct: product2,
      });

      mockRepo.findOne.mockResolvedValue(list);
      mockRepo.find.mockResolvedValue([item1, item2]);

      const text = await exportToWhatsApp('pl-uuid-1', 'commerce-uuid-1');

      expect(text).toContain('Proveedor Uno');
      expect(text).toContain('Proveedor Dos');
      expect(text).toContain('Producto A');
      expect(text).toContain('Producto B');
      // Total: 2*100 + 3*50 = 350
      expect(text).toContain('Total estimado: $350.00');
    });
  });
});
