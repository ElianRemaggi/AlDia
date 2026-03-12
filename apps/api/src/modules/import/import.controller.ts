import { Request, Response } from 'express';
import * as importService from './import.service';
import { listPriceListsQuerySchema, uploadPriceListSchema } from './import.dto';
import { AppError } from '../../shared/middleware';

function getCommerceId(req: Request): string {
  if (!req.commerceId) throw new AppError('Commerce scope required', 400);
  return req.commerceId;
}

export async function uploadHandler(req: Request, res: Response) {
  const commerceId = getCommerceId(req);
  const userId = req.user!.id;
  const supplierId = req.params.supplierId;
  const file = req.file;
  if (!file) throw new AppError('File is required', 400);
  const dto = uploadPriceListSchema.parse(req.body);
  const result = await importService.uploadPriceList(supplierId, commerceId, userId, file, dto);
  res.status(202).json({ status: 'success', data: result });
}

export async function listPriceListsHandler(req: Request, res: Response) {
  const commerceId = getCommerceId(req);
  const query = listPriceListsQuerySchema.parse(req.query);
  const result = await importService.listPriceLists(req.params.supplierId, commerceId, query);
  res.json({ status: 'success', ...result });
}

export async function getPriceListHandler(req: Request, res: Response) {
  const commerceId = getCommerceId(req);
  const priceList = await importService.getPriceList(
    req.params.priceListId,
    req.params.supplierId,
    commerceId,
  );
  res.json({ status: 'success', data: priceList });
}

export async function getImportJobHandler(req: Request, res: Response) {
  const commerceId = getCommerceId(req);
  const job = await importService.getImportJob(req.params.id, commerceId);
  res.json({ status: 'success', data: job });
}
