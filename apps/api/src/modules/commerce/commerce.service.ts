import { AppDataSource } from '../../config/data-source';
import { Commerce } from './entities/commerce.entity';
import { AppError } from '../../shared/middleware';
import { CreateCommerceDto, UpdateCommerceDto } from './commerce.dto';

const commerceRepo = () => AppDataSource.getRepository(Commerce);

export async function list() {
  return commerceRepo().find({ order: { createdAt: 'DESC' } });
}

export async function getById(id: string) {
  const commerce = await commerceRepo().findOne({ where: { id } });
  if (!commerce) {
    throw new AppError('Commerce not found', 404);
  }
  return commerce;
}

export async function create(dto: CreateCommerceDto) {
  if (dto.identifier) {
    const existing = await commerceRepo().findOne({ where: { identifier: dto.identifier } });
    if (existing) {
      throw new AppError('Identifier already in use', 409);
    }
  }

  const commerce = commerceRepo().create({
    name: dto.name,
    identifier: dto.identifier ?? null,
    email: dto.email ?? null,
    phone: dto.phone ?? null,
  });

  return commerceRepo().save(commerce);
}

export async function update(id: string, dto: UpdateCommerceDto) {
  const commerce = await getById(id);

  if (dto.identifier !== undefined && dto.identifier !== commerce.identifier) {
    if (dto.identifier) {
      const existing = await commerceRepo().findOne({ where: { identifier: dto.identifier } });
      if (existing && existing.id !== id) {
        throw new AppError('Identifier already in use', 409);
      }
    }
  }

  Object.assign(commerce, dto);
  return commerceRepo().save(commerce);
}
