import { Router } from 'express';
import { asyncHandler, authenticate, validate } from '../../shared/middleware';
import { createMarkupRuleSchema, updateMarkupRuleSchema, bulkUpdateMarkupSchema } from './markup.dto';
import * as markupController from './markup.controller';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(markupController.listHandler));
router.post('/', validate(createMarkupRuleSchema), asyncHandler(markupController.createHandler));
router.patch('/:id', validate(updateMarkupRuleSchema), asyncHandler(markupController.updateHandler));
router.delete('/:id', asyncHandler(markupController.deleteHandler));
router.post('/bulk-update', validate(bulkUpdateMarkupSchema), asyncHandler(markupController.bulkUpdateHandler));

export default router;
