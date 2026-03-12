import { describe, it, expect, vi } from 'vitest';
import { asyncHandler } from './async-handler';
import { createMockRequest, createMockResponse, createMockNext } from '../../test/mocks/mock-express';
import { Request, Response, NextFunction } from 'express';

describe('asyncHandler', () => {
  it('should call the wrapped function with req, res, next', async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    const handler = asyncHandler(fn);
    const req = createMockRequest() as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    await handler(req, res, next);

    expect(fn).toHaveBeenCalledWith(req, res, next);
  });

  it('should call next with error when wrapped function rejects', async () => {
    const error = new Error('async failure');
    const fn = vi.fn().mockRejectedValue(error);
    const handler = asyncHandler(fn);
    const req = createMockRequest() as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    await handler(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('should not call next when wrapped function resolves', async () => {
    const fn = vi.fn().mockImplementation(async (_req: Request, res: Response) => {
      res.json({ ok: true });
    });
    const handler = asyncHandler(fn);
    const req = createMockRequest() as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    await handler(req, res, next);

    expect(next).not.toHaveBeenCalled();
  });
});
