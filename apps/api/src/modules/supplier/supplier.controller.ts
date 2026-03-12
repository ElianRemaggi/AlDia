import { Request, Response } from 'express';
import * as supplierService from './supplier.service';
import { listSuppliersQuerySchema } from './supplier.dto';
import { AppError } from '../../shared/middleware';

function getCommerceId(req: Request): string {
  if (!req.commerceId) {
    throw new AppError('Commerce scope required', 400);
  }
  return req.commerceId;
}

export async function listHandler(req: Request, res: Response) {
  const commerceId = getCommerceId(req);
  const query = listSuppliersQuerySchema.parse(req.query);
  const result = await supplierService.list(commerceId, query);
  res.json({ status: 'success', ...result });
}

export async function getByIdHandler(req: Request, res: Response) {
  const commerceId = getCommerceId(req);
  const supplier = await supplierService.getById(req.params.id, commerceId);
  res.json({ status: 'success', data: supplier });
}

export async function createHandler(req: Request, res: Response) {
  const commerceId = getCommerceId(req);
  const supplier = await supplierService.create(commerceId, req.body);
  res.status(201).json({ status: 'success', data: supplier });
}

export async function updateHandler(req: Request, res: Response) {
  const commerceId = getCommerceId(req);
  const supplier = await supplierService.update(req.params.id, commerceId, req.body);
  res.json({ status: 'success', data: supplier });
}

export async function deleteHandler(req: Request, res: Response) {
  const commerceId = getCommerceId(req);
  await supplierService.softDelete(req.params.id, commerceId);
  res.json({ status: 'success', message: 'Supplier deactivated' });
}
