import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createMockRepository } from '../../test/mocks/mock-repository';
import { createSupplierFixture } from '../../test/fixtures/entities';

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

describe('supplier routes', () => {
  let mockRepo: ReturnType<typeof createMockRepository>;

  beforeEach(() => {
    mockRepo = createMockRepository();
    vi.mocked(AppDataSource.getRepository).mockReturnValue(mockRepo as never);
    vi.clearAllMocks();
    vi.mocked(AppDataSource.getRepository).mockReturnValue(mockRepo as never);
  });

  function authAsCommerce() {
    vi.mocked(jwt.verify).mockReturnValue({
      sub: 'u1', role: 'commerce', commerceId: 'c1',
    } as never);
  }

  function authAsAdmin() {
    vi.mocked(jwt.verify).mockReturnValue({
      sub: 'u1', role: 'admin', commerceId: null,
    } as never);
  }

  describe('GET /api/v1/suppliers', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/v1/suppliers');

      expect(res.status).toBe(401);
    });

    it('should return 200 with paginated data for commerce user', async () => {
      authAsCommerce();
      mockRepo.findAndCount.mockResolvedValue([[createSupplierFixture()], 1]);

      const res = await request(app)
        .get('/api/v1/suppliers')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.total).toBe(1);
    });

    it('should support search query param', async () => {
      authAsCommerce();
      mockRepo.findAndCount.mockResolvedValue([[], 0]);

      const res = await request(app)
        .get('/api/v1/suppliers?search=test')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
    });

    it('admin with commerce_id query should scope correctly', async () => {
      authAsAdmin();
      mockRepo.findAndCount.mockResolvedValue([[createSupplierFixture()], 1]);

      const res = await request(app)
        .get('/api/v1/suppliers?commerce_id=target-comm')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/v1/suppliers', () => {
    it('should return 400 for missing name', async () => {
      authAsCommerce();

      const res = await request(app)
        .post('/api/v1/suppliers')
        .set('Authorization', 'Bearer token')
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 201 on valid creation', async () => {
      authAsCommerce();
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.save.mockImplementation(async (e: unknown) => ({
        ...(e as object), id: 'new-id', createdAt: new Date(), updatedAt: new Date(),
      }));

      const res = await request(app)
        .post('/api/v1/suppliers')
        .set('Authorization', 'Bearer token')
        .send({ name: 'New Supplier', supplierCode: 'NS-1' });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('New Supplier');
    });
  });

  describe('GET /api/v1/suppliers/:id', () => {
    it('should return 200 with supplier', async () => {
      authAsCommerce();
      mockRepo.findOne.mockResolvedValue(createSupplierFixture());

      const res = await request(app)
        .get('/api/v1/suppliers/supplier-uuid-1')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Test Supplier');
    });

    it('should return 404 for non-existent supplier', async () => {
      authAsCommerce();
      mockRepo.findOne.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/suppliers/nonexistent')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/suppliers/:id', () => {
    it('should return 200 on valid update', async () => {
      authAsCommerce();
      const supplier = createSupplierFixture();
      mockRepo.findOne.mockResolvedValue(supplier);
      mockRepo.save.mockImplementation(async (e: unknown) => e);

      const res = await request(app)
        .patch('/api/v1/suppliers/supplier-uuid-1')
        .set('Authorization', 'Bearer token')
        .send({ name: 'Updated Supplier' });

      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /api/v1/suppliers/:id', () => {
    it('should return 200 with deactivation message', async () => {
      authAsCommerce();
      const supplier = createSupplierFixture();
      mockRepo.findOne.mockResolvedValue(supplier);
      mockRepo.save.mockImplementation(async (e: unknown) => e);

      const res = await request(app)
        .delete('/api/v1/suppliers/supplier-uuid-1')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Supplier deactivated');
    });
  });
});
