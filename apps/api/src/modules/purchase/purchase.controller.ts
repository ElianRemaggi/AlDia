import { Request, Response } from 'express';
import * as purchaseService from './purchase.service';
import {
  createPurchaseListSchema,
  updatePurchaseListSchema,
  addPurchaseItemSchema,
  updatePurchaseItemSchema,
} from './purchase.dto';
import { AppError } from '../../shared/middleware';

function getCommerceId(req: Request): string {
  if (!req.user?.commerceId) {
    throw new AppError('Commerce scope required', 400);
  }
  return req.user.commerceId;
}

export async function listHandler(req: Request, res: Response): Promise<void> {
  const commerceId = getCommerceId(req);
  const page = parseInt(String(req.query.page ?? '1'), 10);
  const limit = Math.min(parseInt(String(req.query.limit ?? '20'), 10), 100);
  const result = await purchaseService.listPurchaseLists(commerceId, page, limit);
  res.json({ status: 'success', ...result });
}

export async function createHandler(req: Request, res: Response): Promise<void> {
  const commerceId = getCommerceId(req);
  const dto = createPurchaseListSchema.parse(req.body);
  const list = await purchaseService.createPurchaseList(commerceId, dto);
  res.status(201).json({ status: 'success', data: list });
}

export async function getByIdHandler(req: Request, res: Response): Promise<void> {
  const commerceId = getCommerceId(req);
  const list = await purchaseService.getPurchaseList(req.params.id, commerceId);
  res.json({ status: 'success', data: list });
}

export async function updateHandler(req: Request, res: Response): Promise<void> {
  const commerceId = getCommerceId(req);
  const dto = updatePurchaseListSchema.parse(req.body);
  const list = await purchaseService.updatePurchaseList(req.params.id, commerceId, dto);
  res.json({ status: 'success', data: list });
}

export async function deleteHandler(req: Request, res: Response): Promise<void> {
  const commerceId = getCommerceId(req);
  await purchaseService.deletePurchaseList(req.params.id, commerceId);
  res.json({ status: 'success', message: 'Purchase list deleted' });
}

export async function addItemHandler(req: Request, res: Response): Promise<void> {
  const commerceId = getCommerceId(req);
  const dto = addPurchaseItemSchema.parse(req.body);
  const item = await purchaseService.addPurchaseItem(req.params.id, commerceId, dto);
  res.status(201).json({ status: 'success', data: item });
}

export async function updateItemHandler(req: Request, res: Response): Promise<void> {
  const commerceId = getCommerceId(req);
  const dto = updatePurchaseItemSchema.parse(req.body);
  const item = await purchaseService.updatePurchaseItem(
    req.params.id,
    req.params.itemId,
    commerceId,
    dto,
  );
  res.json({ status: 'success', data: item });
}

export async function removeItemHandler(req: Request, res: Response): Promise<void> {
  const commerceId = getCommerceId(req);
  await purchaseService.removePurchaseItem(req.params.id, req.params.itemId, commerceId);
  res.json({ status: 'success', message: 'Item removed' });
}

export async function exportWhatsAppHandler(req: Request, res: Response): Promise<void> {
  const commerceId = getCommerceId(req);
  const text = await purchaseService.exportToWhatsApp(req.params.id, commerceId);
  res.json({ status: 'success', data: { text } });
}
