import { ILike } from 'typeorm';
import { AppDataSource } from '../../config/data-source';
import { Supplier } from './entities/supplier.entity';
import { AppError } from '../../shared/middleware';
import { CreateSupplierDto, UpdateSupplierDto, ListSuppliersQuery } from './supplier.dto';

const supplierRepo = () => AppDataSource.getRepository(Supplier);

export async function list(commerceId: string, query: ListSuppliersQuery) {
  const { page, limit, search, isActive, sortBy, sortOrder } = query;

  const where: Record<string, unknown> = { commerceId };

  if (isActive !== undefined) {
    where.isActive = isActive === 'true';
  }

  if (search) {
    where.name = ILike(`%${search}%`);
  }

  const [data, total] = await supplierRepo().findAndCount({
    where,
    order: { [sortBy]: sortOrder },
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

export async function getById(id: string, commerceId: string) {
  const supplier = await supplierRepo().findOne({ where: { id, commerceId } });
  if (!supplier) {
    throw new AppError('Supplier not found', 404);
  }
  return supplier;
}

export async function create(commerceId: string, dto: CreateSupplierDto) {
  if (dto.supplierCode) {
    const existing = await supplierRepo().findOne({
      where: { commerceId, supplierCode: dto.supplierCode },
    });
    if (existing) {
      throw new AppError('Supplier code already exists for this commerce', 409);
    }
  }

  const supplier = supplierRepo().create({
    commerceId,
    name: dto.name,
    supplierCode: dto.supplierCode ?? null,
    description: dto.description ?? null,
    contactName: dto.contactName ?? null,
    contactEmail: dto.contactEmail ?? null,
    contactPhone: dto.contactPhone ?? null,
  });

  return supplierRepo().save(supplier);
}

export async function update(id: string, commerceId: string, dto: UpdateSupplierDto) {
  const supplier = await getById(id, commerceId);

  if (dto.supplierCode !== undefined && dto.supplierCode !== supplier.supplierCode) {
    if (dto.supplierCode) {
      const existing = await supplierRepo().findOne({
        where: { commerceId, supplierCode: dto.supplierCode },
      });
      if (existing && existing.id !== id) {
        throw new AppError('Supplier code already exists for this commerce', 409);
      }
    }
  }

  Object.assign(supplier, dto);
  return supplierRepo().save(supplier);
}

export async function softDelete(id: string, commerceId: string) {
  const supplier = await getById(id, commerceId);
  supplier.isActive = false;
  return supplierRepo().save(supplier);
}
