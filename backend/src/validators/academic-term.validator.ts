import { parseDateOnly } from '../utils/dates';
import type { FieldError } from '../utils/errors';
import { expectObject, rejectUnknown, throwDetails } from '../utils/request';
import type { TermInput, TermPatch } from '../services/academic-term.service';

const CREATE_FIELDS = ['periodType', 'startDate', 'endDate'] as const;
const PATCH_FIELDS = ['startDate', 'endDate'] as const;

export function validateCreateTerm(body: unknown): TermInput {
  const record = expectObject(body);
  rejectUnknown(record, CREATE_FIELDS);
  const details: FieldError[] = [];
  const periodType = readPeriod(record.periodType, details);
  const startDate = readDate(record.startDate, 'startDate', details);
  const endDate = readDate(record.endDate, 'endDate', details);
  throwDetails(details);
  if (!periodType || !startDate || !endDate) {
    throwDetails([{ field: 'body', message: 'Term details are incomplete.' }]);
  }
  return { periodType: periodType!, startDate: startDate!, endDate: endDate! };
}

export function validateUpdateTerm(body: unknown): TermPatch {
  const record = expectObject(body);
  rejectUnknown(record, PATCH_FIELDS);
  const details: FieldError[] = [];
  const patch: TermPatch = {};
  if ('startDate' in record) {
    const startDate = readDate(record.startDate, 'startDate', details);
    if (startDate) {
      patch.startDate = startDate;
    }
  }
  if ('endDate' in record) {
    const endDate = readDate(record.endDate, 'endDate', details);
    if (endDate) {
      patch.endDate = endDate;
    }
  }
  throwDetails(details);
  if (!patch.startDate && !patch.endDate) {
    throwDetails([{ field: 'body', message: 'Provide a start date or an end date.' }]);
  }
  return patch;
}

function readPeriod(value: unknown, details: FieldError[]) {
  if (value !== 'ODD' && value !== 'EVEN') {
    details.push({ field: 'periodType', message: 'Choose Odd or Even.' });
    return undefined;
  }
  return value;
}

function readDate(value: unknown, field: string, details: FieldError[]) {
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
