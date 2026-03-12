import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { validate } from './validate.middleware';
import { createMockRequest, createMockResponse, createMockNext } from '../../test/mocks/mock-express';
import { Request, Response } from 'express';

const testSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

describe('validate middleware', () => {
  it('should call next and set parsed body on valid input', () => {
    const req = createMockRequest({ body: { name: 'John', email: 'john@test.com' } }) as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    validate(testSchema)(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({ name: 'John', email: 'john@test.com' });
  });

  it('should return 400 with errors on invalid input', () => {
    const req = createMockRequest({ body: { name: '', email: 'bad' } }) as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    validate(testSchema)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'error',
      message: 'Validation failed',
      errors: expect.arrayContaining([
        expect.objectContaining({ field: 'name' }),
        expect.objectContaining({ field: 'email' }),
      ]),
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 400 for missing required fields', () => {
    const req = createMockRequest({ body: {} }) as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    validate(testSchema)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('should strip extra fields via schema parsing', () => {
    const req = createMockRequest({
      body: { name: 'John', email: 'john@test.com', extra: 'ignored' },
    }) as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    validate(testSchema)(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body).not.toHaveProperty('extra');
  });
});
