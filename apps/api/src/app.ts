import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { AppDataSource } from './config/data-source';
import { errorHandler } from './shared/middleware';

import authRoutes from './modules/auth/auth.routes';
import commerceRoutes from './modules/commerce/commerce.routes';
import supplierRoutes from './modules/supplier/supplier.routes';
import { priceListRouter, importJobRouter } from './modules/import/import.routes';
import catalogRoutes from './modules/catalog/catalog.routes';
import commerceProductRoutes from './modules/commerce-product/commerce-product.routes';
import markupRoutes from './modules/markup/markup.routes';
import purchaseRoutes from './modules/purchase/purchase.routes';
import notificationRoutes from './modules/notification/notification.routes';
import adminUserRoutes from './modules/user/user.routes';
import { dashboardRouter, adminDashboardRouter } from './modules/dashboard/dashboard.routes';

const app = express();

// In production the API sits behind one reverse proxy (Caddy): trust its X-Forwarded-* headers.
app.set('trust proxy', 1);

// Global middleware
app.use(helmet());
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(express.json({ limit: '20mb' }));
app.use(cookieParser());

// Health check: used by the container healthcheck, so it must reflect the DB connection.
app.get('/api/v1/health', async (_req, res) => {
  let database: 'ok' | 'down' = 'ok';
  try {
    await AppDataSource.query('SELECT 1');
  } catch {
    database = 'down';
  }
  res.status(database === 'ok' ? 200 : 503).json({
    status: database === 'ok' ? 'ok' : 'error',
    database,
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/commerces', commerceRoutes);
app.use('/api/v1/suppliers', supplierRoutes);
app.use('/api/v1/suppliers/:supplierId/price-lists', priceListRouter);
app.use('/api/v1/import-jobs', importJobRouter);
app.use('/api/v1/products', catalogRoutes);
app.use('/api/v1/commerce-products', commerceProductRoutes);
app.use('/api/v1/markup-rules', markupRoutes);
app.use('/api/v1/purchase-lists', purchaseRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/admin/users', adminUserRoutes);
app.use('/api/v1/dashboard', dashboardRouter);
app.use('/api/v1/admin/dashboard', adminDashboardRouter);

// Error handling
app.use(errorHandler);

export default app;
