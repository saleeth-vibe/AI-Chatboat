import type { FieldError } from '../utils/errors';
import {
  expectObject,
  queryId,
  readBoolean,
  readCode,
  readId,
  readListQuery,
  readOptionalString,
  readRequiredString,
  rejectUnknown,
  throwDetails,
  type ListQuery,
} from '../utils/request';
import type { CourseInput, CoursePatch } from '../services/course.service';

const FIELDS = ['code', 'name', 'departmentId', 'description', 'isActive'] as const;

export function validateCourseList(query: unknown): ListQuery & { departmentId?: number } {
  const record = expectObject(query, 'query');
  const list = readListQuery(query, 150);
  const departmentId = queryId(record, 'departmentId', false);
  return departmentId === undefined ? list : { ...list, departmentId };
}

export function validateCreateCourse(body: unknown): CourseInput {
  const record = expectObject(body);
  rejectUnknown(record, FIELDS);
  const parsed = readCourse(record, true);
  return {
    code: parsed.code!,
    name: parsed.name!,
    departmentId: parsed.departmentId ?? null,
    description: parsed.description ?? null,
    isActive: parsed.isActive ?? true,
  };
}

export function validateUpdateCourse(body: unknown): CoursePatch {
  const record = expectObject(body);
  rejectUnknown(record, FIELDS);
  const patch = readCourse(record, false);
  if (Object.keys(patch).length === 0) {
    throwDetails([{ field: 'body', message: 'Provide at least one field to update.' }]);
  }
  return patch;
}

function readCourse(record: Record<string, unknown>, creating: boolean): CoursePatch {
  const details: FieldError[] = [];
  const patch: CoursePatch = {};
  if (creating || 'code' in record) {
    const code = readCode(record.code, 'code', 30, details);
    if (code) {
      patch.code = code;
    }
  }
  if (creating || 'name' in record) {
    const name = readRequiredString(record.name, 'name', 150, details);
    if (name) {
      patch.name = name;
    }
  }
  if (creating || 'departmentId' in record) {
    const departmentId = readId(record.departmentId, 'departmentId', details, false);
    if (departmentId !== undefined) {
      patch.departmentId = departmentId;
    } else if (creating && !details.some((item) => item.field === 'departmentId')) {
      patch.departmentId = null;
    }
  }
  if ('description' in record || creating) {
    const description = readOptionalString(record.description, 'description', 2000, details);
    if (description !== undefined) {
      patch.description = description;
    }
  }
  if ('isActive' in record || creating) {
    const isActive = readBoolean(record.isActive, 'isActive', details, creating ? true : undefined);
    if (isActive !== undefined) {
      patch.isActive = isActive;
    }
  }
  throwDetails(details);
  return patch;
}
