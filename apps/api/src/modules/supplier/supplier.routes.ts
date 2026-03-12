import { Router } from 'express';
import {
  asyncHandler,
  authenticate,
  scopeToCommerce,
  validate,
} from '../../shared/middleware';
import { createSupplierSchema, updateSupplierSchema } from './supplier.dto';
import * as supplierController from './supplier.controller';

const router = Router();

router.use(authenticate, scopeToCommerce);

router.get('/', asyncHandler(supplierController.listHandler));
router.post('/', validate(createSupplierSchema), asyncHandler(supplierController.createHandler));
router.get('/:id', asyncHandler(supplierController.getByIdHandler));
router.patch(
  '/:id',
  validate(updateSupplierSchema),
  asyncHandler(supplierController.updateHandler),
);
router.delete('/:id', asyncHandler(supplierController.deleteHandler));

export default router;
