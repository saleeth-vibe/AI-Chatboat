import type { FieldError } from '../utils/errors';
import {
  expectObject,
  readBoolean,
  readCode,
  readListQuery,
  readRequiredString,
  rejectUnknown,
  throwDetails,
  type ListQuery,
} from '../utils/request';
import type { DepartmentInput, DepartmentPatch } from '../services/department.service';

const FIELDS = ['name', 'code', 'isActive'] as const;

export function validateDepartmentList(query: unknown): ListQuery {
  return readListQuery(query, 150);
}

export function validateCreateDepartment(body: unknown): DepartmentInput {
  const record = expectObject(body);
  rejectUnknown(record, FIELDS);
  const details: FieldError[] = [];
  const name = readRequiredString(record.name, 'name', 150, details);
  const code = readCode(record.code, 'code', 20, details);
  const isActive = readBoolean(record.isActive, 'isActive', details, true);
  throwDetails(details);
  return { name: name!, code: code!, isActive: isActive! };
}

export function validateUpdateDepartment(body: unknown): DepartmentPatch {
  const record = expectObject(body);
  rejectUnknown(record, FIELDS);
  const details: FieldError[] = [];
  const patch: DepartmentPatch = {};
  if ('name' in record) {
    const name = readRequiredString(record.name, 'name', 150, details);
    if (name) {
      patch.name = name;
    }
  }
  if ('code' in record) {
    const code = readCode(record.code, 'code', 20, details);
    if (code) {
      patch.code = code;
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
