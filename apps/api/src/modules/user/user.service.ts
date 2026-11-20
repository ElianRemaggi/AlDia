import bcrypt from 'bcrypt';
import { FindOptionsWhere, ILike, Not } from 'typeorm';
import { AppDataSource } from '../../config/data-source';
import { User } from '../auth/entities/user.entity';
import { Commerce } from '../commerce/entities/commerce.entity';
import { AppError } from '../../shared/middleware';
import { CreateUserDto, ListUsersQuery, UpdateUserDto } from './user.dto';

const BCRYPT_ROUNDS = 12;

const userRepo = () => AppDataSource.getRepository(User);
const commerceRepo = () => AppDataSource.getRepository(Commerce);

export type PublicUser = Omit<User, 'passwordHash'>;

export function toPublicUser(user: User): PublicUser {
  const { passwordHash: _, ...rest } = user;
  return rest;
}

export async function listUsers(query: ListUsersQuery) {
  const { page, limit, role, commerceId, search, isActive } = query;

  const base: FindOptionsWhere<User> = {};
  if (role) base.role = role;
  if (commerceId) base.commerceId = commerceId;
  if (isActive !== undefined) base.isActive = isActive;

  // search matches name OR email → TypeORM expresses OR as an array of where clauses
  const where = search
    ? [
        { ...base, name: ILike(`%${search}%`) },
        { ...base, email: ILike(`%${search}%`) },
      ]
    : base;

  const [users, total] = await userRepo().findAndCount({
    where,
    relations: ['commerce'],
    order: { createdAt: 'DESC' },
    skip: (page - 1) * limit,
    take: limit,
  });

  return {
    data: users.map(toPublicUser),
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function getUser(id: string): Promise<PublicUser> {
  const user = await userRepo().findOne({ where: { id }, relations: ['commerce'] });
  if (!user) {
    throw new AppError('User not found', 404);
  }
  return toPublicUser(user);
}

export async function createUser(dto: CreateUserDto): Promise<PublicUser> {
  await assertEmailAvailable(dto.email);
  const commerceId = await resolveCommerceAssignment(dto.role, dto.commerceId ?? null);

  const user = userRepo().create({
    name: dto.name,
    email: dto.email,
    passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
    role: dto.role,
    commerceId,
  });
  await userRepo().save(user);
  return toPublicUser(user);
}

export async function updateUser(
  id: string,
  dto: UpdateUserDto,
  actorId: string,
): Promise<PublicUser> {
  const user = await userRepo().findOne({ where: { id } });
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (id === actorId) {
    if (dto.isActive === false) {
      throw new AppError('You cannot deactivate your own account', 422);
    }
    if (dto.role && dto.role !== user.role) {
      throw new AppError('You cannot change your own role', 422);
    }
  }

  if (dto.email && dto.email !== user.email) {
    await assertEmailAvailable(dto.email, id);
    user.email = dto.email;
  }

  // Re-check the role/commerce invariant whenever either side changes,
  // or when an inactive user is reactivated (its commerce may have a new user by now).
  const role = dto.role ?? user.role;
  const requestedCommerceId = dto.commerceId !== undefined ? dto.commerceId : user.commerceId;
  const reactivating = dto.isActive === true && !user.isActive;
  if (dto.role !== undefined || dto.commerceId !== undefined || reactivating) {
    user.commerceId = await resolveCommerceAssignment(role, requestedCommerceId, id);
  }
  user.role = role;

  if (dto.name !== undefined) user.name = dto.name;
  if (dto.isActive !== undefined) user.isActive = dto.isActive;
  if (dto.password) user.passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

  await userRepo().save(user);
  return toPublicUser(user);
}

/** Soft delete: users are deactivated, never removed (they own audit references). */
export async function deactivateUser(id: string, actorId: string): Promise<PublicUser> {
  return updateUser(id, { isActive: false }, actorId);
}

async function assertEmailAvailable(email: string, exceptUserId?: string): Promise<void> {
  const existing = await userRepo().findOne({ where: { email } });
  if (existing && existing.id !== exceptUserId) {
    throw new AppError('Email already in use', 409);
  }
}

/**
 * Admins never belong to a commerce. Commerce users must point to an existing
 * commerce that has no other active user (MVP: one user account per commerce).
 */
async function resolveCommerceAssignment(
  role: User['role'],
  commerceId: string | null,
  exceptUserId?: string,
): Promise<string | null> {
  if (role === 'admin') return null;

  if (!commerceId) {
    throw new AppError('commerceId is required for commerce users', 422);
  }
  const commerce = await commerceRepo().findOne({ where: { id: commerceId } });
  if (!commerce) {
    throw new AppError('Commerce not found', 422);
  }
  const taken = await userRepo().findOne({
    where: {
      commerceId,
      isActive: true,
      ...(exceptUserId ? { id: Not(exceptUserId) } : {}),
    },
  });
  if (taken) {
    throw new AppError('Commerce already has an active user', 409);
  }
  return commerceId;
}
