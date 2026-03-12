import { AppDataSource } from '../../config/data-source';
import { SupplierProduct } from '../import/entities/supplier-product.entity';
import { PriceListItem } from '../import/entities/price-list-item.entity';
import { PriceChangeEvent } from '../import/entities/price-change-event.entity';
import { CommerceProductSupplierLink } from '../commerce-product/entities/commerce-product-supplier-link.entity';
import { AppError } from '../../shared/middleware';
import { ListProductsQuery } from './catalog.dto';

const supplierProductRepo = () => AppDataSource.getRepository(SupplierProduct);
const priceListItemRepo = () => AppDataSource.getRepository(PriceListItem);
const priceChangeEventRepo = () => AppDataSource.getRepository(PriceChangeEvent);
const linkRepo = () => AppDataSource.getRepository(CommerceProductSupplierLink);

export async function listProducts(commerceId: string, query: ListProductsQuery) {
  const { page, limit, supplierId, category, search, favoritesOnly, sortOrder } = query;

  const qb = supplierProductRepo()
    .createQueryBuilder('sp')
    .leftJoinAndSelect('sp.supplier', 'supplier')
    .leftJoin(
      'commerce_product_supplier_links',
      'cpsl',
      'cpsl.supplier_product_id = sp.id AND cpsl.commerce_id = :commerceId',
      { commerceId },
    )
    .addSelect('cpsl.is_favorite', 'is_favorite')
    .where('sp.commerce_id = :commerceId', { commerceId })
    .andWhere('sp.is_active = true')
    .orderBy('sp.name', sortOrder)
    .skip((page - 1) * limit)
    .take(limit);

  if (supplierId) {
    qb.andWhere('sp.supplierId = :supplierId', { supplierId });
  }

  if (category) {
    qb.andWhere('sp.category = :category', { category });
  }

  if (search) {
    qb.andWhere('sp.name ILIKE :search', { search: `%${search}%` });
  }

  if (favoritesOnly) {
    qb.andWhere('cpsl.is_favorite = true');
  }

  const [products, total] = await qb.getManyAndCount();

  // Enrich each product with current price and latest change
  const productIds = products.map((p) => p.id);

  let unitCostMap = new Map<string, string>();
  let changeMap = new Map<string, string>();
  let favoriteMap = new Map<string, boolean>();

  if (productIds.length > 0) {
    // Current prices: latest price_list_item from latest processed price_list per product
    const priceRows = await priceListItemRepo()
      .createQueryBuilder('pli')
      .innerJoin('pli.priceList', 'pl', "pl.status IN ('processed', 'partially_processed')")
      .select('pli.supplierProductId', 'supplierProductId')
      .addSelect('pli.unitCost', 'unitCost')
      .where('pli.supplierProductId IN (:...ids)', { ids: productIds })
      .orderBy('pl.uploadedAt', 'DESC')
      .getRawMany();

    // Keep only the first (latest) row per product
    for (const row of priceRows) {
      if (!unitCostMap.has(row.supplierProductId)) {
        unitCostMap.set(row.supplierProductId, row.unitCost);
      }
    }

    // Latest change percentage per product
    const changeRows = await priceChangeEventRepo()
      .createQueryBuilder('pce')
      .select('pce.supplierProductId', 'supplierProductId')
      .addSelect('pce.changePercentage', 'changePercentage')
      .where('pce.supplierProductId IN (:...ids) AND pce.commerceId = :commerceId', {
        ids: productIds,
        commerceId,
      })
      .orderBy('pce.createdAt', 'DESC')
      .getRawMany();

    for (const row of changeRows) {
      if (!changeMap.has(row.supplierProductId)) {
        changeMap.set(row.supplierProductId, row.changePercentage);
      }
    }

    // Favorites
    const links = await linkRepo().find({
      where: { commerceId },
    });
    for (const link of links) {
      favoriteMap.set(link.supplierProductId, link.isFavorite);
    }
  }

  const data = products.map((p) => ({
    ...p,
    unitCost: unitCostMap.get(p.id) ?? null,
    changePercentage: changeMap.get(p.id) ?? null,
    isFavorite: favoriteMap.get(p.id) ?? false,
  }));

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

  // Get favorite status
  const link = await linkRepo().findOne({ where: { supplierProductId: id, commerceId } });

  return {
    ...product,
    unitCost: priceRow?.unitCost ?? null,
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
