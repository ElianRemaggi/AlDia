import { Router } from 'express';
import { asyncHandler, authenticate, validate } from '../../shared/middleware';
import {
  createPurchaseListSchema,
  updatePurchaseListSchema,
  addPurchaseItemSchema,
  updatePurchaseItemSchema,
} from './purchase.dto';
import * as purchaseController from './purchase.controller';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(purchaseController.listHandler));
router.post('/', validate(createPurchaseListSchema), asyncHandler(purchaseController.createHandler));
router.get('/:id', asyncHandler(purchaseController.getByIdHandler));
router.patch('/:id', validate(updatePurchaseListSchema), asyncHandler(purchaseController.updateHandler));
router.delete('/:id', asyncHandler(purchaseController.deleteHandler));
router.post('/:id/items', validate(addPurchaseItemSchema), asyncHandler(purchaseController.addItemHandler));
router.patch('/:id/items/:itemId', validate(updatePurchaseItemSchema), asyncHandler(purchaseController.updateItemHandler));
router.delete('/:id/items/:itemId', asyncHandler(purchaseController.removeItemHandler));
router.get('/:id/export/whatsapp', asyncHandler(purchaseController.exportWhatsAppHandler));

export default router;
