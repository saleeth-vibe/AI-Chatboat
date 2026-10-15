import type { FieldError } from '../utils/errors';
import {
  expectObject,
  readBoolean,
  readCode,
  readInt,
  readListQuery,
  readRequiredString,
  rejectUnknown,
  throwDetails,
  type ListQuery,
} from '../utils/request';
import type { BranchInput, BranchPatch, ClassPatch } from '../services/branch.service';

const CREATE_FIELDS = ['name', 'code', 'durationYears', 'sectionsPerYear', 'classCapacity', 'supportsFirstYearCycles', 'isActive'] as const;
const PATCH_FIELDS = ['name', 'classCapacity', 'isActive'] as const;
const CLASS_FIELDS = ['capacity', 'isActive'] as const;

export function validateBranchList(query: unknown): ListQuery {
  return readListQuery(query, 150);
}

export function validateCreateBranch(body: unknown): BranchInput {
  const record = expectObject(body);
  rejectUnknown(record, CREATE_FIELDS);
  const details: FieldError[] = [];
  const name = readRequiredString(record.name, 'name', 150, details);
  const code = readCode(record.code, 'code', 20, details);
  const durationYears = readInt(record.durationYears, 'durationYears', 1, 6, details);
  const sectionsPerYear = readInt(record.sectionsPerYear, 'sectionsPerYear', 1, 26, details);
  const classCapacity = readInt(record.classCapacity, 'classCapacity', 1, 500, details);
  const supportsFirstYearCycles = readBoolean(record.supportsFirstYearCycles, 'supportsFirstYearCycles', details);
  const isActive = readBoolean(record.isActive, 'isActive', details, true);
  if (supportsFirstYearCycles === undefined && !('supportsFirstYearCycles' in record)) {
    details.push({ field: 'supportsFirstYearCycles', message: 'Choose whether this branch uses P and C cycles.' });
  }
  throwDetails(details);
  return {
    name: name!,
    code: code!,
    durationYears: durationYears!,
    sectionsPerYear: sectionsPerYear!,
    classCapacity: classCapacity!,
    supportsFirstYearCycles: supportsFirstYearCycles!,
    isActive: isActive!,
  };
}

export function validateUpdateBranch(body: unknown): BranchPatch {
  const record = expectObject(body);
  rejectUnknown(record, PATCH_FIELDS);
  const details: FieldError[] = [];
  const patch: BranchPatch = {};
  if ('name' in record) {
    const name = readRequiredString(record.name, 'name', 150, details);
    if (name) {
      patch.name = name;
    }
  }
  if ('classCapacity' in record) {
    const classCapacity = readInt(record.classCapacity, 'classCapacity', 1, 500, details);
    if (classCapacity !== undefined) {
      patch.classCapacity = classCapacity;
    }
  }
  if ('isActive' in record) {
    const isActive = readBoolean(record.isActive, 'isActive', details);
    if (isActive !== undefined) {
      patch.isActive = isActive;
    }
  }
  throwDetails(details);
  if (Object.keys(patch).length === 0) {
    throwDetails([{ field: 'body', message: 'Provide at least one field to update.' }]);
  }
  return patch;
}

export function validateUpdateClass(body: unknown): ClassPatch {
  const record = expectObject(body);
  rejectUnknown(record, CLASS_FIELDS);
  const details: FieldError[] = [];
  const patch: ClassPatch = {};
  if ('capacity' in record) {
    const capacity = readInt(record.capacity, 'capacity', 1, 500, details);
    if (capacity !== undefined) {
      patch.capacity = capacity;
    }
  }
  if ('isActive' in record) {
    const isActive = readBoolean(record.isActive, 'isActive', details);
    if (isActive !== undefined) {
      patch.isActive = isActive;
    }
  }
  throwDetails(details);
  if (Object.keys(patch).length === 0) {
    throwDetails([{ field: 'body', message: 'Provide a capacity or an active flag.' }]);
  }
  return patch;
}
