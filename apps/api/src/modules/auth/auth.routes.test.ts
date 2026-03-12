import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createMockRepository } from '../../test/mocks/mock-repository';
import { createUserFixture } from '../../test/fixtures/entities';

vi.mock('../../config/data-source', () => ({
  AppDataSource: { getRepository: vi.fn() },
}));
vi.mock('../../config', () => ({
  config: {
    jwt: { secret: 'test-secret', accessExpiry: '15m', refreshExpiry: '7d' },
    cors: { origin: '*' },
    logLevel: 'error',
  },
}));
vi.mock('bcrypt');
vi.mock('jsonwebtoken');

import { AppDataSource } from '../../config/data-source';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import app from '../../app';

describe('auth routes', () => {
  let mockRepo: ReturnType<typeof createMockRepository>;

  beforeEach(() => {
    mockRepo = createMockRepository();
    vi.mocked(AppDataSource.getRepository).mockReturnValue(mockRepo as never);
    vi.clearAllMocks();
    vi.mocked(AppDataSource.getRepository).mockReturnValue(mockRepo as never);
  });

  describe('POST /api/v1/auth/login', () => {
    it('should return 400 for invalid email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'bad', password: 'pass' });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
      expect(res.body.errors).toBeDefined();
    });

    it('should return 400 for missing password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@test.com', password: '' });

      expect(res.status).toBe(400);
    });

    it('should return 401 for wrong credentials', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'no@user.com', password: 'pass' });

      expect(res.status).toBe(401);
    });

    it('should return 200 with token on valid login', async () => {
      const user = createUserFixture();
      mockRepo.findOne.mockResolvedValue(user);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      vi.mocked(jwt.sign)
        .mockReturnValueOnce('access-token' as never)
        .mockReturnValueOnce('refresh-token' as never);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'pass' });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBe('access-token');
      expect(res.body.data.user).toBeDefined();
      expect(res.headers['set-cookie']).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/register', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'New', email: 'new@test.com', password: 'pass123', role: 'commerce' });

      expect(res.status).toBe(401);
    });

    it('should return 403 for non-admin user', async () => {
      vi.mocked(jwt.verify).mockReturnValue({
        sub: 'u1', role: 'commerce', commerceId: 'c1',
      } as never);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'New', email: 'new@test.com', password: 'pass123', role: 'commerce' });

      expect(res.status).toBe(403);
    });

    it('should return 201 for admin creating user', async () => {
      vi.mocked(jwt.verify).mockReturnValue({
        sub: 'admin-1', role: 'admin', commerceId: null,
      } as never);
      mockRepo.findOne.mockResolvedValue(null);
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed' as never);
      mockRepo.save.mockImplementation(async (e: unknown) => ({
        ...(e as object), id: 'new-id', createdAt: new Date(), updatedAt: new Date(),
      }));

      const res = await request(app)
        .post('/api/v1/auth/register')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'New', email: 'new@test.com', password: 'pass123', role: 'commerce' });

      expect(res.status).toBe(201);
      expect(res.body.data.email).toBe('new@test.com');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should return 401 without refresh cookie', async () => {
      const res = await request(app).post('/api/v1/auth/refresh');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('No refresh token');
    });

    it('should return 200 with new access token', async () => {
      vi.mocked(jwt.verify).mockReturnValue({ sub: 'u1', type: 'refresh' } as never);
      mockRepo.findOne.mockResolvedValue(createUserFixture());
      vi.mocked(jwt.sign).mockReturnValue('new-access' as never);

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', 'refreshToken=valid-rt');

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBe('new-access');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
    });

    it('should return 200 with user data', async () => {
      vi.mocked(jwt.verify).mockReturnValue({
        sub: 'u1', role: 'commerce', commerceId: 'c1',
      } as never);
      const user = createUserFixture({ commerce: { id: 'c1', name: 'Test Commerce' } });
      mockRepo.findOne.mockResolvedValue(user);

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('test@example.com');
      expect(res.body.data).not.toHaveProperty('passwordHash');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should return 200 and clear cookie', async () => {
      vi.mocked(jwt.verify).mockReturnValue({
        sub: 'u1', role: 'commerce', commerceId: 'c1',
      } as never);

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logged out');
    });
  });
});
