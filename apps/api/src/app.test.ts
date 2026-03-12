import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

// Mock data-source before app imports it
vi.mock('./config/data-source', () => ({
  AppDataSource: { getRepository: vi.fn() },
}));

import app from './app';

describe('app', () => {
  it('GET /api/v1/health should return 200 with status ok', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });
});
