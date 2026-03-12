import { Router } from 'express';
import { asyncHandler, authenticate } from '../../shared/middleware';
import * as notificationController from './notification.controller';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(notificationController.listHandler));
router.get('/unread-count', asyncHandler(notificationController.unreadCountHandler));
router.patch('/:id/read', asyncHandler(notificationController.markAsReadHandler));
router.post('/mark-all-read', asyncHandler(notificationController.markAllReadHandler));

export default router;
