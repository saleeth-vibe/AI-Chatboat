import { AppError, type FieldError } from '../utils/errors';
import { isEndAfterStart, parseDateOnly } from '../utils/dates';
import { parsePagination, type Pagination } from '../utils/pagination';

export type AcademicYearInput = {
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

export type AcademicYearPatch = {
  name?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
};

export type AcademicYearListQuery = Pagination & {
  search?: string;
  isActive?: boolean;
};

const CREATE_FIELDS = ['name', 'startDate', 'endDate', 'isActive'] as const;
const PATCH_FIELDS = ['name', 'startDate', 'endDate', 'isActive'] as const;

export function validateCreateAcademicYear(body: unknown): AcademicYearInput {
  const record = expectObject(body);
  rejectUnknownFields(record, CREATE_FIELDS);
  const details: FieldError[] = [];
  const name = readName(record.name, details, true);
  const startDate = readDate(record.startDate, 'startDate', details, true);
  const endDate = readDate(record.endDate, 'endDate', details, true);
  const isActive = readActive(record.isActive, details, true);

  if (startDate && endDate && !isEndAfterStart(startDate, endDate)) {
    details.push({ field: 'endDate', message: 'End date must be after start date.' });
  }

  if (details.length > 0 || !name || !startDate || !endDate || isActive === undefined) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', details);
  }

  return { name, startDate, endDate, isActive };
}

export function validateUpdateAcademicYear(body: unknown): AcademicYearPatch {
  const record = expectObject(body);
  rejectUnknownFields(record, PATCH_FIELDS);
  const details: FieldError[] = [];
  const patch: AcademicYearPatch = {};

  if ('name' in record) {
    const name = readName(record.name, details, true);
    if (name) {
      patch.name = name;
    }
  }
  if ('startDate' in record) {
    const startDate = readDate(record.startDate, 'startDate', details, true);
    if (startDate) {
      patch.startDate = startDate;
    }
  }
  if ('endDate' in record) {
    const endDate = readDate(record.endDate, 'endDate', details, true);
    if (endDate) {
      patch.endDate = endDate;
    }
  }
  if ('isActive' in record) {
    const isActive = readActive(record.isActive, details, false);
    if (isActive !== undefined) {
      patch.isActive = isActive;
    }
  }

  if (patch.startDate && patch.endDate && !isEndAfterStart(patch.startDate, patch.endDate)) {
    details.push({ field: 'endDate', message: 'End date must be after start date.' });
  }

  if (details.length > 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', details);
  }
  if (Object.keys(patch).length === 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', [
      { field: 'body', message: 'Provide at least one field to update.' },
    ]);
  }

  return patch;
}

export function validateAcademicYearListQuery(query: unknown): AcademicYearListQuery {
  const record = expectObject(query);
  const pagination = parsePagination(record);
  const result: AcademicYearListQuery = { ...pagination };

  if (record.search !== undefined && record.search !== '') {
    if (typeof record.search !== 'string') {
      throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', [
        { field: 'search', message: 'Search must be text.' },
      ]);
    }
    const search = record.search.trim();
    if (search.length > 20) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', [
        { field: 'search', message: 'Search must be 20 characters or fewer.' },
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

export function parseRouteId(value: string | undefined): number {
  if (!value || !/^\d+$/.test(value)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', [
      { field: 'id', message: 'Id must be a positive whole number.' },
    ]);
  }
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', [
      { field: 'id', message: 'Id must be a positive whole number.' },
    ]);
  }
  return id;
}

function expectObject(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', [
      { field: 'body', message: 'Expected an object' },
    ]);
  }
  return value;
}

function rejectUnknownFields(record: Record<string, unknown>, allowed: readonly string[]): void {
  const details: FieldError[] = [];
  for (const key of Object.keys(record)) {
    if (!allowed.includes(key)) {
      details.push({ field: key, message: 'This field is not accepted.' });
    }
  }
  if (details.length > 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', details);
  }
}

function readName(value: unknown, details: FieldError[], required: boolean): string | undefined {
  if (value === undefined && !required) {
    return undefined;
  }
  if (typeof value !== 'string' || value.trim() === '') {
    details.push({ field: 'name', message: 'Name is required.' });
    return undefined;
  }
  const name = value.trim();
  if (name.length > 20) {
    details.push({ field: 'name', message: 'Name must be 20 characters or fewer.' });
    return undefined;
  }
  return name;
}

function readDate(value: unknown, field: 'startDate' | 'endDate', details: FieldError[], required: boolean): string | undefined {
  if (value === undefined && !required) {
    return undefined;
  }
  if (typeof value !== 'string') {
    details.push({ field, message: 'Enter a date as YYYY-MM-DD.' });
    return undefined;
  }
  const parsed = parseDateOnly(value);
  if (!parsed) {
    details.push({ field, message: 'Enter a valid date as YYYY-MM-DD.' });
    return undefined;
  }
  return parsed;
}

function readActive(value: unknown, details: FieldError[], defaultWhenMissing: boolean): boolean | undefined {
  if (value === undefined) {
    return defaultWhenMissing ? true : undefined;
  }
  if (typeof value !== 'boolean') {
    details.push({ field: 'isActive', message: 'Active must be true or false.' });
    return undefined;
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
