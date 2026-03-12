import { Request, Response } from 'express';
import * as authService from './auth.service';

export async function loginHandler(req: Request, res: Response) {
  const result = await authService.login(req.body);

  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/v1/auth/refresh',
  });

  res.json({
    status: 'success',
    data: {
      user: result.user,
      accessToken: result.accessToken,
    },
  });
}

export async function registerHandler(req: Request, res: Response) {
  const user = await authService.register(req.body);
  res.status(201).json({
    status: 'success',
    data: user,
  });
}

export async function refreshHandler(req: Request, res: Response) {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) {
    res.status(401).json({ status: 'error', message: 'No refresh token' });
    return;
  }

  const result = await authService.refresh(refreshToken);
  res.json({
    status: 'success',
    data: result,
  });
}

export async function logoutHandler(_req: Request, res: Response) {
  res.clearCookie('refreshToken', {
    path: '/api/v1/auth/refresh',
  });
  res.json({ status: 'success', message: 'Logged out' });
}

export async function getMeHandler(req: Request, res: Response) {
  const user = await authService.getMe(req.user!.id);
  res.json({
    status: 'success',
    data: user,
  });
}
