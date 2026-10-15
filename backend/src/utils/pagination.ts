import { AppError } from './errors';

export type Pagination = {
  page: number;
  pageSize: number;
};

export type PageMeta = Pagination & {
  total: number;
  totalPages: number;
};

export function pageMeta(page: number, pageSize: number, total: number): PageMeta {
  return {
    page,
    pageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  };
}

export function parsePagination(query: Record<string, unknown>): Pagination {
  return {
    page: readPositiveInt(query.page, 1, 'page'),
    pageSize: readPositiveInt(query.pageSize, 20, 'pageSize', 100),
  };
}

function readPositiveInt(value: unknown, fallback: number, field: string, max?: number): number {
  if (value === undefined || value === '') {
    return fallback;
  }
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', [
      { field, message: `${field} must be a positive whole number.` },
    ]);
  }

  const parsed = Number(value);
  if (parsed < 1 || (max !== undefined && parsed > max)) {
    const message = max === undefined ? `${field} must be at least 1.` : `${field} must be from 1 to ${max}.`;
    throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', [{ field, message }]);
  }

  return parsed;
}
