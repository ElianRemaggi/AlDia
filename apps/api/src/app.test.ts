import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

// Mock data-source before app imports it
vi.mock('./config/data-source', () => ({
  AppDataSource: { getRepository: vi.fn(), query: vi.fn() },
}));

import { AppDataSource } from './config/data-source';
import app from './app';

describe('app', () => {
  it('GET /api/v1/health should return 200 with status ok', async () => {
    vi.mocked(AppDataSource.query).mockResolvedValueOnce([{ '?column?': 1 }]);
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });

  it('GET /api/v1/health should return 503 when the database is unreachable', async () => {
    vi.mocked(AppDataSource.query).mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ status: 'error', database: 'down' });
  });
});
