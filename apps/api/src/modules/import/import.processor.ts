import { In } from 'typeorm';
import { AppDataSource } from '../../config/data-source';
import { formatArs, formatPct } from '../../shared/format';
import { SupplierProduct } from './entities/supplier-product.entity';
import { PriceList, PriceListStatus } from './entities/price-list.entity';
import { PriceListItem } from './entities/price-list-item.entity';
import { ImportJob, ImportJobStatus } from './entities/import-job.entity';
import { ImportParseResult } from './entities/import-parse-result.entity';
import { PriceChangeEvent } from './entities/price-change-event.entity';
import { ParsedRow, ParseResult } from './import.types';
import { CommerceProductSupplierLink } from '../commerce-product/entities/commerce-product-supplier-link.entity';
import { createNotification } from '../notification/notification.service';
import { NotificationType } from '../notification/entities/notification.entity';

const supplierProductRepo = () => AppDataSource.getRepository(SupplierProduct);
const priceListRepo = () => AppDataSource.getRepository(PriceList);
const priceListItemRepo = () => AppDataSource.getRepository(PriceListItem);
const importJobRepo = () => AppDataSource.getRepository(ImportJob);
const importParseResultRepo = () => AppDataSource.getRepository(ImportParseResult);
const priceChangeEventRepo = () => AppDataSource.getRepository(PriceChangeEvent);

const normalizeName = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');

export async function matchOrCreateProduct(
  supplierId: string,
  commerceId: string,
  row: ParsedRow,
): Promise<SupplierProduct> {
  // 1. Match by supplier_product_code when available
  if (row.supplier_product_code) {
    const byCode = await supplierProductRepo().findOne({
      where: { supplierId, commerceId, supplierProductCode: row.supplier_product_code },
    });
    if (byCode) return byCode;
  }

  // 2. Fall back to normalized name match among active products for this supplier
  const allActive = await supplierProductRepo().find({
    where: { supplierId, commerceId, isActive: true },
  });

  const normalizedRowName = normalizeName(row.raw_name);
  const byName = allActive.find((p) => normalizeName(p.name) === normalizedRowName);
  if (byName) return byName;

  // 3. Create a new product
  const newProduct = supplierProductRepo().create({
    commerceId,
    supplierId,
    supplierProductCode: row.supplier_product_code ?? null,
    name: row.raw_name,
    description: null,
    unit: row.unit ?? null,
    brand: row.brand ?? null,
    category: row.category ?? null,
    isActive: true,
  });
  return supplierProductRepo().save(newProduct);
}

export async function createPriceListItems(
  priceListId: string,
  rows: ParsedRow[],
  productMap: Map<number, SupplierProduct>,
): Promise<void> {
  const items = rows.map((row) => {
    const product = productMap.get(row.position_index);
    return priceListItemRepo().create({
      priceListId,
      supplierProductId: product?.id ?? null,
      rawName: row.raw_name,
      unitCost: String(row.unit_cost),
      currency: row.currency,
      positionIndex: row.position_index,
    });
  });

  // Save in batches to avoid sending a single enormous INSERT
  const BATCH_SIZE = 500;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    await priceListItemRepo().save(items.slice(i, i + BATCH_SIZE));
  }
}

export async function detectPriceChanges(
  newPriceListId: string,
  supplierId: string,
  commerceId: string,
): Promise<void> {
  // Find the most recent previously processed price list for this supplier
  const previousPriceList = await priceListRepo()
    .createQueryBuilder('pl')
    .where(
      'pl.supplierId = :supplierId AND pl.commerceId = :commerceId AND pl.status = :status AND pl.id != :id',
      { supplierId, commerceId, status: PriceListStatus.PROCESSED, id: newPriceListId },
    )
    .orderBy('pl.versionNumber', 'DESC')
    .getOne();

  // No previous import — nothing to compare
  if (!previousPriceList) return;

  const [newItems, oldItems] = await Promise.all([
    priceListItemRepo().find({ where: { priceListId: newPriceListId } }),
    priceListItemRepo().find({ where: { priceListId: previousPriceList.id } }),
  ]);

  // Build a map of old prices keyed by supplierProductId
  const oldPriceMap = new Map<string, string>();
  for (const item of oldItems) {
    if (item.supplierProductId) {
      oldPriceMap.set(item.supplierProductId, item.unitCost);
    }
  }

  const events: PriceChangeEvent[] = [];

  for (const newItem of newItems) {
    if (!newItem.supplierProductId) continue;
    const oldCost = oldPriceMap.get(newItem.supplierProductId);
    if (oldCost === undefined) continue; // new product, no prior price

    const oldVal = parseFloat(oldCost);
    const newVal = parseFloat(newItem.unitCost);

    if (oldVal === newVal) continue;

    const changePercentage =
      oldVal === 0 ? '0' : (((newVal - oldVal) / oldVal) * 100).toFixed(2);

    events.push(
      priceChangeEventRepo().create({
        commerceId,
        supplierId,
        supplierProductId: newItem.supplierProductId,
        oldPrice: oldCost,
        newPrice: newItem.unitCost,
        changePercentage,
        detectedInPriceListId: newPriceListId,
      }),
    );
  }

  if (events.length > 0) {
    await priceChangeEventRepo().save(events);
  }
}

export async function saveParseResult(
  priceListId: string,
  parseResult: ParseResult,
): Promise<void> {
  const record = importParseResultRepo().create({
    priceListId,
    parserName: parseResult.parser,
    parserVersion: parseResult.version,
    rawOutputJson: parseResult as unknown as Record<string, unknown>,
  });
  await importParseResultRepo().save(record);
}

export async function updatePriceListStatus(
  priceListId: string,
  status: PriceListStatus,
  processedAt?: Date,
): Promise<void> {
  const priceList = await priceListRepo().findOne({ where: { id: priceListId } });
  if (!priceList) return;

  priceList.status = status;
  if (processedAt !== undefined) {
    priceList.processedAt = processedAt;
  }
  await priceListRepo().save(priceList);
}

export async function updateImportJobStatus(
  priceListId: string,
  status: ImportJobStatus,
  errorMessage?: string,
  meta?: Record<string, unknown>,
): Promise<void> {
  const job = await importJobRepo().findOne({ where: { priceListId } });
  if (!job) return;

  job.status = status;

  if (status === ImportJobStatus.RUNNING) {
    job.startedAt = new Date();
  }

  if (status === ImportJobStatus.COMPLETED || status === ImportJobStatus.FAILED) {
    job.finishedAt = new Date();
  }

  if (errorMessage !== undefined) {
    job.errorMessage = errorMessage;
  }

  if (meta !== undefined) {
    job.metaJson = { ...(job.metaJson ?? {}), ...meta };
  }

  await importJobRepo().save(job);
}

export async function generateNotifications(
  commerceId: string,
  priceListId: string,
): Promise<void> {
  const priceList = await priceListRepo().findOne({
    where: { id: priceListId },
    relations: ['supplier'],
  });
  if (!priceList) return;
  const supplierName = priceList.supplier?.name ?? 'tu proveedor';
  const itemCount = await priceListItemRepo().count({ where: { priceListId } });

  // 1. Import finished
  await createNotification(
    commerceId,
    NotificationType.IMPORT_FINISHED,
    `Lista de ${supplierName} importada`,
    `Versión ${priceList.versionNumber}: ${itemCount} ${itemCount === 1 ? 'producto' : 'productos'}.`,
    { priceListId, supplierId: priceList.supplierId, versionNumber: priceList.versionNumber, itemCount },
  );

  // 2. Price changes detected in this list
  const changeEvents = await priceChangeEventRepo().find({
    where: { detectedInPriceListId: priceListId, commerceId },
    relations: ['supplierProduct'],
  });
  if (changeEvents.length === 0) return;

  // 3. One notification per changed favorite, naming the product and both prices
  const favoriteLinks = await AppDataSource.getRepository(CommerceProductSupplierLink).find({
    where: {
      commerceId,
      isFavorite: true,
      supplierProductId: In(changeEvents.map((e) => e.supplierProductId)),
    },
  });
  const favoriteIds = new Set(favoriteLinks.map((l) => l.supplierProductId));

  for (const event of changeEvents) {
    if (!favoriteIds.has(event.supplierProductId)) continue;
    const productName = event.supplierProduct?.name ?? 'Un producto favorito';
    await createNotification(
      commerceId,
      NotificationType.FAVORITE_PRICE_CHANGE,
      `${productName}: ${formatPct(event.changePercentage)}`,
      `${supplierName}: ${formatArs(event.oldPrice)} → ${formatArs(event.newPrice)}.`,
      {
        priceChangeEventId: event.id,
        supplierProductId: event.supplierProductId,
        supplierId: priceList.supplierId,
        changePercentage: event.changePercentage,
      },
    );
  }

  // 4. Summary of the list's changes
  const ups = changeEvents.filter((e) => Number(e.changePercentage) > 0).length;
  const downs = changeEvents.length - ups;
  await createNotification(
    commerceId,
    NotificationType.PRICE_CHANGE,
    `${changeEvents.length} ${changeEvents.length === 1 ? 'cambio' : 'cambios'} de precio en ${supplierName}`,
    `${ups} ${ups === 1 ? 'suba' : 'subas'} y ${downs} ${downs === 1 ? 'baja' : 'bajas'} en la versión ${priceList.versionNumber}.`,
    { priceListId, supplierId: priceList.supplierId, changeCount: changeEvents.length, ups, downs },
  );
}

/** The import failed (parser error or pipeline crash): tell the commerce, the upload page may be long closed. */
export async function notifyImportFailed(priceListId: string, reason: string): Promise<void> {
  const priceList = await priceListRepo().findOne({
    where: { id: priceListId },
    relations: ['supplier'],
  });
  if (!priceList) return;
  const supplierName = priceList.supplier?.name ?? 'tu proveedor';
  await createNotification(
    priceList.commerceId,
    NotificationType.IMPORT_FAILED,
    `No se pudo importar la lista de ${supplierName}`,
    `${priceList.sourceFileName ?? 'El archivo'}: ${reason}`,
    { priceListId, supplierId: priceList.supplierId },
  );
}
