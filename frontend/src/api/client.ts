import type { FieldError } from '../types/auth';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export class ApiError extends Error {
  readonly status: number;
  readonly details: FieldError[];

  constructor(status: number, message: string, details: FieldError[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

type ErrorBody = {
  error?: {
    message?: string;
    details?: FieldError[];
  };
};

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    });
  } catch {
    throw new ApiError(0, 'Unable to reach the server.');
  }

  const text = await response.text();
  const payload = text ? parseJson(text) : null;

  if (!response.ok) {
    const error = readError(payload);
    throw new ApiError(response.status, error.message, error.details);
  }

  return payload as T;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function readError(payload: unknown): { message: string; details: FieldError[] } {
  const body = payload as ErrorBody;
  const details = Array.isArray(body?.error?.details)
    ? body.error.details.filter(
        (item) => item && typeof item.field === 'string' && typeof item.message === 'string',
      )
    : [];

  return {
    message: body?.error?.message || 'Request failed',
    details,
  };
}
