import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { createMockRequest, createMockResponse } from '../../test/mocks/mock-express';

vi.mock('./auth.service');
import * as authService from './auth.service';
import {
  loginHandler,
  registerHandler,
  refreshHandler,
  logoutHandler,
  getMeHandler,
} from './auth.controller';

describe('auth.controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loginHandler', () => {
    it('should set refreshToken cookie and return user + accessToken', async () => {
      vi.mocked(authService.login).mockResolvedValue({
        user: { id: '1', name: 'Test', email: 'test@test.com', role: 'commerce' } as never,
        accessToken: 'at',
        refreshToken: 'rt',
      });

      const req = createMockRequest({ body: { email: 'test@test.com', password: 'p' } }) as Request;
      const res = createMockResponse() as Response;

      await loginHandler(req, res);

      expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'rt', expect.objectContaining({
        httpOnly: true,
        sameSite: 'strict',
        path: '/api/v1/auth/refresh',
      }));
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { user: expect.any(Object), accessToken: 'at' },
      });
    });
  });

  describe('registerHandler', () => {
    it('should call register and return 201', async () => {
      const user = { id: '1', name: 'New', email: 'new@test.com' };
      vi.mocked(authService.register).mockResolvedValue(user as never);

      const req = createMockRequest({ body: { name: 'New', email: 'new@test.com', password: 'p123', role: 'commerce' } }) as Request;
      const res = createMockResponse() as Response;

      await registerHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ status: 'success', data: user });
    });
  });

  describe('refreshHandler', () => {
    it('should return 401 when no refresh cookie', async () => {
      const req = createMockRequest({ cookies: {} }) as Request;
      const res = createMockResponse() as Response;

      await refreshHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'No refresh token' });
    });

    it('should return new accessToken with valid cookie', async () => {
      vi.mocked(authService.refresh).mockResolvedValue({ accessToken: 'new-at' });

      const req = createMockRequest({ cookies: { refreshToken: 'valid-rt' } }) as Request;
      const res = createMockResponse() as Response;

      await refreshHandler(req, res);

      expect(authService.refresh).toHaveBeenCalledWith('valid-rt');
      expect(res.json).toHaveBeenCalledWith({ status: 'success', data: { accessToken: 'new-at' } });
    });
  });

  describe('logoutHandler', () => {
    it('should clear cookie and return success', async () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;

      await logoutHandler(req, res);

      expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', { path: '/api/v1/auth/refresh' });
      expect(res.json).toHaveBeenCalledWith({ status: 'success', message: 'Logged out' });
    });
  });

  describe('getMeHandler', () => {
    it('should call getMe with user id and return data', async () => {
      const user = { id: 'u1', name: 'Me', email: 'me@test.com' };
      vi.mocked(authService.getMe).mockResolvedValue(user as never);

      const req = createMockRequest({
        user: { id: 'u1', role: 'commerce', commerceId: 'c1' },
      }) as Request;
      const res = createMockResponse() as Response;

      await getMeHandler(req, res);

      expect(authService.getMe).toHaveBeenCalledWith('u1');
      expect(res.json).toHaveBeenCalledWith({ status: 'success', data: user });
    });
  });
});
