import { AppError, type FieldError } from '../utils/errors';
import { expectObject, readPassword, rejectUnknown, throwDetails } from '../utils/request';

export type LoginInput = {
  email: string;
  password: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLoginBody(body: unknown): LoginInput {
  if (!isRecord(body)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', [
      { field: 'body', message: 'Expected an object' },
    ]);
  }

  const details: FieldError[] = [];
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email) {
    details.push({ field: 'email', message: 'Email is required' });
  } else if (email.length > 255 || !EMAIL_PATTERN.test(email)) {
    details.push({ field: 'email', message: 'Enter a valid email address' });
  }

  if (!password) {
    details.push({ field: 'password', message: 'Password is required' });
  }

  if (details.length > 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', details);
  }

  return { email, password };
}

export function validateChangePassword(body: unknown): string {
  const record = expectObject(body);
  rejectUnknown(record, ['password']);
  const details: FieldError[] = [];
  const password = readPassword(record.password, details, true);
  throwDetails(details);
  return password!;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
