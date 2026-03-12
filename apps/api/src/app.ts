import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { errorHandler } from './shared/middleware';

import authRoutes from './modules/auth/auth.routes';
import commerceRoutes from './modules/commerce/commerce.routes';
import supplierRoutes from './modules/supplier/supplier.routes';

const app = express();

// Global middleware
app.use(helmet());
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(express.json({ limit: '20mb' }));
app.use(cookieParser());

// Health check
app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/commerces', commerceRoutes);
app.use('/api/v1/suppliers', supplierRoutes);

// Error handling
app.use(errorHandler);

export default app;
