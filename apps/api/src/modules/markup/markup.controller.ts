import { Request, Response } from 'express';
import * as markupService from './markup.service';
import { createMarkupRuleSchema, updateMarkupRuleSchema, bulkUpdateMarkupSchema } from './markup.dto';
import { AppError } from '../../shared/middleware';

function getCommerceId(req: Request): string {
  if (!req.user?.commerceId) {
    throw new AppError('Commerce scope required', 400);
  }
  return req.user.commerceId;
}

export async function listHandler(req: Request, res: Response): Promise<void> {
  const commerceId = getCommerceId(req);
  const data = await markupService.listMarkupRules(commerceId);
  res.json({ status: 'success', data });
}

export async function createHandler(req: Request, res: Response): Promise<void> {
  const commerceId = getCommerceId(req);
  const dto = createMarkupRuleSchema.parse(req.body);
  const rule = await markupService.createMarkupRule(commerceId, dto);
  res.status(201).json({ status: 'success', data: rule });
}

export async function updateHandler(req: Request, res: Response): Promise<void> {
  const commerceId = getCommerceId(req);
  const dto = updateMarkupRuleSchema.parse(req.body);
  const rule = await markupService.updateMarkupRule(req.params.id, commerceId, dto);
  res.json({ status: 'success', data: rule });
}

export async function deleteHandler(req: Request, res: Response): Promise<void> {
  const commerceId = getCommerceId(req);
  await markupService.deleteMarkupRule(req.params.id, commerceId);
  res.json({ status: 'success', message: 'Markup rule deleted' });
}

export async function bulkUpdateHandler(req: Request, res: Response): Promise<void> {
  const commerceId = getCommerceId(req);
  const dto = bulkUpdateMarkupSchema.parse(req.body);
  const rules = await markupService.bulkUpdateMarkupRules(commerceId, dto);
  res.json({ status: 'success', data: rules });
}
