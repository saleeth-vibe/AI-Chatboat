import type { CookieOptions, Response } from 'express';
import { env } from '../config/env';

export const AUTH_COOKIE = 'campus_token';

const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;

function baseOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: env.nodeEnv === 'production',
  };
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE, token, {
    ...baseOptions(),
    maxAge: EIGHT_HOURS_MS,
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE, baseOptions());
}
