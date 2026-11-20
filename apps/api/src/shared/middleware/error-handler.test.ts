import { describe, it, expect, vi } from 'vitest';
import { AppError, errorHandler } from './error-handler';
import { createMockRequest, createMockResponse, createMockNext } from '../../test/mocks/mock-express';
import { Request, Response, NextFunction } from 'express';
import { MulterError } from 'multer';
import { z } from 'zod';

describe('AppError', () => {
  it('should set statusCode, message, and isOperational', () => {
    const error = new AppError('Not found', 404);
    expect(error.message).toBe('Not found');
    expect(error.statusCode).toBe(404);
    expect(error.isOperational).toBe(true);
  });

  it('should allow isOperational to be false', () => {
    const error = new AppError('Critical', 500, false);
    expect(error.isOperational).toBe(false);
  });

  it('should be an instance of Error and AppError', () => {
    const error = new AppError('test', 400);
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
  });
});

describe('errorHandler', () => {
  it('should return statusCode and message for AppError', () => {
    const err = new AppError('Bad request', 400);
    const req = createMockRequest() as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Bad request' });
  });

  it('should return 500 with generic message for non-AppError', () => {
    const err = new Error('something broke');
    const req = createMockRequest() as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Internal server error' });
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should return 400 with field errors for a ZodError', () => {
    const parsed = z.object({ page: z.number() }).safeParse({ page: 'x' });
    const res = createMockResponse() as Response;

    errorHandler(parsed.error!, createMockRequest() as Request, res, createMockNext());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Validation failed',
        errors: [expect.objectContaining({ field: 'page' })],
      }),
    );
  });

  it('should return 413 for files over the multer size limit', () => {
    const res = createMockResponse() as Response;

    errorHandler(new MulterError('LIMIT_FILE_SIZE', 'file'), createMockRequest() as Request, res, createMockNext());

    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'File too large. Maximum size is 20MB',
    });
  });

  it('should return 400 for other multer errors', () => {
    const res = createMockResponse() as Response;

    errorHandler(new MulterError('LIMIT_UNEXPECTED_FILE', 'other'), createMockRequest() as Request, res, createMockNext());

    expect(res.status).toHaveBeenCalledWith(400);
  });
});
