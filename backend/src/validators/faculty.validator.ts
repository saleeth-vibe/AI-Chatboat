import type { FieldError } from '../utils/errors';
import {
  expectObject,
  queryEnum,
  readBoolean,
  readCode,
  readEmail,
  readId,
  readListQuery,
  readRequiredString,
  rejectUnknown,
  throwDetails,
} from '../utils/request';
import type { EligibilityInput, FacultyInput, FacultyPatch } from '../services/faculty.service';

const CREATE_FIELDS = ['email', 'name', 'employeeNumber', 'affiliationType', 'branchId', 'departmentId', 'isActive'] as const;
const PATCH_FIELDS = ['email', 'name', 'affiliationType', 'branchId', 'departmentId', 'isActive'] as const;

export function validateFacultyList(query: unknown) {
  const record = expectObject(query, 'query');
  const list = readListQuery(query, 150);
  const affiliationType = queryEnum(record, 'affiliationType', ['BRANCH', 'DEPARTMENT'] as const);
  return affiliationType ? { ...list, affiliationType } : list;
}

export function validateCreateFaculty(body: unknown): FacultyInput {
  const record = expectObject(body);
  rejectUnknown(record, CREATE_FIELDS);
  const details: FieldError[] = [];
  const email = readEmail(record.email, details);
  const name = readRequiredString(record.name, 'name', 150, details);
  const employeeNumber = readCode(record.employeeNumber, 'employeeNumber', 50, details);
  const affiliation = readAffiliation(record, details, true);
  const isActive = readBoolean(record.isActive, 'isActive', details, true);
  throwDetails(details);
  return {
    email: email!,
    name: name!,
    employeeNumber: employeeNumber!,
    affiliationType: affiliation.type!,
    branchId: affiliation.branchId,
    departmentId: affiliation.departmentId,
    isActive: isActive!,
  };
}

export function validateUpdateFaculty(body: unknown): FacultyPatch {
  const record = expectObject(body);
  rejectUnknown(record, PATCH_FIELDS);
  const details: FieldError[] = [];
  const patch: FacultyPatch = {};
  if ('email' in record) {
    const email = readEmail(record.email, details);
    if (email) {
      patch.email = email;
    }
  }
  if ('name' in record) {
    const name = readRequiredString(record.name, 'name', 150, details);
    if (name) {
      patch.name = name;
    }
  }
  if ('affiliationType' in record || 'branchId' in record || 'departmentId' in record) {
    const affiliation = readAffiliation(record, details, false);
    if (affiliation.type) {
      patch.affiliationType = affiliation.type;
      patch.branchId = affiliation.branchId;
      patch.departmentId = affiliation.departmentId;
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

export function validateEligibility(body: unknown): EligibilityInput {
  const record = expectObject(body);
  rejectUnknown(record, ['courseId', 'academicTermId']);
  const details: FieldError[] = [];
  const courseId = readId(record.courseId, 'courseId', details, true);
  const academicTermId = readId(record.academicTermId, 'academicTermId', details, true);
  throwDetails(details);
  return { courseId: courseId as number, academicTermId: academicTermId as number };
}

function readAffiliation(
  record: Record<string, unknown>,
  details: FieldError[],
  required: boolean,
): { type: 'BRANCH' | 'DEPARTMENT' | undefined; branchId: number | null; departmentId: number | null } {
  const type = record.affiliationType;
  if (type !== 'BRANCH' && type !== 'DEPARTMENT') {
    if (required || 'affiliationType' in record) {
      details.push({ field: 'affiliationType', message: 'Choose a branch or a department.' });
    }
    return { type: undefined, branchId: null as number | null, departmentId: null as number | null };
  }
  const branchId = readId(record.branchId, 'branchId', details, type === 'BRANCH');
  const departmentId = readId(record.departmentId, 'departmentId', details, type === 'DEPARTMENT');
  if (type === 'BRANCH' && departmentId) {
    details.push({ field: 'departmentId', message: 'A branch faculty member has no department.' });
  }
  if (type === 'DEPARTMENT' && branchId) {
    details.push({ field: 'branchId', message: 'A department faculty member has no branch.' });
  }
  return {
    type,
    branchId: type === 'BRANCH' && typeof branchId === 'number' ? branchId : null,
    departmentId: type === 'DEPARTMENT' && typeof departmentId === 'number' ? departmentId : null,
  };
}
