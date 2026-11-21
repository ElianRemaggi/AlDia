import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../../config/data-source', () => ({
  AppDataSource: { getRepository: vi.fn(), query: vi.fn() },
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
import { getAdminSummary, getCommerceSummary } from './dashboard.service';

const asCommerce = () =>
  vi.mocked(jwt.verify).mockReturnValue({ sub: 'u-1', role: 'commerce', commerceId: 'com-1' } as never);
const asAdmin = () =>
  vi.mocked(jwt.verify).mockReturnValue({ sub: 'admin-1', role: 'admin', commerceId: null } as never);
const query = () => vi.mocked(AppDataSource.query);

const change = (id: string, pct: string) => ({
  id: `ev-${id}`,
  supplier_product_id: id,
  product_name: `Producto ${id}`,
  supplier_id: 'sup-1',
  supplier_name: 'Distribuidora Central',
  old_price: '100.00',
  new_price: '120.00',
  change_percentage: pct,
  created_at: new Date('2026-11-19T10:00:00Z'),
});

function mockCommerceQueries() {
  query()
    .mockResolvedValueOnce([
      {
        active_suppliers: 3,
        total_products: 120,
        recent_imports: 2,
        pending_imports: 1,
        recent_price_changes: 15,
        active_purchase_lists: 1,
      },
    ])
    .mockResolvedValueOnce([change('p1', '20.00'), change('p2', '-12.50')])
    .mockResolvedValueOnce([
      {
        id: 'pl-1',
        supplier_id: 'sup-1',
        supplier_name: 'Distribuidora Central',
        source_file_name: 'lista.xlsx',
        status: 'processed',
        version_number: 3,
        item_count: 42,
        error_message: 'stale error from a retried job',
        uploaded_at: new Date(),
        processed_at: new Date(),
      },
      {
        id: 'pl-2',
        supplier_id: 'sup-2',
        supplier_name: 'Lacteos Premium',
        source_file_name: 'roto.xlsx',
        status: 'failed',
        version_number: 1,
        item_count: 0,
        error_message: 'File is not a zip file',
        uploaded_at: new Date(),
        processed_at: null,
      },
    ])
    .mockResolvedValueOnce([change('p1', '20.00')]);
}

describe('dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCommerceSummary', () => {
    it('scopes every query to the commerce and maps rows to camelCase numbers', async () => {
      mockCommerceQueries();
      const summary = await getCommerceSummary('com-1');

      expect(query()).toHaveBeenCalledTimes(4);
      for (const [, params] of query().mock.calls) expect(params).toEqual(['com-1']);

      expect(summary.stats).toEqual({
        activeSuppliers: 3,
        totalProducts: 120,
        recentImports: 2,
        pendingImports: 1,
        recentPriceChanges: 15,
        activePurchaseLists: 1,
      });
      expect(summary.recentChanges[1]).toMatchObject({
        supplierProductId: 'p2',
        productName: 'Producto p2',
        oldPrice: 100,
        newPrice: 120,
        changePercentage: -12.5,
      });
      expect(summary.favoriteAlerts).toHaveLength(1);
      expect(summary.windows).toEqual({ recentImportDays: 7, recentChangeDays: 30 });
    });

    it('only exposes the job error for failed imports', async () => {
      mockCommerceQueries();
      const { recentImports } = await getCommerceSummary('com-1');
      expect(recentImports[0]).toMatchObject({ status: 'processed', itemCount: 42, errorMessage: null });
      expect(recentImports[1]).toMatchObject({ status: 'failed', errorMessage: 'File is not a zip file' });
    });

    it('ranks changes by magnitude and keeps one row per product', () => {
      // Contract of the SQL itself: DISTINCT ON product + ORDER BY abs(change)
      mockCommerceQueries();
      return getCommerceSummary('com-1').then(() => {
        const sql = query().mock.calls[1][0] as string;
        expect(sql).toContain('DISTINCT ON (pce.supplier_product_id)');
        expect(sql).toContain('ORDER BY abs(c.change_percentage) DESC');
        const favSql = query().mock.calls[3][0] as string;
        expect(favSql).toContain('l.is_favorite');
      });
    });
  });

  describe('getAdminSummary', () => {
    it('groups platform stats', async () => {
      query()
        .mockResolvedValueOnce([
          {
            commerces_total: 4,
            commerces_active: 3,
            users_total: 5,
            users_active: 5,
            products_total: 900,
            imports_total: 10,
            imports_processed: 8,
            imports_failed: 1,
            imports_pending: 1,
          },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: 'com-1',
            name: 'Almacén',
            is_active: true,
            supplier_count: 2,
            product_count: 80,
            recent_imports: 3,
            last_import_at: null,
          },
        ]);

      const summary = await getAdminSummary();
      expect(summary.stats).toEqual({
        commerces: { total: 4, active: 3 },
        users: { total: 5, active: 5 },
        totalProducts: 900,
        imports: { total: 10, processed: 8, failed: 1, pending: 1 },
      });
      expect(summary.commerces[0]).toMatchObject({ name: 'Almacén', isActive: true, recentImports: 3 });
    });
  });

  describe('routes', () => {
    it('401 without auth', async () => {
      expect((await request(app).get('/api/v1/dashboard/summary')).status).toBe(401);
      expect((await request(app).get('/api/v1/admin/dashboard/summary')).status).toBe(401);
    });

    it('commerce summary is commerce-only', async () => {
      asAdmin();
      const res = await request(app).get('/api/v1/dashboard/summary').set('Authorization', 'Bearer t');
      expect(res.status).toBe(403);
    });

    it('admin summary is admin-only', async () => {
      asCommerce();
      const res = await request(app).get('/api/v1/admin/dashboard/summary').set('Authorization', 'Bearer t');
      expect(res.status).toBe(403);
    });

    it('returns the commerce summary', async () => {
      asCommerce();
      mockCommerceQueries();
      const res = await request(app).get('/api/v1/dashboard/summary').set('Authorization', 'Bearer t');
      expect(res.status).toBe(200);
      expect(res.body.data.stats.activeSuppliers).toBe(3);
    });
  });
});
