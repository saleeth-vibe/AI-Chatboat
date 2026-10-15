import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import type { UserRole } from '../types/user';

export class TokenError extends Error {
  constructor() {
    super('Invalid token');
    this.name = 'TokenError';
  }
}

export type TokenPayload = {
  sub: number;
  role: UserRole;
};

const ROLES: readonly UserRole[] = ['ADMIN', 'STUDENT', 'FACULTY'];

export function signToken(payload: TokenPayload): string {
  const options: SignOptions = { expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'] };
  return jwt.sign({ sub: payload.sub, role: payload.role }, env.jwtSecret, options);
}

export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    if (typeof decoded !== 'object' || decoded === null) {
      throw new TokenError();
    }

    const sub = Number(decoded.sub);
    const role = decoded.role;
    if (!Number.isSafeInteger(sub) || sub < 1 || !isRole(role)) {
      throw new TokenError();
    }

    return { sub, role };
  } catch (error) {
    if (error instanceof TokenError || error instanceof jwt.JsonWebTokenError) {
      throw new TokenError();
    }
    throw error;
  }
}

function isRole(value: unknown): value is UserRole {
  return typeof value === 'string' && ROLES.includes(value as UserRole);
}
