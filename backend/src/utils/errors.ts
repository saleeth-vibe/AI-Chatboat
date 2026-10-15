import { UniqueConstraintError } from 'sequelize';

export type FieldError = {
  field: string;
  message: string;
};

export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: FieldError[];

  constructor(status: number, code: string, message: string, details?: FieldError[]) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function conflict(message: string, field?: string): AppError {
  return new AppError(409, 'CONFLICT', message, field ? [{ field, message }] : undefined);
}

export function unprocessable(message: string, field?: string): AppError {
  return new AppError(422, 'UNPROCESSABLE', message, field ? [{ field, message }] : undefined);
}

export function notFound(message: string): AppError {
  return new AppError(404, 'NOT_FOUND', message);
}

export function rethrowUnique(error: unknown, message: string, field: string): never {
  if (error instanceof UniqueConstraintError) {
    throw conflict(message, field);
  }
  throw error;
}
