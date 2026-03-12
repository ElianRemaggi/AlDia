import { Request, Response } from 'express';
import * as commerceService from './commerce.service';

export async function listHandler(_req: Request, res: Response) {
  const commerces = await commerceService.list();
  res.json({ status: 'success', data: commerces });
}

export async function getByIdHandler(req: Request, res: Response) {
  const commerce = await commerceService.getById(req.params.id);
  res.json({ status: 'success', data: commerce });
}

export async function createHandler(req: Request, res: Response) {
  const commerce = await commerceService.create(req.body);
  res.status(201).json({ status: 'success', data: commerce });
}

export async function updateHandler(req: Request, res: Response) {
  const commerce = await commerceService.update(req.params.id, req.body);
  res.json({ status: 'success', data: commerce });
}
