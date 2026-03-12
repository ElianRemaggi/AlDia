import { describe, it, expect } from 'vitest';
import { Request, Response } from 'express';
import { requireRole } from './role.middleware';
import { createMockRequest, createMockResponse, createMockNext } from '../../test/mocks/mock-express';

describe('requireRole middleware', () => {
  it('should return 401 when req.user is not set', () => {
    const req = createMockRequest() as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    requireRole('admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Not authenticated' });
  });

  it('should return 403 when user role is not allowed', () => {
    const req = createMockRequest({
      user: { id: '1', role: 'commerce', commerceId: 'c1' },
    }) as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    requireRole('admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Insufficient permissions' });
  });

  it('should call next when user role is allowed', () => {
    const req = createMockRequest({
      user: { id: '1', role: 'admin', commerceId: null },
    }) as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    requireRole('admin')(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should accept multiple roles', () => {
    const req = createMockRequest({
      user: { id: '1', role: 'commerce', commerceId: 'c1' },
    }) as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    requireRole('admin', 'commerce')(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
