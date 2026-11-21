import { AppDataSource } from '../../config/data-source';
import { PurchaseList } from './entities/purchase-list.entity';
import { PurchaseListItem } from './entities/purchase-list-item.entity';
import { SupplierProduct } from '../import/entities/supplier-product.entity';
import { PriceListItem } from '../import/entities/price-list-item.entity';
import { AppError } from '../../shared/middleware';
import { formatArs } from '../../shared/format';
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
  const [lists, total] = await purchaseListRepo().findAndCount({
    where: { commerceId },
    order: { createdAt: 'DESC' },
    skip: (page - 1) * limit,
    take: limit,
  });

  // Item count, supplier count and estimated total per list, in one grouped query.
  const ids = lists.map((l) => l.id);
  const totals: { listId: string; itemCount: number; supplierCount: number; estimatedTotal: string }[] =
    ids.length === 0
      ? []
      : await purchaseListItemRepo()
          .createQueryBuilder('i')
          .innerJoin('i.supplierProduct', 'sp')
          .select('i.purchaseListId', 'listId')
          .addSelect('COUNT(*)::int', 'itemCount')
          .addSelect('COUNT(DISTINCT sp.supplierId)::int', 'supplierCount')
          .addSelect('COALESCE(SUM(i.unitCostSnapshot * i.quantity), 0)', 'estimatedTotal')
          .where('i.purchaseListId IN (:...ids)', { ids })
          .groupBy('i.purchaseListId')
          .getRawMany();
  const byList = new Map(totals.map((t) => [t.listId, t]));

  const data = lists.map((list) => {
    const t = byList.get(list.id);
    return {
      ...list,
      itemCount: t?.itemCount ?? 0,
      supplierCount: t?.supplierCount ?? 0,
      estimatedTotal: Number(t?.estimatedTotal ?? 0),
    };
  });

  return {
    data,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
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

  // Adding a product that's already in the list bumps its quantity (keeps the original price snapshot).
  const existing = await purchaseListItemRepo().findOne({
    where: { purchaseListId, supplierProductId: dto.supplierProductId },
  });
  if (existing) {
    existing.quantity += dto.quantity;
    if (dto.notes !== undefined) existing.notes = dto.notes;
    return purchaseListItemRepo().save(existing);
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

export interface SupplierOrder {
  supplierId: string;
  supplierName: string;
  phone: string | null;
  /** wa.me link with the message pre-filled; without a usable phone WhatsApp asks for the contact. */
  whatsappUrl: string;
  itemCount: number;
  subtotal: number;
  /** Message for the supplier: quantities only, no prices. */
  text: string;
}

const PLAIN_UNIT = /^(u|un|und|unid|unidad|unidades)\.?$/i;

/**
 * Argentine phone → WhatsApp number (international digits, mobile "9" included).
 * Returns null when it can't be done reliably (no area code, or a "15" prefix we'd
 * have to guess around); the link then lets the user pick the contact.
 */
export function toWhatsAppNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('54')) return digits.length >= 12 ? digits : null;
  if (digits.startsWith('0')) digits = digits.slice(1);
  return digits.length === 10 ? `549${digits}` : null; // area code + number, no 15
}

function itemLine(item: PurchaseListItem): string {
  const product = item.supplierProduct;
  const unit = product?.unit && !PLAIN_UNIT.test(product.unit.trim()) ? ` ${product.unit.trim()}` : '';
  const code = product?.supplierProductCode ? ` (cód. ${product.supplierProductCode})` : '';
  return `• ${item.quantity}${unit} × ${product?.name ?? 'Producto'}${code}`;
}

/**
 * One order message per supplier (each goes to a different WhatsApp chat), plus the
 * whole list with prices for the commerce's own records.
 */
export async function exportToWhatsApp(
  id: string,
  commerceId: string,
): Promise<{ orders: SupplierOrder[]; fullText: string }> {
  const list = await getPurchaseList(id, commerceId);

  const groups = new Map<string, PurchaseListItem[]>();
  for (const item of list.items) {
    const supplierId = item.supplierProduct?.supplierId ?? 'unknown';
    groups.set(supplierId, [...(groups.get(supplierId) ?? []), item]);
  }

  const lineTotal = (item: PurchaseListItem) => Number(item.unitCostSnapshot) * item.quantity;

  const orders: SupplierOrder[] = [...groups.entries()].map(([supplierId, items]) => {
    const supplier = items[0].supplierProduct?.supplier;
    const supplierName = supplier?.name ?? 'Proveedor';
    const text = [`Hola! Te paso un pedido:`, '', ...items.map(itemLine), '', 'Gracias!'].join('\n');
    const number = toWhatsAppNumber(supplier?.contactPhone);
    return {
      supplierId,
      supplierName,
      phone: supplier?.contactPhone ?? null,
      whatsappUrl: `https://wa.me/${number ?? ''}?text=${encodeURIComponent(text)}`,
      itemCount: items.length,
      subtotal: Math.round(items.reduce((sum, i) => sum + lineTotal(i), 0) * 100) / 100,
      text,
    };
  });

  const total = orders.reduce((sum, o) => sum + o.subtotal, 0);
  const sections = orders.map((order) => {
    const items = groups.get(order.supplierId)!;
    const lines = items.map((item) => `${itemLine(item)} — ${formatArs(lineTotal(item))}`);
    return [`*${order.supplierName}*`, ...lines, `Subtotal: ${formatArs(order.subtotal)}`].join('\n');
  });
  const fullText = [`📋 *${list.name}*`, '', sections.join('\n\n'), '', `*Total estimado: ${formatArs(total)}*`].join('\n');

  return { orders, fullText };
}
