import { Router } from 'express';
import { asyncHandler, authenticate, requireRole, validate } from '../../shared/middleware';
import { createCommerceSchema, updateCommerceSchema } from './commerce.dto';
import * as commerceController from './commerce.controller';

const router = Router();

router.use(authenticate, requireRole('admin'));

router.get('/', asyncHandler(commerceController.listHandler));
router.post('/', validate(createCommerceSchema), asyncHandler(commerceController.createHandler));
router.get('/:id', asyncHandler(commerceController.getByIdHandler));
router.patch(
  '/:id',
  validate(updateCommerceSchema),
  asyncHandler(commerceController.updateHandler),
);

export default router;
