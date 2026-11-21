import { Request, Response } from 'express';
import * as dashboardService from './dashboard.service';
import { AppError } from '../../shared/middleware';

export async function commerceSummaryHandler(req: Request, res: Response): Promise<void> {
  if (!req.user?.commerceId) {
    throw new AppError('Commerce scope required', 400);
  }
  const data = await dashboardService.getCommerceSummary(req.user.commerceId);
  res.json({ status: 'success', data });
}

export async function adminSummaryHandler(_req: Request, res: Response): Promise<void> {
  const data = await dashboardService.getAdminSummary();
  res.json({ status: 'success', data });
}
