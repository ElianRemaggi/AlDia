import { Request, Response } from 'express';
import * as commerceProductService from './commerce-product.service';
import {
  createCommerceProductSchema,
  updateCommerceProductSchema,
  addSupplierLinkSchema,
} from './commerce-product.dto';
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
  const result = await commerceProductService.listCommerceProducts(commerceId, page, limit);
  res.json({ status: 'success', ...result });
}

export async function createHandler(req: Request, res: Response): Promise<void> {
  const commerceId = getCommerceId(req);
  const dto = createCommerceProductSchema.parse(req.body);
  const product = await commerceProductService.createCommerceProduct(commerceId, dto);
  res.status(201).json({ status: 'success', data: product });
}

export async function getByIdHandler(req: Request, res: Response): Promise<void> {
  const commerceId = getCommerceId(req);
  const product = await commerceProductService.getCommerceProduct(req.params.id, commerceId);
  res.json({ status: 'success', data: product });
}

export async function updateHandler(req: Request, res: Response): Promise<void> {
  const commerceId = getCommerceId(req);
  const dto = updateCommerceProductSchema.parse(req.body);
  const product = await commerceProductService.updateCommerceProduct(
    req.params.id,
    commerceId,
    dto,
  );
  res.json({ status: 'success', data: product });
}

export async function deleteHandler(req: Request, res: Response): Promise<void> {
  const commerceId = getCommerceId(req);
  await commerceProductService.deleteCommerceProduct(req.params.id, commerceId);
  res.json({ status: 'success', message: 'Commerce product deactivated' });
}

export async function addLinkHandler(req: Request, res: Response): Promise<void> {
  const commerceId = getCommerceId(req);
  const dto = addSupplierLinkSchema.parse(req.body);
  const link = await commerceProductService.addSupplierLink(req.params.id, commerceId, dto);
  res.status(201).json({ status: 'success', data: link });
}

export async function removeLinkHandler(req: Request, res: Response): Promise<void> {
  const commerceId = getCommerceId(req);
  await commerceProductService.removeSupplierLink(
    req.params.id,
    req.params.linkId,
    commerceId,
  );
  res.json({ status: 'success', message: 'Supplier link removed' });
}
