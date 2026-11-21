import { AppDataSource } from '../../config/data-source';
import { SupplierProduct } from '../import/entities/supplier-product.entity';
import { PriceListItem } from '../import/entities/price-list-item.entity';
import { PriceChangeEvent } from '../import/entities/price-change-event.entity';
import { CommerceProductSupplierLink } from '../commerce-product/entities/commerce-product-supplier-link.entity';
import { AppError } from '../../shared/middleware';
import { applyMarkup, listMarkupRules, pickMarkupRule } from '../markup/markup.service';
import { ListProductsQuery } from './catalog.dto';

const supplierProductRepo = () => AppDataSource.getRepository(SupplierProduct);
const priceListItemRepo = () => AppDataSource.getRepository(PriceListItem);
const priceChangeEventRepo = () => AppDataSource.getRepository(PriceChangeEvent);
const linkRepo = () => AppDataSource.getRepository(CommerceProductSupplierLink);

/** A price change counts as "recent" for the hasRecentChange filter within this window. */
export const RECENT_CHANGE_DAYS = 30;

const PROCESSED_STATUSES = `'processed', 'partially_processed'`;

// Whitelisted ORDER BY expressions (never interpolate user input into SQL).
const SORT_COLUMNS = {
  name: 'sp.name',
  price: 'cur.unit_cost',
  change: 'chg.change_percentage',
} as const;

interface ProductRow {
  id: string;
  supplier_id: string;
  supplier_name: string;
  supplier_product_code: string | null;
  name: string;
  description: string | null;
  unit: string | null;
  brand: string | null;
  category: string | null;
  unit_cost: string | null;
  previous_price: string | null;
  change_percentage: string | null;
  last_change_at: Date | null;
  is_favorite: boolean;
  commerce_product_id: string | null;
}

/**
 * Cross-supplier catalog with current price, latest change and favorite flag.
 * One SQL query so sorting by price/change works across pages:
 * - current price = item from the newest processed price list containing the product
 * - latest change = newest price_change_event of the product
 */
export async function listProducts(commerceId: string, query: ListProductsQuery) {
  const { page, limit, supplierId, category, search, favoritesOnly, hasRecentChange, sortBy, sortOrder } =
    query;

  const params: unknown[] = [commerceId];
  const param = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };

  const where = ['sp.commerce_id = $1', 'sp.is_active = true'];
  if (supplierId) where.push(`sp.supplier_id = ${param(supplierId)}`);
  if (category) where.push(`sp.category = ${param(category)}`);
  if (search) {
    const term = param(`%${search}%`);
    where.push(`(sp.name ILIKE ${term} OR sp.supplier_product_code ILIKE ${term})`);
  }
  if (favoritesOnly) where.push('fav.is_favorite IS TRUE');
  if (hasRecentChange) {
    where.push(`chg.created_at >= now() - make_interval(days => ${RECENT_CHANGE_DAYS})`);
  }

  const from = `
    FROM supplier_products sp
    JOIN suppliers s ON s.id = sp.supplier_id
    LEFT JOIN LATERAL (
      SELECT pli.unit_cost
      FROM price_list_items pli
      JOIN price_lists pl ON pl.id = pli.price_list_id AND pl.status IN (${PROCESSED_STATUSES})
      WHERE pli.supplier_product_id = sp.id
      ORDER BY pl.uploaded_at DESC
      LIMIT 1
    ) cur ON true
    LEFT JOIN LATERAL (
      SELECT pce.old_price, pce.change_percentage, pce.created_at
      FROM price_change_events pce
      WHERE pce.supplier_product_id = sp.id AND pce.commerce_id = $1
      ORDER BY pce.created_at DESC
      LIMIT 1
    ) chg ON true
    LEFT JOIN LATERAL (
      SELECT bool_or(l.is_favorite) AS is_favorite,
             (array_agg(l.commerce_product_id) FILTER (WHERE l.commerce_product_id IS NOT NULL))[1]
               AS commerce_product_id
      FROM commerce_product_supplier_links l
      WHERE l.supplier_product_id = sp.id AND l.commerce_id = $1
    ) fav ON true
    WHERE ${where.join(' AND ')}`;

  // Copy: LIMIT/OFFSET params get appended to `params` for the rows query below.
  const [{ total }] = await AppDataSource.query(`SELECT count(*)::int AS total ${from}`, [...params]);

  const direction = sortOrder === 'DESC' ? 'DESC' : 'ASC';
  const rows: ProductRow[] = await AppDataSource.query(
    `SELECT sp.id, sp.supplier_id, s.name AS supplier_name, sp.supplier_product_code, sp.name,
            sp.description, sp.unit, sp.brand, sp.category,
            cur.unit_cost,
            chg.old_price AS previous_price, chg.change_percentage, chg.created_at AS last_change_at,
            coalesce(fav.is_favorite, false) AS is_favorite, fav.commerce_product_id
     ${from}
     ORDER BY ${SORT_COLUMNS[sortBy]} ${direction} NULLS LAST, sp.name ASC, sp.id ASC
     LIMIT ${param(limit)} OFFSET ${param((page - 1) * limit)}`,
    params,
  );

  const rules = rows.length > 0 ? await listMarkupRules(commerceId) : [];

  const data = rows.map((row) => {
    const rule = pickMarkupRule(rules, {
      supplierId: row.supplier_id,
      supplierProductId: row.id,
      commerceProductId: row.commerce_product_id,
    });
    return {
      id: row.id,
      supplierId: row.supplier_id,
      supplier: { id: row.supplier_id, name: row.supplier_name },
      supplierProductCode: row.supplier_product_code,
      name: row.name,
      description: row.description,
      unit: row.unit,
      brand: row.brand,
      category: row.category,
      unitCost: row.unit_cost,
      ...applyMarkup(row.unit_cost, rule),
      previousPrice: row.previous_price,
      changePercentage: row.change_percentage,
      lastChangeAt: row.last_change_at,
      isFavorite: row.is_favorite,
    };
  });

  return {
    data,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

/** Distinct categories of the commerce's active products, for the catalog filter. */
export async function listCategories(commerceId: string): Promise<string[]> {
  const rows: { category: string }[] = await AppDataSource.query(
    `SELECT DISTINCT category FROM supplier_products
     WHERE commerce_id = $1 AND is_active = true AND category IS NOT NULL AND category <> ''
     ORDER BY category`,
    [commerceId],
  );
  return rows.map((r) => r.category);
}

export async function getProduct(id: string, commerceId: string) {
  const product = await supplierProductRepo()
    .createQueryBuilder('sp')
    .leftJoinAndSelect('sp.supplier', 'supplier')
    .where('sp.id = :id AND sp.commerce_id = :commerceId', { id, commerceId })
    .getOne();

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  // Get current price
  const priceRow = await priceListItemRepo()
    .createQueryBuilder('pli')
    .innerJoin('pli.priceList', 'pl', "pl.status IN ('processed', 'partially_processed')")
    .select('pli.unitCost', 'unitCost')
    .where('pli.supplierProductId = :id', { id })
    .orderBy('pl.uploadedAt', 'DESC')
    .getRawOne();

  // Get latest change
  const changeRow = await priceChangeEventRepo()
    .createQueryBuilder('pce')
    .select('pce.changePercentage', 'changePercentage')
    .where('pce.supplierProductId = :id AND pce.commerceId = :commerceId', { id, commerceId })
    .orderBy('pce.createdAt', 'DESC')
    .getRawOne();

  // Get favorite status (the link also carries the commerce product for markup precedence)
  const link = await linkRepo().findOne({ where: { supplierProductId: id, commerceId } });

  const unitCost = priceRow?.unitCost ?? null;
  const rule = pickMarkupRule(await listMarkupRules(commerceId), {
    supplierId: product.supplierId,
    supplierProductId: id,
    commerceProductId: link?.commerceProductId,
  });

  return {
    ...product,
    unitCost,
    ...applyMarkup(unitCost, rule),
    changePercentage: changeRow?.changePercentage ?? null,
    isFavorite: link?.isFavorite ?? false,
  };
}

export async function getPriceHistory(supplierProductId: string, commerceId: string) {
  // Verify product belongs to commerce
  const product = await supplierProductRepo().findOne({
    where: { id: supplierProductId, commerceId },
  });
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  const rows = await priceListItemRepo()
    .createQueryBuilder('pli')
    .innerJoinAndSelect('pli.priceList', 'pl')
    .where('pli.supplierProductId = :supplierProductId', { supplierProductId })
    .andWhere("pl.status IN ('processed', 'partially_processed')")
    .orderBy('pl.uploadedAt', 'DESC')
    .getMany();

  return { data: rows };
}

export async function getPriceChanges(supplierProductId: string, commerceId: string) {
  // Verify product belongs to commerce
  const product = await supplierProductRepo().findOne({
    where: { id: supplierProductId, commerceId },
  });
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  const events = await priceChangeEventRepo().find({
    where: { supplierProductId, commerceId },
    order: { createdAt: 'DESC' },
  });

  return { data: events };
}

export async function toggleFavorite(
  supplierProductId: string,
  commerceId: string,
  isFavorite: boolean,
): Promise<void> {
  // Verify product belongs to commerce
  const product = await supplierProductRepo().findOne({
    where: { id: supplierProductId, commerceId },
  });
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  const existingLink = await linkRepo().findOne({
    where: { supplierProductId, commerceId },
  });

  if (!existingLink) {
    if (isFavorite) {
      const link = linkRepo().create({
        commerceId,
        supplierProductId,
        commerceProductId: null,
        isFavorite: true,
      });
      await linkRepo().save(link);
    }
    // If isFavorite=false and no link exists, nothing to do
    return;
  }

  if (!isFavorite && existingLink.commerceProductId === null) {
    // No commerce product linked — remove the link entirely
    await linkRepo().delete({ id: existingLink.id });
    return;
  }

  existingLink.isFavorite = isFavorite;
  await linkRepo().save(existingLink);
}
