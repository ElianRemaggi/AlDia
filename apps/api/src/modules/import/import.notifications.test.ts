import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRepository } from '../../test/mocks/mock-repository';

vi.mock('../../config/data-source', () => ({
  AppDataSource: { getRepository: vi.fn() },
}));
vi.mock('../notification/notification.service', () => ({ createNotification: vi.fn() }));

import { AppDataSource } from '../../config/data-source';
import { createNotification } from '../notification/notification.service';
import { NotificationType } from '../notification/entities/notification.entity';
import { CommerceProductSupplierLink } from '../commerce-product/entities/commerce-product-supplier-link.entity';
import { PriceChangeEvent } from './entities/price-change-event.entity';
import { PriceList } from './entities/price-list.entity';
import { PriceListItem } from './entities/price-list-item.entity';
import { generateNotifications, notifyImportFailed } from './import.processor';

const PL = 'pl-1';
const priceList = {
  id: PL,
  commerceId: 'com-1',
  supplierId: 'sup-1',
  versionNumber: 3,
  sourceFileName: 'lista.xlsx',
  supplier: { name: 'Distribuidora Central' },
};

function event(id: string, productName: string, oldPrice: string, newPrice: string, pct: string) {
  return {
    id: `ev-${id}`,
    supplierProductId: id,
    oldPrice,
    newPrice,
    changePercentage: pct,
    supplierProduct: { name: productName },
  };
}

describe('import notifications', () => {
  const repos = new Map<unknown, ReturnType<typeof createMockRepository>>();
  const repo = (entity: unknown) => repos.get(entity)!;

  beforeEach(() => {
    vi.clearAllMocks();
    for (const entity of [PriceList, PriceListItem, PriceChangeEvent, CommerceProductSupplierLink]) {
      repos.set(entity, createMockRepository());
    }
    vi.mocked(AppDataSource.getRepository).mockImplementation((entity) => repos.get(entity) as never);
    repo(PriceList).findOne.mockResolvedValue(priceList);
    repo(PriceListItem).count.mockResolvedValue(42);
    repo(PriceChangeEvent).find.mockResolvedValue([]);
    repo(CommerceProductSupplierLink).find.mockResolvedValue([]);
  });

  describe('generateNotifications', () => {
    it('announces the import with supplier, version and item count', async () => {
      await generateNotifications('com-1', PL);

      expect(createNotification).toHaveBeenCalledTimes(1);
      expect(createNotification).toHaveBeenCalledWith(
        'com-1',
        NotificationType.IMPORT_FINISHED,
        'Lista de Distribuidora Central importada',
        'Versión 3: 42 productos.',
        expect.objectContaining({ priceListId: PL, supplierId: 'sup-1', itemCount: 42 }),
      );
    });

    it('names changed favorites with old → new price, and summarizes the list', async () => {
      repo(PriceChangeEvent).find.mockResolvedValue([
        event('p1', 'Aceite Girasol 1.5L', '3000.00', '3600.00', '20.00'),
        event('p2', 'Arroz 1kg', '1200.00', '1140.00', '-5.00'),
        event('p3', 'Detergente', '1800.00', '1900.00', '5.56'),
      ]);
      repo(CommerceProductSupplierLink).find.mockResolvedValue([{ supplierProductId: 'p1' }]);

      await generateNotifications('com-1', PL);

      expect(createNotification).toHaveBeenCalledWith(
        'com-1',
        NotificationType.FAVORITE_PRICE_CHANGE,
        'Aceite Girasol 1.5L: +20%',
        'Distribuidora Central: $ 3.000,00 → $ 3.600,00.',
        expect.objectContaining({ supplierProductId: 'p1' }),
      );
      expect(createNotification).toHaveBeenCalledWith(
        'com-1',
        NotificationType.PRICE_CHANGE,
        '3 cambios de precio en Distribuidora Central',
        '2 subas y 1 baja en la versión 3.',
        expect.objectContaining({ changeCount: 3, ups: 2, downs: 1 }),
      );
      // import + 1 favorite + summary; non-favorites get no individual notification
      expect(createNotification).toHaveBeenCalledTimes(3);
    });

    it('does nothing if the price list is gone', async () => {
      repo(PriceList).findOne.mockResolvedValue(null);
      await generateNotifications('com-1', PL);
      expect(createNotification).not.toHaveBeenCalled();
    });
  });

  describe('notifyImportFailed', () => {
    it('tells the commerce which supplier and file failed and why', async () => {
      await notifyImportFailed(PL, 'File is not a zip file');

      expect(createNotification).toHaveBeenCalledWith(
        'com-1',
        NotificationType.IMPORT_FAILED,
        'No se pudo importar la lista de Distribuidora Central',
        'lista.xlsx: File is not a zip file',
        { priceListId: PL, supplierId: 'sup-1' },
      );
    });
  });
});
