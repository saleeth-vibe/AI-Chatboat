import type { FieldError } from '../utils/errors';
import {
  expectObject,
  queryEnum,
  queryId,
  readBoolean,
  readEmail,
  readId,
  readInt,
  readListQuery,
  readRequiredString,
  rejectUnknown,
  throwDetails,
} from '../utils/request';
import type { PromotionInput, StudentInput, StudentPatch } from '../services/student.service';

const CREATE_FIELDS = ['email', 'name', 'branchId', 'entryYearLevel', 'academicYearId'] as const;
const PATCH_FIELDS = ['name', 'email', 'isActive'] as const;

export function validateStudentList(query: unknown) {
  const record = expectObject(query, 'query');
  const list = readListQuery(query, 150);
  const branchId = queryId(record, 'branchId', false);
  return branchId === undefined ? list : { ...list, branchId };
}

export function validateCreateStudent(body: unknown): StudentInput {
  const record = expectObject(body);
  rejectUnknown(record, CREATE_FIELDS);
  const details: FieldError[] = [];
  const email = readEmail(record.email, details);
  const name = readRequiredString(record.name, 'name', 150, details);
  const branchId = readId(record.branchId, 'branchId', details, true);
  const entryYearLevel = readInt(record.entryYearLevel, 'entryYearLevel', 1, 6, details);
  const academicYearId = readId(record.academicYearId, 'academicYearId', details, true);
  throwDetails(details);
  return {
    email: email!,
    name: name!,
    branchId: branchId as number,
    entryYearLevel: entryYearLevel!,
    academicYearId: academicYearId as number,
  };
}

export function validateUpdateStudent(body: unknown): StudentPatch {
  const record = expectObject(body);
  rejectUnknown(record, PATCH_FIELDS);
  const details: FieldError[] = [];
  const patch: StudentPatch = {};
  if ('name' in record) {
    const name = readRequiredString(record.name, 'name', 150, details);
    if (name) {
      patch.name = name;
    }
  }
  if ('email' in record) {
    const email = readEmail(record.email, details);
    if (email) {
      patch.email = email;
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

export function validateClassStudentQuery(query: unknown) {
  const record = expectObject(query, 'query');
  return queryEnum(record, 'status', ['ACTIVE', 'COMPLETED', 'TRANSFERRED'] as const);
}

export function validatePromotion(body: unknown): PromotionInput {
  const record = expectObject(body);
  rejectUnknown(record, ['academicYearId', 'studentIds']);
  const details: FieldError[] = [];
  const academicYearId = readId(record.academicYearId, 'academicYearId', details, true);
  if (!Array.isArray(record.studentIds) || record.studentIds.length === 0) {
    details.push({ field: 'studentIds', message: 'Choose at least one student.' });
  } else if (record.studentIds.length > 100) {
    details.push({ field: 'studentIds', message: 'Promote 100 students or fewer at a time.' });
  }
  const studentIds = Array.isArray(record.studentIds)
    ? record.studentIds.map((value, index) => {
        if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
          details.push({ field: `studentIds.${index}`, message: 'Choose a valid student.' });
          return 0;
        }
        return value;
      })
    : [];
  throwDetails(details);
  return { academicYearId: academicYearId as number, studentIds };
}
