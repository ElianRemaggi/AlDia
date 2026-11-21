import { Request, Response, NextFunction } from 'express';
import { MulterError } from 'multer';
import { QueryFailedError } from 'typeorm';
import { ZodError } from 'zod';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
    return;
  }

  // Query/params parsed with schema.parse() inside controllers
  if (err instanceof ZodError) {
    res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
    });
    return;
  }

  if (err instanceof MulterError) {
    const tooLarge = err.code === 'LIMIT_FILE_SIZE';
    res.status(tooLarge ? 413 : 400).json({
      status: 'error',
      message: tooLarge ? 'File too large. Maximum size is 20MB' : err.message,
    });
    return;
  }

  // Postgres 22P02 (invalid_text_representation): e.g. a malformed UUID in the URL
  if (err instanceof QueryFailedError && (err.driverError as { code?: string })?.code === '22P02') {
    res.status(400).json({ status: 'error', message: 'Invalid identifier' });
    return;
  }

  console.error('Unexpected error:', err);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
};
