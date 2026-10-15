import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/errors';

// Uses the role stored on the user row. The browser cannot choose a role.
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'ADMIN') {
    next(new AppError(403, 'FORBIDDEN', 'Admin access required'));
    return;
  }
  next();
}
