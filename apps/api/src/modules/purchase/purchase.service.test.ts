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
  toWhatsAppNumber,
} from './purchase.service';
import { PurchaseListStatus } from './entities/purchase-list.entity';

function createMockQb() {
  const qb: Record<string, ReturnType<typeof vi.fn>> = {};
  const chainMethods = ['select', 'addSelect', 'innerJoin', 'where', 'orderBy', 'groupBy'];
  for (const m of chainMethods) {
    qb[m] = vi.fn().mockImplementation(() => qb);
  }
  qb['getRawOne'] = vi.fn().mockResolvedValue(null);
  qb['getRawMany'] = vi.fn().mockResolvedValue([]);
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

      expect(result.data).toEqual([
        { ...lists[0], itemCount: 0, supplierCount: 0, estimatedTotal: 0 },
      ]);
      expect(result.meta).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 });
      expect(mockRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { commerceId: 'commerce-uuid-1' } }),
      );
    });
  });

  describe('listPurchaseLists totals', () => {
    it('adds item count, supplier count and estimated total per list', async () => {
      const lists = [createPurchaseListFixture({ id: 'pl-1' }), createPurchaseListFixture({ id: 'pl-2' })];
      mockRepo.findAndCount.mockResolvedValue([lists, 2]);
      mockQb.getRawMany.mockResolvedValue([
        { listId: 'pl-1', itemCount: 3, supplierCount: 2, estimatedTotal: '4500.50' },
      ]);

      const result = await listPurchaseLists('commerce-uuid-1', 1, 20);

      expect(result.data[0]).toMatchObject({ itemCount: 3, supplierCount: 2, estimatedTotal: 4500.5 });
      expect(result.data[1]).toMatchObject({ itemCount: 0, supplierCount: 0, estimatedTotal: 0 });
      expect(mockQb.where).toHaveBeenCalledWith('i.purchaseListId IN (:...ids)', { ids: ['pl-1', 'pl-2'] });
    });

    it('skips the totals query for an empty page', async () => {
      mockRepo.findAndCount.mockResolvedValue([[], 0]);
      await listPurchaseLists('commerce-uuid-1', 1, 20);
      expect(mockRepo.createQueryBuilder).not.toHaveBeenCalled();
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
        .mockResolvedValueOnce(product)  // supplier product check
        .mockResolvedValueOnce(null);    // not in the list yet
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

    it('should add to the quantity when the product is already in the list', async () => {
      const existing = createPurchaseListItemFixture({ quantity: 2, unitCostSnapshot: '90.00' });
      mockRepo.findOne
        .mockResolvedValueOnce(createPurchaseListFixture())
        .mockResolvedValueOnce(createSupplierProductFixture())
        .mockResolvedValueOnce(existing);
      mockRepo.save.mockImplementation(async (e: unknown) => e);

      const result = await addPurchaseItem('pl-uuid-1', 'commerce-uuid-1', {
        supplierProductId: 'sp-uuid-1',
        quantity: 3,
      });

      expect(result).toMatchObject({ quantity: 5, unitCostSnapshot: '90.00' });
      expect(mockRepo.create).not.toHaveBeenCalled();
      expect(mockQb.getRawOne).not.toHaveBeenCalled();
    });

    it('should throw 422 when no price available', async () => {
      const list = createPurchaseListFixture();
      const product = createSupplierProductFixture();
      mockRepo.findOne
        .mockResolvedValueOnce(list)
        .mockResolvedValueOnce(product)
        .mockResolvedValueOnce(null);
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
    function setup() {
      const list = createPurchaseListFixture({ name: 'Pedido semanal' });
      const central = { id: 'sup-1', name: 'Distribuidora Central', contactPhone: '011 2345-6789' };
      const sur = { id: 'sup-2', name: 'Bebidas del Sur', contactPhone: null };
      const items = [
        createPurchaseListItemFixture({
          id: 'i-1',
          quantity: 6,
          unitCostSnapshot: '3600.00',
          supplierProduct: createSupplierProductFixture({
            name: 'Aceite Girasol 1.5L', supplierProductCode: 'C-001', unit: 'unidad', supplierId: 'sup-1', supplier: central,
          }),
        }),
        createPurchaseListItemFixture({
          id: 'i-2',
          quantity: 10,
          unitCostSnapshot: '1140.00',
          supplierProduct: createSupplierProductFixture({
            name: 'Arroz Largo Fino', supplierProductCode: null, unit: 'kg', supplierId: 'sup-1', supplier: central,
          }),
        }),
        createPurchaseListItemFixture({
          id: 'i-3',
          quantity: 12,
          unitCostSnapshot: '1850.50',
          supplierProduct: createSupplierProductFixture({
            name: 'Gaseosa Cola 2.25L', supplierProductCode: 'B-1', unit: null, supplierId: 'sup-2', supplier: sur,
          }),
        }),
      ];
      mockRepo.findOne.mockResolvedValue(list);
      mockRepo.find.mockResolvedValue(items);
    }

    it('builds one order per supplier, without prices', async () => {
      setup();
      const { orders } = await exportToWhatsApp('pl-uuid-1', 'commerce-uuid-1');

      expect(orders.map((o) => o.supplierName)).toEqual(['Distribuidora Central', 'Bebidas del Sur']);
      expect(orders[0].text).toBe(
        'Hola! Te paso un pedido:\n\n• 6 × Aceite Girasol 1.5L (cód. C-001)\n• 10 kg × Arroz Largo Fino\n\nGracias!',
      );
      expect(orders[0].text).not.toContain('$');
      expect(orders[0]).toMatchObject({ itemCount: 2, subtotal: 33000 });
    });

    it('links to the supplier chat when the phone is usable, else to the contact picker', async () => {
      setup();
      const { orders } = await exportToWhatsApp('pl-uuid-1', 'commerce-uuid-1');

      expect(orders[0].whatsappUrl).toBe(`https://wa.me/5491123456789?text=${encodeURIComponent(orders[0].text)}`);
      expect(orders[1].whatsappUrl.startsWith('https://wa.me/?text=')).toBe(true);
    });

    it('builds the full list with Argentine-formatted prices and total', async () => {
      setup();
      const { fullText } = await exportToWhatsApp('pl-uuid-1', 'commerce-uuid-1');

      expect(fullText).toContain('📋 *Pedido semanal*');
      expect(fullText).toContain('• 6 × Aceite Girasol 1.5L (cód. C-001) — $ 21.600,00');
      expect(fullText).toContain('Subtotal: $ 33.000,00');
      // 21.600 + 11.400 + 22.206 = 55.206
      expect(fullText).toContain('*Total estimado: $ 55.206,00*');
    });
  });

  describe('toWhatsAppNumber', () => {
    it.each([
      ['+54 9 11 2345-6789', '5491123456789'],
      ['011 2345-6789', '5491123456789'],
      ['11 2345 6789', '5491123456789'],
      ['(0351) 456-7890', '5493514567890'],
      ['0054 9 11 2345 6789', '5491123456789'],
    ])('%s → %s', (input, expected) => {
      expect(toWhatsAppNumber(input)).toBe(expected);
    });

    it.each([[null], [''], ['2345-6789'], ['011 15 2345-6789']])('%s → null (ambiguous)', (input) => {
      expect(toWhatsAppNumber(input)).toBeNull();
    });
  });
});
