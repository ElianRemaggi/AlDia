import { Router } from 'express';
import { asyncHandler, authenticate, validate } from '../../shared/middleware';
import {
  createCommerceProductSchema,
  updateCommerceProductSchema,
  addSupplierLinkSchema,
} from './commerce-product.dto';
import * as commerceProductController from './commerce-product.controller';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(commerceProductController.listHandler));
router.post(
  '/',
  validate(createCommerceProductSchema),
  asyncHandler(commerceProductController.createHandler),
);
router.get('/:id', asyncHandler(commerceProductController.getByIdHandler));
router.patch(
  '/:id',
  validate(updateCommerceProductSchema),
  asyncHandler(commerceProductController.updateHandler),
);
router.delete('/:id', asyncHandler(commerceProductController.deleteHandler));
router.post(
  '/:id/links',
  validate(addSupplierLinkSchema),
  asyncHandler(commerceProductController.addLinkHandler),
);
router.delete('/:id/links/:linkId', asyncHandler(commerceProductController.removeLinkHandler));

export default router;
