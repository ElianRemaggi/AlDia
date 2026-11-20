import { Router } from 'express';
import { asyncHandler, authenticate, requireRole, validate } from '../../shared/middleware';
import { createUserSchema, updateUserSchema } from './user.dto';
import * as userController from './user.controller';

// Mounted at /api/v1/admin/users
const router = Router();

router.use(authenticate, requireRole('admin'));

router.get('/', asyncHandler(userController.listHandler));
router.post('/', validate(createUserSchema), asyncHandler(userController.createHandler));
router.get('/:id', asyncHandler(userController.getByIdHandler));
router.patch('/:id', validate(updateUserSchema), asyncHandler(userController.updateHandler));
router.delete('/:id', asyncHandler(userController.deleteHandler));

export default router;
