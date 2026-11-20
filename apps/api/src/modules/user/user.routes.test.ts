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
    redis: { host: 'localhost', port: 6379, password: undefined },
    storage: { useLocal: true, localUploadsDir: './uploads' },
  },
}));
vi.mock('jsonwebtoken');

import { AppDataSource } from '../../config/data-source';
import jwt from 'jsonwebtoken';
import app from '../../app';

const asAdmin = () =>
  vi.mocked(jwt.verify).mockReturnValue({ sub: 'admin-1', role: 'admin', commerceId: null } as never);

describe('admin user routes', () => {
  let mockRepo: ReturnType<typeof createMockRepository>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo = createMockRepository();
    vi.mocked(AppDataSource.getRepository).mockReturnValue(mockRepo as never);
  });

  it('should return 401 without auth', async () => {
    const res = await request(app).get('/api/v1/admin/users');
    expect(res.status).toBe(401);
  });

  it('should return 403 for commerce users', async () => {
    vi.mocked(jwt.verify).mockReturnValue({ sub: 'u1', role: 'commerce', commerceId: 'c1' } as never);
    const res = await request(app).get('/api/v1/admin/users').set('Authorization', 'Bearer t');
    expect(res.status).toBe(403);
  });

  it('should list users for admins without password hashes', async () => {
    asAdmin();
    mockRepo.findAndCount.mockResolvedValue([[createUserFixture()], 1]);

    const res = await request(app)
      .get('/api/v1/admin/users?role=commerce&page=1')
      .set('Authorization', 'Bearer t');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).not.toHaveProperty('passwordHash');
    expect(res.body.meta.total).toBe(1);
  });

  it('should return 400 for invalid query params', async () => {
    asAdmin();
    const res = await request(app)
      .get('/api/v1/admin/users?role=superuser')
      .set('Authorization', 'Bearer t');
    expect(res.status).toBe(400);
  });

  it('should validate the create body', async () => {
    asAdmin();
    const res = await request(app)
      .post('/api/v1/admin/users')
      .set('Authorization', 'Bearer t')
      .send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  it('should reject an empty PATCH body', async () => {
    asAdmin();
    const res = await request(app)
      .patch('/api/v1/admin/users/user-uuid-1')
      .set('Authorization', 'Bearer t')
      .send({});
    expect(res.status).toBe(400);
  });

  it('should soft delete on DELETE', async () => {
    asAdmin();
    mockRepo.findOne.mockResolvedValue(createUserFixture());
    mockRepo.save.mockImplementation(async (u: unknown) => u);

    const res = await request(app)
      .delete('/api/v1/admin/users/user-uuid-1')
      .set('Authorization', 'Bearer t');

    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(false);
    expect(mockRepo.delete).not.toHaveBeenCalled();
  });
});
