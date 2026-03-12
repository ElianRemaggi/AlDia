import { describe, it, expect } from 'vitest';
import { Request, Response } from 'express';
import { scopeToCommerce } from './commerce-scope.middleware';
import { createMockRequest, createMockResponse, createMockNext } from '../../test/mocks/mock-express';

describe('scopeToCommerce middleware', () => {
  it('should return 401 when req.user is not set', () => {
    const req = createMockRequest() as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    scopeToCommerce(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should set req.commerceId for commerce user', () => {
    const req = createMockRequest({
      user: { id: '1', role: 'commerce', commerceId: 'comm-1' },
    }) as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    scopeToCommerce(req, res, next);

    expect(req.commerceId).toBe('comm-1');
    expect(next).toHaveBeenCalled();
  });

  it('should return 403 for commerce user without commerceId', () => {
    const req = createMockRequest({
      user: { id: '1', role: 'commerce', commerceId: null },
    }) as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    scopeToCommerce(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'User has no associated commerce' }),
    );
  });

  it('should use commerce_id query param for admin', () => {
    const req = createMockRequest({
      user: { id: '1', role: 'admin', commerceId: null },
      query: { commerce_id: 'override-comm' },
    }) as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    scopeToCommerce(req, res, next);

    expect(req.commerceId).toBe('override-comm');
    expect(next).toHaveBeenCalled();
  });

  it('should use admin user commerceId when no query param', () => {
    const req = createMockRequest({
      user: { id: '1', role: 'admin', commerceId: 'admin-comm' },
      query: {},
    }) as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    scopeToCommerce(req, res, next);

    expect(req.commerceId).toBe('admin-comm');
    expect(next).toHaveBeenCalled();
  });

  it('should leave req.commerceId undefined for admin without commerce', () => {
    const req = createMockRequest({
      user: { id: '1', role: 'admin', commerceId: null },
      query: {},
    }) as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    scopeToCommerce(req, res, next);

    expect(req.commerceId).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });
});
