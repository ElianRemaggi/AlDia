import { AppDataSource } from '../../config/data-source';
import { PurchaseList } from './entities/purchase-list.entity';
import { PurchaseListItem } from './entities/purchase-list-item.entity';
import { SupplierProduct } from '../import/entities/supplier-product.entity';
import { PriceListItem } from '../import/entities/price-list-item.entity';
import { AppError } from '../../shared/middleware';
import {
  CreatePurchaseListDto,
  UpdatePurchaseListDto,
  AddPurchaseItemDto,
  UpdatePurchaseItemDto,
} from './purchase.dto';

const purchaseListRepo = () => AppDataSource.getRepository(PurchaseList);
const purchaseListItemRepo = () => AppDataSource.getRepository(PurchaseListItem);
const supplierProductRepo = () => AppDataSource.getRepository(SupplierProduct);
const priceListItemRepo = () => AppDataSource.getRepository(PriceListItem);

export async function listPurchaseLists(
  commerceId: string,
  page: number,
  limit: number,
) {
  const [data, total] = await purchaseListRepo().findAndCount({
    where: { commerceId },
    order: { createdAt: 'DESC' },
    skip: (page - 1) * limit,
    take: limit,
  });

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function createPurchaseList(
  commerceId: string,
  dto: CreatePurchaseListDto,
): Promise<PurchaseList> {
  const list = purchaseListRepo().create({
    commerceId,
    name: dto.name,
    notes: dto.notes ?? null,
  });
  return purchaseListRepo().save(list);
}

export async function getPurchaseList(
  id: string,
  commerceId: string,
): Promise<PurchaseList & { items: PurchaseListItem[] }> {
  const list = await purchaseListRepo().findOne({ where: { id, commerceId } });
  if (!list) {
    throw new AppError('Purchase list not found', 404);
  }

  const items = await purchaseListItemRepo().find({
    where: { purchaseListId: id },
    relations: ['supplierProduct', 'supplierProduct.supplier'],
  });

  return { ...list, items };
}

export async function updatePurchaseList(
  id: string,
  commerceId: string,
  dto: UpdatePurchaseListDto,
): Promise<PurchaseList> {
  const list = await purchaseListRepo().findOne({ where: { id, commerceId } });
  if (!list) {
    throw new AppError('Purchase list not found', 404);
  }

  Object.assign(list, {
    ...(dto.name !== undefined && { name: dto.name }),
    ...(dto.status !== undefined && { status: dto.status }),
    ...(dto.notes !== undefined && { notes: dto.notes }),
  });

  return purchaseListRepo().save(list);
}

export async function deletePurchaseList(id: string, commerceId: string): Promise<void> {
  const list = await purchaseListRepo().findOne({ where: { id, commerceId } });
  if (!list) {
    throw new AppError('Purchase list not found', 404);
  }
  await purchaseListRepo().delete({ id });
}

export async function addPurchaseItem(
  purchaseListId: string,
  commerceId: string,
  dto: AddPurchaseItemDto,
): Promise<PurchaseListItem> {
  // Verify purchase list belongs to commerce
  const list = await purchaseListRepo().findOne({ where: { id: purchaseListId, commerceId } });
  if (!list) {
    throw new AppError('Purchase list not found', 404);
  }

  // Verify supplier product belongs to commerce
  const product = await supplierProductRepo().findOne({
    where: { id: dto.supplierProductId, commerceId },
  });
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  // Resolve current unit_cost from latest processed price_list
  const latestPriceRow = await priceListItemRepo()
    .createQueryBuilder('pli')
    .innerJoin('pli.priceList', 'pl', "pl.status IN ('processed', 'partially_processed')")
    .select('pli.unitCost', 'unitCost')
    .where('pli.supplierProductId = :supplierProductId', {
      supplierProductId: dto.supplierProductId,
    })
    .orderBy('pl.uploadedAt', 'DESC')
    .getRawOne();

  if (!latestPriceRow) {
    throw new AppError('No processed price available for this product', 422);
  }

  const item = purchaseListItemRepo().create({
    purchaseListId,
    supplierProductId: dto.supplierProductId,
    quantity: dto.quantity,
    unitCostSnapshot: latestPriceRow.unitCost,
    currency: 'ARS',
    notes: dto.notes ?? null,
  });

  return purchaseListItemRepo().save(item);
}

export async function updatePurchaseItem(
  purchaseListId: string,
  itemId: string,
  commerceId: string,
  dto: UpdatePurchaseItemDto,
): Promise<PurchaseListItem> {
  // Verify the purchase list belongs to commerce
  const list = await purchaseListRepo().findOne({ where: { id: purchaseListId, commerceId } });
  if (!list) {
    throw new AppError('Purchase list not found', 404);
  }

  const item = await purchaseListItemRepo().findOne({
    where: { id: itemId, purchaseListId },
  });
  if (!item) {
    throw new AppError('Purchase list item not found', 404);
  }

  Object.assign(item, {
    ...(dto.quantity !== undefined && { quantity: dto.quantity }),
    ...(dto.notes !== undefined && { notes: dto.notes }),
  });

  return purchaseListItemRepo().save(item);
}

export async function removePurchaseItem(
  purchaseListId: string,
  itemId: string,
  commerceId: string,
): Promise<void> {
  // Verify the purchase list belongs to commerce
  const list = await purchaseListRepo().findOne({ where: { id: purchaseListId, commerceId } });
  if (!list) {
    throw new AppError('Purchase list not found', 404);
  }

  const item = await purchaseListItemRepo().findOne({
    where: { id: itemId, purchaseListId },
  });
  if (!item) {
    throw new AppError('Purchase list item not found', 404);
  }

  await purchaseListItemRepo().delete({ id: itemId });
}

export async function exportToWhatsApp(id: string, commerceId: string): Promise<string> {
  const list = await getPurchaseList(id, commerceId);

  // Group items by supplier
  const bySupplier = new Map<string, { supplierName: string; items: typeof list.items }>();

  for (const item of list.items) {
    const supplier = item.supplierProduct?.supplier;
    const supplierId = item.supplierProduct?.supplierId ?? 'unknown';
    const supplierName = supplier?.name ?? 'Unknown Supplier';

    if (!bySupplier.has(supplierId)) {
      bySupplier.set(supplierId, { supplierName, items: [] });
    }
    bySupplier.get(supplierId)!.items.push(item);
  }

  // Calculate total
  const total = list.items.reduce((acc, item) => {
    return acc + parseFloat(item.unitCostSnapshot) * item.quantity;
  }, 0);

  let text = `📋 *Lista: ${list.name}*\n\n`;

  for (const { supplierName, items } of bySupplier.values()) {
    text += `*${supplierName}:*\n`;
    for (const item of items) {
      const productName = item.supplierProduct?.name ?? 'Producto desconocido';
      const cost = parseFloat(item.unitCostSnapshot).toFixed(2);
      text += `• ${productName} — ${item.quantity} unidades — $${cost}\n`;
    }
    text += '\n';
  }

  text += `*Total estimado: $${total.toFixed(2)}*`;

  return text;
}
