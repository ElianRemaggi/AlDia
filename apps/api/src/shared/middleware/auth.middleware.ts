import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config';

export interface AuthUser {
  id: string;
  role: 'admin' | 'commerce';
  commerceId: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      commerceId?: string;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ status: 'error', message: 'No token provided' });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const payload = jwt.verify(token, config.jwt.secret) as {
      sub: string;
      role: 'admin' | 'commerce';
      commerceId: string | null;
    };

    req.user = {
      id: payload.sub,
      role: payload.role,
      commerceId: payload.commerceId,
    };
    next();
  } catch {
    res.status(401).json({ status: 'error', message: 'Invalid or expired token' });
  }
};
