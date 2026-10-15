import type { NextFunction, Request, Response } from 'express';
import { User } from '../models';
import { AppError } from '../utils/errors';
import { AUTH_COOKIE } from '../utils/cookies';
import { TokenError, verifyToken } from '../utils/token';

// Reads the campus_token cookie, checks the JWT, and loads the user from the database.
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.[AUTH_COOKIE];
    if (typeof token !== 'string' || token.length === 0) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    }

    const payload = verifyToken(token);
    const user = await User.findByPk(payload.sub);
    if (!user || !user.isActive) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    }

    req.user = {
      id: Number(user.id),
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      mustChangePassword: Boolean(user.mustChangePassword),
    };
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    if (error instanceof TokenError) {
      next(new AppError(401, 'UNAUTHENTICATED', 'Authentication required'));
      return;
    }
    next(error);
  }
}
