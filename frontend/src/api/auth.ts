import type { AuthUser } from '../types/auth';
import { apiRequest } from './client';

export function login(input: { email: string; password: string }): Promise<{ user: AuthUser }> {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getMe(): Promise<{ user: AuthUser }> {
  return apiRequest('/auth/me');
}

export function logout(): Promise<{ success: boolean }> {
  return apiRequest('/auth/logout', { method: 'POST' });
}

export function changePassword(password: string): Promise<{ user: AuthUser }> {
  return apiRequest('/auth/password', { method: 'POST', body: JSON.stringify({ password }) });
}
