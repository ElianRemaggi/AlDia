import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRepository } from '../../test/mocks/mock-repository';
import { createUserFixture } from '../../test/fixtures/entities';

vi.mock('../../config/data-source', () => ({
  AppDataSource: { getRepository: vi.fn() },
}));
vi.mock('../../config', () => ({
  config: {
    jwt: { secret: 'test-secret', accessExpiry: '15m', refreshExpiry: '7d' },
  },
}));
vi.mock('bcrypt');
vi.mock('jsonwebtoken');

import { AppDataSource } from '../../config/data-source';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { login, register, refresh, getMe } from './auth.service';

describe('auth.service', () => {
  let mockRepo: ReturnType<typeof createMockRepository>;

  beforeEach(() => {
    mockRepo = createMockRepository();
    vi.mocked(AppDataSource.getRepository).mockReturnValue(mockRepo as never);
  });

  describe('login', () => {
    it('should throw 401 when user not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(login({ email: 'no@user.com', password: 'pass' }))
        .rejects.toThrow('Invalid credentials');
    });

    it('should throw 401 when user is inactive', async () => {
      mockRepo.findOne.mockResolvedValue(createUserFixture({ isActive: false }));

      await expect(login({ email: 'test@example.com', password: 'pass' }))
        .rejects.toThrow('Invalid credentials');
    });

    it('should throw 401 when password does not match', async () => {
      mockRepo.findOne.mockResolvedValue(createUserFixture());
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(login({ email: 'test@example.com', password: 'wrong' }))
        .rejects.toThrow('Invalid credentials');
    });

    it('should return user without passwordHash and tokens on success', async () => {
      const user = createUserFixture();
      mockRepo.findOne.mockResolvedValue(user);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      vi.mocked(jwt.sign)
        .mockReturnValueOnce('access-token' as never)
        .mockReturnValueOnce('refresh-token' as never);

      const result = await login({ email: 'test@example.com', password: 'pass' });

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should call jwt.sign with correct payload for access token', async () => {
      const user = createUserFixture({ id: 'uid-1', role: 'admin', commerceId: null });
      mockRepo.findOne.mockResolvedValue(user);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      vi.mocked(jwt.sign).mockReturnValue('token' as never);

      await login({ email: 'test@example.com', password: 'pass' });

      expect(jwt.sign).toHaveBeenCalledWith(
        { sub: 'uid-1', role: 'admin', commerceId: null },
        'test-secret',
        expect.objectContaining({}),
      );
    });
  });

  describe('register', () => {
    it('should throw 409 when email already exists', async () => {
      mockRepo.findOne.mockResolvedValue(createUserFixture());

      await expect(register({
        name: 'New', email: 'test@example.com', password: 'pass123', role: 'commerce',
      })).rejects.toThrow('Email already in use');
    });

    it('should hash password with bcrypt salt rounds 12', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed' as never);
      mockRepo.save.mockImplementation(async (e: unknown) => e);

      await register({
        name: 'New', email: 'new@test.com', password: 'mypass', role: 'admin',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('mypass', 12);
    });

    it('should return user without passwordHash', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed' as never);
      mockRepo.save.mockImplementation(async (e: unknown) => ({
        ...(e as object), id: 'new-id', createdAt: new Date(), updatedAt: new Date(),
      }));

      const result = await register({
        name: 'New', email: 'new@test.com', password: 'mypass', role: 'admin',
      });

      expect(result).not.toHaveProperty('passwordHash');
      expect(result.email).toBe('new@test.com');
    });

    it('should set commerceId to null when not provided', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed' as never);
      mockRepo.save.mockImplementation(async (e: unknown) => e);

      await register({
        name: 'New', email: 'new@test.com', password: 'mypass', role: 'admin',
      });

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ commerceId: null }),
      );
    });
  });

  describe('refresh', () => {
    it('should throw 401 when jwt.verify fails', async () => {
      vi.mocked(jwt.verify).mockImplementation(() => { throw new Error('expired'); });

      await expect(refresh('bad-token')).rejects.toThrow('Invalid or expired refresh token');
    });

    it('should throw 401 when token type is not refresh', async () => {
      vi.mocked(jwt.verify).mockReturnValue({ sub: 'uid', type: 'access' } as never);

      await expect(refresh('access-token')).rejects.toThrow('Invalid token type');
    });

    it('should throw 401 when user not found or inactive', async () => {
      vi.mocked(jwt.verify).mockReturnValue({ sub: 'uid', type: 'refresh' } as never);
      mockRepo.findOne.mockResolvedValue(null);

      await expect(refresh('valid-refresh')).rejects.toThrow('User not found or inactive');
    });

    it('should return new accessToken on success', async () => {
      vi.mocked(jwt.verify).mockReturnValue({ sub: 'uid', type: 'refresh' } as never);
      mockRepo.findOne.mockResolvedValue(createUserFixture());
      vi.mocked(jwt.sign).mockReturnValue('new-access-token' as never);

      const result = await refresh('valid-refresh');

      expect(result.accessToken).toBe('new-access-token');
    });
  });

  describe('getMe', () => {
    it('should throw 404 when user not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(getMe('nonexistent')).rejects.toThrow('User not found');
    });

    it('should return user with commerce relation, without passwordHash', async () => {
      const user = createUserFixture({ commerce: { id: 'c1', name: 'Commerce' } });
      mockRepo.findOne.mockResolvedValue(user);

      const result = await getMe('user-uuid-1');

      expect(result).not.toHaveProperty('passwordHash');
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1' },
        relations: ['commerce'],
      });
    });
  });
});
