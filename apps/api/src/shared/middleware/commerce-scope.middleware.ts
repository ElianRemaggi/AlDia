import { Request, Response, NextFunction } from 'express';

export const scopeToCommerce = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ status: 'error', message: 'Not authenticated' });
    return;
  }

  if (req.user.role === 'admin') {
    // Admin can scope to any commerce via query param
    const queryCommerceId = req.query.commerce_id as string | undefined;
    if (queryCommerceId) {
      req.commerceId = queryCommerceId;
    } else if (req.user.commerceId) {
      req.commerceId = req.user.commerceId;
    }
    // Admin without commerce_id param can access all — let the service handle it
  } else {
    // Commerce users are always scoped to their commerce
    if (!req.user.commerceId) {
      res.status(403).json({ status: 'error', message: 'User has no associated commerce' });
      return;
    }
    req.commerceId = req.user.commerceId;
  }

  next();
};
