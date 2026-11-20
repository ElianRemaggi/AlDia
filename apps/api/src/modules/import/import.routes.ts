import { Router } from 'express';
import multer from 'multer';
import {
  AppError,
  asyncHandler,
  authenticate,
  scopeToCommerce,
  validate,
} from '../../shared/middleware';
import { uploadPriceListSchema } from './import.dto';
import * as importController from './import.controller';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.toLowerCase().match(/\.[^.]+$/)?.[0];
    const allowed = ['.xlsx', '.xls', '.csv', '.pdf'];
    if (ext && allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new AppError('Unsupported file type. Allowed: xlsx, xls, csv, pdf', 400));
    }
  },
});

// Mounted at /api/v1/suppliers/:supplierId/price-lists
// mergeParams: true gives access to :supplierId from the parent router
export const priceListRouter = Router({ mergeParams: true });
priceListRouter.use(authenticate, scopeToCommerce);
priceListRouter.post(
  '/upload',
  upload.single('file'),
  validate(uploadPriceListSchema),
  asyncHandler(importController.uploadHandler),
);
priceListRouter.get('/', asyncHandler(importController.listPriceListsHandler));
priceListRouter.get('/:priceListId', asyncHandler(importController.getPriceListHandler));

// Mounted at /api/v1/import-jobs
export const importJobRouter = Router();
importJobRouter.use(authenticate, scopeToCommerce);
importJobRouter.get('/:id', asyncHandler(importController.getImportJobHandler));

export default priceListRouter;
