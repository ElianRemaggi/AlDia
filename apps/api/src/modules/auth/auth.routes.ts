import { Router } from 'express';
import { asyncHandler, authenticate, requireRole, validate } from '../../shared/middleware';
import { loginSchema, registerSchema } from './auth.dto';
import * as authController from './auth.controller';

const router = Router();

router.post('/login', validate(loginSchema), asyncHandler(authController.loginHandler));

router.post(
  '/register',
  authenticate,
  requireRole('admin'),
  validate(registerSchema),
  asyncHandler(authController.registerHandler),
);

router.post('/refresh', asyncHandler(authController.refreshHandler));

router.post('/logout', authenticate, asyncHandler(authController.logoutHandler));

router.get('/me', authenticate, asyncHandler(authController.getMeHandler));

export default router;
