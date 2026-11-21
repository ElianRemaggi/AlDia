import { Router } from 'express';
import { asyncHandler, authenticate, requireRole } from '../../shared/middleware';
import * as dashboardController from './dashboard.controller';

// Mounted at /api/v1/dashboard
export const dashboardRouter = Router();
dashboardRouter.use(authenticate, requireRole('commerce'));
dashboardRouter.get('/summary', asyncHandler(dashboardController.commerceSummaryHandler));

// Mounted at /api/v1/admin/dashboard
export const adminDashboardRouter = Router();
adminDashboardRouter.use(authenticate, requireRole('admin'));
adminDashboardRouter.get('/summary', asyncHandler(dashboardController.adminSummaryHandler));
