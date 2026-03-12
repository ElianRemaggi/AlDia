import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createMockRepository } from '../../test/mocks/mock-repository';
import { createCommerceFixture } from '../../test/fixtures/entities';

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
vi.mock('jsonwebtoken');

import { AppDataSource } from '../../config/data-source';
import jwt from 'jsonwebtoken';
import app from '../../app';

describe('commerce routes', () => {
  let mockRepo: ReturnType<typeof createMockRepository>;

  beforeEach(() => {
    mockRepo = createMockRepository();
    vi.mocked(AppDataSource.getRepository).mockReturnValue(mockRepo as never);
    vi.clearAllMocks();
    vi.mocked(AppDataSource.getRepository).mockReturnValue(mockRepo as never);
  });

  describe('GET /api/v1/commerces', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/v1/commerces');

      expect(res.status).toBe(401);
    });

    it('should return 403 for commerce role', async () => {
      vi.mocked(jwt.verify).mockReturnValue({
        sub: 'u1', role: 'commerce', commerceId: 'c1',
      } as never);

      const res = await request(app)
        .get('/api/v1/commerces')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(403);
    });

    it('should return 200 with list for admin', async () => {
      vi.mocked(jwt.verify).mockReturnValue({
        sub: 'u1', role: 'admin', commerceId: null,
      } as never);
      mockRepo.find.mockResolvedValue([createCommerceFixture()]);

      const res = await request(app)
        .get('/api/v1/commerces')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('POST /api/v1/commerces', () => {
    it('should return 400 for missing name', async () => {
      vi.mocked(jwt.verify).mockReturnValue({
        sub: 'u1', role: 'admin', commerceId: null,
      } as never);

      const res = await request(app)
        .post('/api/v1/commerces')
        .set('Authorization', 'Bearer token')
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 201 on valid creation', async () => {
      vi.mocked(jwt.verify).mockReturnValue({
        sub: 'u1', role: 'admin', commerceId: null,
      } as never);
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.save.mockImplementation(async (e: unknown) => ({
        ...(e as object), id: 'new-id', createdAt: new Date(), updatedAt: new Date(),
      }));

      const res = await request(app)
        .post('/api/v1/commerces')
        .set('Authorization', 'Bearer token')
        .send({ name: 'New Commerce' });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('New Commerce');
    });
  });

  describe('GET /api/v1/commerces/:id', () => {
    it('should return 200 with commerce for admin', async () => {
      vi.mocked(jwt.verify).mockReturnValue({
        sub: 'u1', role: 'admin', commerceId: null,
      } as never);
      mockRepo.findOne.mockResolvedValue(createCommerceFixture());

      const res = await request(app)
        .get('/api/v1/commerces/commerce-uuid-1')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Test Commerce');
    });
  });

  describe('PATCH /api/v1/commerces/:id', () => {
    it('should return 200 on valid update', async () => {
      vi.mocked(jwt.verify).mockReturnValue({
        sub: 'u1', role: 'admin', commerceId: null,
      } as never);
      const commerce = createCommerceFixture();
      mockRepo.findOne.mockResolvedValue(commerce);
      mockRepo.save.mockImplementation(async (e: unknown) => e);

      const res = await request(app)
        .patch('/api/v1/commerces/commerce-uuid-1')
        .set('Authorization', 'Bearer token')
        .send({ name: 'Updated' });

      expect(res.status).toBe(200);
    });
  });
});
