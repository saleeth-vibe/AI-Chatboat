import { ApiError } from './client';

export function messageOf(caught: unknown, fallback: string): string {
  return caught instanceof ApiError ? caught.message : fallback;
}

export function fieldsOf(caught: unknown): Record<string, string> {
  if (!(caught instanceof ApiError)) {
    return {};
  }
  const fields: Record<string, string> = {};
  for (const detail of caught.details) {
    fields[detail.field] = detail.message;
  }
  return fields;
}
