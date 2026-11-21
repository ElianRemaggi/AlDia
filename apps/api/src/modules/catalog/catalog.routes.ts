import { Router } from 'express';
import { asyncHandler, authenticate } from '../../shared/middleware';
import * as catalogController from './catalog.controller';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(catalogController.listHandler));
// Before '/:id' so 'categories' isn't taken as a product id
router.get('/categories', asyncHandler(catalogController.categoriesHandler));
router.get('/:id', asyncHandler(catalogController.getByIdHandler));
router.get('/:id/price-history', asyncHandler(catalogController.priceHistoryHandler));
router.get('/:id/changes', asyncHandler(catalogController.priceChangesHandler));
router.post('/:id/favorite', asyncHandler(catalogController.addFavoriteHandler));
router.delete('/:id/favorite', asyncHandler(catalogController.removeFavoriteHandler));

export default router;
