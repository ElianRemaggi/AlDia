import { Request, Response } from 'express';
import * as notificationService from './notification.service';
import { listNotificationsQuerySchema } from './notification.dto';
import { AppError } from '../../shared/middleware';

function getCommerceId(req: Request): string {
  if (!req.user?.commerceId) {
    throw new AppError('Commerce scope required', 400);
  }
  return req.user.commerceId;
}

export async function listHandler(req: Request, res: Response): Promise<void> {
  const commerceId = getCommerceId(req);
  const query = listNotificationsQuerySchema.parse(req.query);
  const result = await notificationService.listNotifications(commerceId, query);
  res.json({ status: 'success', ...result });
}

export async function unreadCountHandler(req: Request, res: Response): Promise<void> {
  const commerceId = getCommerceId(req);
  const result = await notificationService.getUnreadCount(commerceId);
  res.json({ status: 'success', data: result });
}

export async function markAsReadHandler(req: Request, res: Response): Promise<void> {
  const commerceId = getCommerceId(req);
  const notification = await notificationService.markAsRead(req.params.id, commerceId);
  res.json({ status: 'success', data: notification });
}

export async function markAllReadHandler(req: Request, res: Response): Promise<void> {
  const commerceId = getCommerceId(req);
  await notificationService.markAllRead(commerceId);
  res.json({ status: 'success', message: 'All notifications marked as read' });
}
