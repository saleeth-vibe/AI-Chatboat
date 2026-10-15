import { AppError, type FieldError } from './errors';
import { parsePagination, type Pagination } from './pagination';

export function expectObject(value: unknown, field = 'body'): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', [
      { field, message: 'Expected an object' },
    ]);
  }
  return value as Record<string, unknown>;
}

export function rejectUnknown(record: Record<string, unknown>, allowed: readonly string[]): void {
  const details = Object.keys(record)
    .filter((key) => !allowed.includes(key))
    .map((field) => ({ field, message: 'This field is not accepted.' }));
  if (details.length > 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', details);
  }
}

export function throwDetails(details: FieldError[]): void {
  if (details.length > 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', details);
  }
}

export function requireId(value: string | string[] | undefined, field = 'id'): number {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d+$/.test(raw)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', [
      { field, message: `${field} must be a positive whole number.` },
    ]);
  }
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', [
      { field, message: `${field} must be a positive whole number.` },
    ]);
  }
  return id;
}

export function readRequiredString(value: unknown, field: string, max: number, details: FieldError[]): string | undefined {
  if (typeof value !== 'string' || value.trim() === '') {
    details.push({ field, message: 'This field is required.' });
    return undefined;
  }
  const text = value.trim();
  if (text.length > max) {
    details.push({ field, message: `Use ${max} characters or fewer.` });
    return undefined;
  }
  return text;
}

export function readOptionalString(value: unknown, field: string, max: number, details: FieldError[]): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    details.push({ field, message: 'This field must be text.' });
    return undefined;
  }
  const text = value.trim();
  if (text.length > max) {
    details.push({ field, message: `Use ${max} characters or fewer.` });
    return undefined;
  }
  return text.length === 0 ? null : text;
}

export function readBoolean(value: unknown, field: string, details: FieldError[], fallback?: boolean): boolean | undefined {
  if (value === undefined) {
    return fallback;
  }
  if (typeof value !== 'boolean') {
    details.push({ field, message: 'Use true or false.' });
    return undefined;
  }
  return value;
}

export function readInt(value: unknown, field: string, min: number, max: number, details: FieldError[]): number | undefined {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    details.push({ field, message: `Use a whole number from ${min} to ${max}.` });
    return undefined;
  }
  if (value < min || value > max) {
    details.push({ field, message: `Use a whole number from ${min} to ${max}.` });
    return undefined;
  }
  return value;
}

export function readId(value: unknown, field: string, details: FieldError[], required: boolean): number | null | undefined {
  if (value === undefined) {
    if (required) {
      details.push({ field, message: 'This field is required.' });
    }
    return undefined;
  }
  if (value === null && !required) {
    return null;
  }
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    details.push({ field, message: 'Choose a valid record.' });
    return undefined;
  }
  return value;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function readEmail(value: unknown, details: FieldError[]): string | undefined {
  if (typeof value !== 'string') {
    details.push({ field: 'email', message: 'Enter a valid email address.' });
    return undefined;
  }
  const email = value.trim().toLowerCase();
  if (!email || email.length > 255 || !EMAIL_PATTERN.test(email)) {
    details.push({ field: 'email', message: 'Enter a valid email address.' });
    return undefined;
  }
  return email;
}

export function readPassword(value: unknown, details: FieldError[], required: boolean): string | undefined {
  if (value === undefined && !required) {
    return undefined;
  }
  if (typeof value !== 'string' || value.length < 8) {
    details.push({ field: 'password', message: 'Password must be at least 8 characters.' });
    return undefined;
  }
  if (value.length > 72) {
    details.push({ field: 'password', message: 'Password must be 72 characters or fewer.' });
    return undefined;
  }
  return value;
}

export function readCode(value: unknown, field: string, max: number, details: FieldError[]): string | undefined {
  const text = readRequiredString(value, field, max, details);
  if (!text) {
    return undefined;
  }
  const code = text.toUpperCase();
  if (!/^[A-Z0-9]+$/.test(code)) {
    details.push({ field, message: 'Use letters and numbers only.' });
    return undefined;
  }
  return code;
}

export function queryId(record: Record<string, unknown>, field: string, required: boolean): number | undefined {
  const value = record[field];
  if (value === undefined || value === '') {
    if (required) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', [
        { field, message: 'This field is required.' },
      ]);
    }
    return undefined;
  }
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', [
      { field, message: `${field} must be a positive whole number.` },
    ]);
  }
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', [
      { field, message: `${field} must be a positive whole number.` },
    ]);
  }
  return id;
}

export function queryEnum<T extends string>(
  record: Record<string, unknown>,
  field: string,
  allowed: readonly T[],
): T | undefined {
  const value = record[field];
  if (value === undefined || value === '') {
    return undefined;
  }
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', [
      { field, message: `Use one of: ${allowed.join(', ')}.` },
    ]);
  }
  return value as T;
}

export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

export type ListQuery = Pagination & {
  search?: string;
  isActive?: boolean;
};

export function readListQuery(query: unknown, searchMax = 50): ListQuery {
  const record = expectObject(query, 'query');
  const pagination = parsePagination(record);
  const result: ListQuery = { ...pagination };

  if (record.search !== undefined && record.search !== '') {
    if (typeof record.search !== 'string') {
      throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', [
        { field: 'search', message: 'Search must be text.' },
      ]);
    }
    const search = record.search.trim();
    if (search.length > searchMax) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', [
        { field: 'search', message: `Search must be ${searchMax} characters or fewer.` },
      ]);
    }
    if (search) {
      result.search = search;
    }
  }

  if (record.isActive !== undefined && record.isActive !== '') {
    if (record.isActive === 'true') {
      result.isActive = true;
    } else if (record.isActive === 'false') {
      result.isActive = false;
    } else {
      throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', [
        { field: 'isActive', message: 'isActive must be true or false.' },
      ]);
    }
  }

  return result;
}
