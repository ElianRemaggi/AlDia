import { Request, Response } from 'express';
import * as catalogService from './catalog.service';
import { listProductsQuerySchema } from './catalog.dto';
import { AppError } from '../../shared/middleware';

function getCommerceId(req: Request): string {
  if (!req.user?.commerceId) {
    throw new AppError('Commerce scope required', 400);
  }
  return req.user.commerceId;
}

export async function listHandler(req: Request, res: Response): Promise<void> {
  const commerceId = getCommerceId(req);
  const query = listProductsQuerySchema.parse(req.query);
  const result = await catalogService.listProducts(commerceId, query);
  res.json({ status: 'success', ...result });
}

export async function categoriesHandler(req: Request, res: Response): Promise<void> {
  const commerceId = getCommerceId(req);
  const categories = await catalogService.listCategories(commerceId);
  res.json({ status: 'success', data: categories });
}

export async function getByIdHandler(req: Request, res: Response): Promise<void> {
  const commerceId = getCommerceId(req);
  const product = await catalogService.getProduct(req.params.id, commerceId);
  res.json({ status: 'success', data: product });
}

export async function priceHistoryHandler(req: Request, res: Response): Promise<void> {
  const commerceId = getCommerceId(req);
  const result = await catalogService.getPriceHistory(req.params.id, commerceId);
  res.json({ status: 'success', ...result });
}

export async function priceChangesHandler(req: Request, res: Response): Promise<void> {
  const commerceId = getCommerceId(req);
  const result = await catalogService.getPriceChanges(req.params.id, commerceId);
  res.json({ status: 'success', ...result });
}

export async function addFavoriteHandler(req: Request, res: Response): Promise<void> {
  const commerceId = getCommerceId(req);
  await catalogService.toggleFavorite(req.params.id, commerceId, true);
  res.json({ status: 'success', message: 'Product added to favorites' });
}

export async function removeFavoriteHandler(req: Request, res: Response): Promise<void> {
  const commerceId = getCommerceId(req);
  await catalogService.toggleFavorite(req.params.id, commerceId, false);
  res.json({ status: 'success', message: 'Product removed from favorites' });
}
