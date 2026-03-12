import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { createMockRequest, createMockResponse, createMockNext } from '../../test/mocks/mock-express';

vi.mock('jsonwebtoken');
vi.mock('../../config', () => ({
  config: { jwt: { secret: 'test-secret' } },
}));

import jwt from 'jsonwebtoken';
import { authenticate } from './auth.middleware';

describe('authenticate middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when no Authorization header', () => {
    const req = createMockRequest({ headers: {} }) as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'No token provided' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when Authorization header does not start with Bearer', () => {
    const req = createMockRequest({
      headers: { authorization: 'Basic abc123' },
    }) as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should return 401 when jwt.verify throws', () => {
    vi.mocked(jwt.verify).mockImplementation(() => { throw new Error('invalid'); });
    const req = createMockRequest({
      headers: { authorization: 'Bearer invalid-token' },
    }) as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Invalid or expired token' });
  });

  it('should set req.user and call next on valid token', () => {
    const payload = { sub: 'user-1', role: 'commerce', commerceId: 'comm-1' };
    vi.mocked(jwt.verify).mockReturnValue(payload as never);
    const req = createMockRequest({
      headers: { authorization: 'Bearer valid-token' },
    }) as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    authenticate(req, res, next);

    expect(req.user).toEqual({ id: 'user-1', role: 'commerce', commerceId: 'comm-1' });
    expect(next).toHaveBeenCalled();
  });

  it('should pass the token (without Bearer prefix) to jwt.verify', () => {
    vi.mocked(jwt.verify).mockReturnValue({ sub: 'u', role: 'admin', commerceId: null } as never);
    const req = createMockRequest({
      headers: { authorization: 'Bearer my-token-123' },
    }) as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    authenticate(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith('my-token-123', 'test-secret');
  });
});
