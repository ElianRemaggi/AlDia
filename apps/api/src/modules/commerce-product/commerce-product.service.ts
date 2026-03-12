import { AppDataSource } from '../../config/data-source';
import { CommerceProduct } from './entities/commerce-product.entity';
import { CommerceProductSupplierLink } from './entities/commerce-product-supplier-link.entity';
import { AppError } from '../../shared/middleware';
import {
  CreateCommerceProductDto,
  UpdateCommerceProductDto,
  AddSupplierLinkDto,
} from './commerce-product.dto';

const commerceProductRepo = () => AppDataSource.getRepository(CommerceProduct);
const linkRepo = () => AppDataSource.getRepository(CommerceProductSupplierLink);

export async function listCommerceProducts(
  commerceId: string,
  page: number,
  limit: number,
) {
  const [data, total] = await commerceProductRepo().findAndCount({
    where: { commerceId },
    order: { name: 'ASC' },
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

export async function createCommerceProduct(
  commerceId: string,
  dto: CreateCommerceProductDto,
): Promise<CommerceProduct> {
  const product = commerceProductRepo().create({
    commerceId,
    name: dto.name,
    internalCode: dto.internalCode ?? null,
    description: dto.description ?? null,
    category: dto.category ?? null,
    isActive: true,
  });
  return commerceProductRepo().save(product);
}

export async function getCommerceProduct(
  id: string,
  commerceId: string,
): Promise<CommerceProduct & { links: CommerceProductSupplierLink[] }> {
  const product = await commerceProductRepo().findOne({ where: { id, commerceId } });
  if (!product) {
    throw new AppError('Commerce product not found', 404);
  }

  const links = await linkRepo().find({
    where: { commerceProductId: id, commerceId },
  });

  return { ...product, links };
}

export async function updateCommerceProduct(
  id: string,
  commerceId: string,
  dto: UpdateCommerceProductDto,
): Promise<CommerceProduct> {
  const product = await commerceProductRepo().findOne({ where: { id, commerceId } });
  if (!product) {
    throw new AppError('Commerce product not found', 404);
  }

  Object.assign(product, {
    ...(dto.name !== undefined && { name: dto.name }),
    ...(dto.internalCode !== undefined && { internalCode: dto.internalCode }),
    ...(dto.description !== undefined && { description: dto.description }),
    ...(dto.category !== undefined && { category: dto.category }),
    ...(dto.isActive !== undefined && { isActive: dto.isActive }),
  });

  return commerceProductRepo().save(product);
}

export async function deleteCommerceProduct(id: string, commerceId: string): Promise<void> {
  const product = await commerceProductRepo().findOne({ where: { id, commerceId } });
  if (!product) {
    throw new AppError('Commerce product not found', 404);
  }
  product.isActive = false;
  await commerceProductRepo().save(product);
}

export async function addSupplierLink(
  commerceProductId: string,
  commerceId: string,
  dto: AddSupplierLinkDto,
): Promise<CommerceProductSupplierLink> {
  // Verify commerce product exists in this commerce
  const product = await commerceProductRepo().findOne({
    where: { id: commerceProductId, commerceId },
  });
  if (!product) {
    throw new AppError('Commerce product not found', 404);
  }

  // Check if a link already exists for this supplier product in this commerce
  const existing = await linkRepo().findOne({
    where: { supplierProductId: dto.supplierProductId, commerceId },
  });

  if (existing) {
    // Update the commerce product link and optionally favorite
    existing.commerceProductId = commerceProductId;
    if (dto.isFavorite !== undefined) {
      existing.isFavorite = dto.isFavorite;
    }
    return linkRepo().save(existing);
  }

  const link = linkRepo().create({
    commerceId,
    commerceProductId,
    supplierProductId: dto.supplierProductId,
    isFavorite: dto.isFavorite ?? false,
  });
  return linkRepo().save(link);
}

export async function removeSupplierLink(
  commerceProductId: string,
  linkId: string,
  commerceId: string,
): Promise<void> {
  const link = await linkRepo().findOne({
    where: { id: linkId, commerceProductId, commerceId },
  });
  if (!link) {
    throw new AppError('Supplier link not found', 404);
  }
  await linkRepo().delete({ id: linkId });
}
