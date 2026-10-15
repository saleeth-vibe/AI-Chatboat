import type { AuthUser } from '../../types/auth';

export function homePath(user: Pick<AuthUser, 'role' | 'mustChangePassword'>): string {
  if (user.role === 'FACULTY') {
    return user.mustChangePassword ? '/account/password' : '/teach';
  }
  if (user.role === 'STUDENT') {
    return user.mustChangePassword ? '/account/password' : '/assistant';
  }
  return '/';
}
