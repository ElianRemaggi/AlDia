import { Request, Response } from 'express';
import * as userService from './user.service';
import { listUsersQuerySchema } from './user.dto';
import { AppError } from '../../shared/middleware';

export async function listHandler(req: Request, res: Response): Promise<void> {
  const parsed = listUsersQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError('Invalid query parameters', 400);
  }
  const result = await userService.listUsers(parsed.data);
  res.json({ status: 'success', ...result });
}

export async function getByIdHandler(req: Request, res: Response): Promise<void> {
  const user = await userService.getUser(req.params.id);
  res.json({ status: 'success', data: user });
}

export async function createHandler(req: Request, res: Response): Promise<void> {
  const user = await userService.createUser(req.body);
  res.status(201).json({ status: 'success', data: user });
}

export async function updateHandler(req: Request, res: Response): Promise<void> {
  const user = await userService.updateUser(req.params.id, req.body, req.user!.id);
  res.json({ status: 'success', data: user });
}

export async function deleteHandler(req: Request, res: Response): Promise<void> {
  const user = await userService.deactivateUser(req.params.id, req.user!.id);
  res.json({ status: 'success', data: user });
}
