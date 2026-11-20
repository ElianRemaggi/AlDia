import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRepository } from '../../test/mocks/mock-repository';
import { createCommerceFixture, createUserFixture } from '../../test/fixtures/entities';

vi.mock('../../config/data-source', () => ({
  AppDataSource: { getRepository: vi.fn() },
}));
vi.mock('bcrypt', () => ({ default: { hash: vi.fn().mockResolvedValue('hashed') } }));

import bcrypt from 'bcrypt';
import { AppDataSource } from '../../config/data-source';
import { Commerce } from '../commerce/entities/commerce.entity';
import {
  createUser,
  deactivateUser,
  getUser,
  listUsers,
  updateUser,
} from './user.service';

const ADMIN_ID = 'admin-uuid-1';

describe('user.service', () => {
  let userRepo: ReturnType<typeof createMockRepository>;
  let commerceRepo: ReturnType<typeof createMockRepository>;

  beforeEach(() => {
    vi.clearAllMocks();
    userRepo = createMockRepository();
    commerceRepo = createMockRepository();
    userRepo.save.mockImplementation(async (u: unknown) => u);
    vi.mocked(bcrypt.hash).mockResolvedValue('hashed' as never);
    vi.mocked(AppDataSource.getRepository).mockImplementation(
      (entity) => (entity === Commerce ? commerceRepo : userRepo) as never,
    );
  });

  describe('listUsers', () => {
    it('should paginate, filter and strip password hashes', async () => {
      userRepo.findAndCount.mockResolvedValue([[createUserFixture()], 1]);

      const result = await listUsers({ page: 2, limit: 10, role: 'commerce', isActive: true });

      expect(userRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { role: 'commerce', isActive: true },
          relations: ['commerce'],
          skip: 10,
          take: 10,
        }),
      );
      expect(result.meta).toEqual({ total: 1, page: 2, limit: 10, totalPages: 1 });
      expect(result.data[0]).not.toHaveProperty('passwordHash');
    });

    it('should search by name OR email', async () => {
      userRepo.findAndCount.mockResolvedValue([[], 0]);

      await listUsers({ page: 1, limit: 20, search: 'ana' });

      const { where } = userRepo.findAndCount.mock.calls[0][0];
      expect(where).toHaveLength(2);
      expect(where[0]).toHaveProperty('name');
      expect(where[1]).toHaveProperty('email');
    });
  });

  describe('getUser', () => {
    it('should return the user without password hash', async () => {
      userRepo.findOne.mockResolvedValue(createUserFixture());
      const user = await getUser('user-uuid-1');
      expect(user).not.toHaveProperty('passwordHash');
      expect(user.email).toBe('test@example.com');
    });

    it('should throw 404 when missing', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(getUser('nope')).rejects.toThrow('User not found');
    });
  });

  describe('createUser', () => {
    const commerceDto = {
      name: 'Ana',
      email: 'ana@test.com',
      password: 'secret1',
      role: 'commerce' as const,
      commerceId: 'commerce-uuid-1',
    };

    it('should create a commerce user with hashed password', async () => {
      userRepo.findOne.mockResolvedValue(null); // email free + no active user in commerce
      commerceRepo.findOne.mockResolvedValue(createCommerceFixture());

      const user = await createUser(commerceDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('secret1', 12);
      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ passwordHash: 'hashed', commerceId: 'commerce-uuid-1' }),
      );
      expect(user).not.toHaveProperty('passwordHash');
    });

    it('should reject a duplicate email', async () => {
      userRepo.findOne.mockResolvedValue(createUserFixture({ email: 'ana@test.com' }));
      await expect(createUser(commerceDto)).rejects.toThrow('Email already in use');
    });

    it('should require commerceId for commerce users', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(createUser({ ...commerceDto, commerceId: null })).rejects.toThrow(
        'commerceId is required',
      );
    });

    it('should reject an unknown commerce', async () => {
      userRepo.findOne.mockResolvedValue(null);
      commerceRepo.findOne.mockResolvedValue(null);
      await expect(createUser(commerceDto)).rejects.toThrow('Commerce not found');
    });

    it('should allow only one active user per commerce', async () => {
      userRepo.findOne
        .mockResolvedValueOnce(null) // email free
        .mockResolvedValueOnce(createUserFixture({ id: 'other' })); // commerce taken
      commerceRepo.findOne.mockResolvedValue(createCommerceFixture());

      await expect(createUser(commerceDto)).rejects.toThrow('Commerce already has an active user');
    });

    it('should never attach a commerce to an admin', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await createUser({ ...commerceDto, role: 'admin' });

      expect(userRepo.create).toHaveBeenCalledWith(expect.objectContaining({ commerceId: null }));
      expect(commerceRepo.findOne).not.toHaveBeenCalled();
    });
  });

  describe('updateUser', () => {
    it('should update name and rehash a new password', async () => {
      userRepo.findOne.mockResolvedValue(createUserFixture());

      const user = await updateUser('user-uuid-1', { name: 'Nuevo', password: 'newpass' }, ADMIN_ID);

      expect(user.name).toBe('Nuevo');
      expect(bcrypt.hash).toHaveBeenCalledWith('newpass', 12);
      expect(userRepo.save).toHaveBeenCalledWith(expect.objectContaining({ passwordHash: 'hashed' }));
    });

    it('should reject an email used by another user', async () => {
      userRepo.findOne
        .mockResolvedValueOnce(createUserFixture())
        .mockResolvedValueOnce(createUserFixture({ id: 'other', email: 'taken@test.com' }));

      await expect(
        updateUser('user-uuid-1', { email: 'taken@test.com' }, ADMIN_ID),
      ).rejects.toThrow('Email already in use');
    });

    it('should clear the commerce when promoting to admin', async () => {
      userRepo.findOne.mockResolvedValue(createUserFixture());

      const user = await updateUser('user-uuid-1', { role: 'admin' }, ADMIN_ID);

      expect(user.role).toBe('admin');
      expect(user.commerceId).toBeNull();
    });

    it('should re-check the commerce slot when reactivating a user', async () => {
      userRepo.findOne
        .mockResolvedValueOnce(createUserFixture({ isActive: false }))
        .mockResolvedValueOnce(createUserFixture({ id: 'replacement' }));
      commerceRepo.findOne.mockResolvedValue(createCommerceFixture());

      await expect(updateUser('user-uuid-1', { isActive: true }, ADMIN_ID)).rejects.toThrow(
        'Commerce already has an active user',
      );
    });

    it('should not let an admin deactivate or demote themselves', async () => {
      userRepo.findOne.mockResolvedValue(createUserFixture({ id: ADMIN_ID, role: 'admin', commerceId: null }));

      await expect(updateUser(ADMIN_ID, { isActive: false }, ADMIN_ID)).rejects.toThrow(
        'cannot deactivate your own account',
      );
      await expect(updateUser(ADMIN_ID, { role: 'commerce' }, ADMIN_ID)).rejects.toThrow(
        'cannot change your own role',
      );
    });

    it('should throw 404 when missing', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(updateUser('nope', { name: 'x' }, ADMIN_ID)).rejects.toThrow('User not found');
    });
  });

  describe('deactivateUser', () => {
    it('should soft delete by setting isActive=false', async () => {
      userRepo.findOne.mockResolvedValue(createUserFixture());

      const user = await deactivateUser('user-uuid-1', ADMIN_ID);

      expect(user.isActive).toBe(false);
      expect(userRepo.delete).not.toHaveBeenCalled();
    });
  });
});
