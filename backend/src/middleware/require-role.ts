import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '../types/user';
import { AppError } from '../utils/errors';

export function requireRole(role: UserRole, message: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || req.user.role !== role) {
      next(new AppError(403, 'FORBIDDEN', message));
      return;
    }
    next();
  };
}

export const requireFaculty = requireRole('FACULTY', 'Faculty access required');
export const requireStudent = requireRole('STUDENT', 'Student access required');
