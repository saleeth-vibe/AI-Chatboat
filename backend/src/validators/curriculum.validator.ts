import type { FieldError } from '../utils/errors';
import {
  expectObject,
  queryEnum,
  queryId,
  readBoolean,
  readId,
  readInt,
  readListQuery,
  readRequiredString,
  rejectUnknown,
  throwDetails,
} from '../utils/request';
import type { CurriculumInput, CurriculumPatch } from '../services/curriculum.service';

const CREATE_FIELDS = ['name', 'scopeType', 'branchId', 'semesterLevel', 'cycleType', 'isActive'] as const;
const PATCH_FIELDS = ['name', 'isActive'] as const;

export function validateCurriculumList(query: unknown) {
  const record = expectObject(query, 'query');
  const list = readListQuery(query, 150);
  const scopeType = queryEnum(record, 'scopeType', ['GLOBAL_CYCLE', 'BRANCH'] as const);
  const branchId = queryId(record, 'branchId', false);
  return { ...list, ...(scopeType ? { scopeType } : {}), ...(branchId ? { branchId } : {}) };
}

export function validateCreateCurriculum(body: unknown): CurriculumInput {
  const record = expectObject(body);
  rejectUnknown(record, CREATE_FIELDS);
  const details: FieldError[] = [];
  const name = readRequiredString(record.name, 'name', 150, details);
  const scopeType = record.scopeType === 'GLOBAL_CYCLE' || record.scopeType === 'BRANCH' ? record.scopeType : undefined;
  if (!scopeType) {
    details.push({ field: 'scopeType', message: 'Choose a global cycle or a branch curriculum.' });
  }
  const isActive = readBoolean(record.isActive, 'isActive', details, true);
  let branchId: number | null = null;
  let semesterLevel: number | null = null;
  let cycleType: 'P' | 'C' | null = null;

  if (scopeType === 'GLOBAL_CYCLE') {
    if (record.branchId != null || record.semesterLevel != null) {
      details.push({ field: 'scopeType', message: 'A global cycle has no branch and no semester.' });
    }
    if (record.cycleType !== 'P' && record.cycleType !== 'C') {
      details.push({ field: 'cycleType', message: 'Choose cycle P or C.' });
    } else {
      cycleType = record.cycleType;
    }
  }
  if (scopeType === 'BRANCH') {
    if (record.cycleType != null) {
      details.push({ field: 'cycleType', message: 'A branch curriculum does not use a cycle.' });
    }
    const parsedBranch = readId(record.branchId, 'branchId', details, true);
    const parsedSemester = readInt(record.semesterLevel, 'semesterLevel', 1, 12, details);
    branchId = typeof parsedBranch === 'number' ? parsedBranch : null;
    semesterLevel = parsedSemester ?? null;
  }

  throwDetails(details);
  return { name: name!, scopeType: scopeType!, branchId, semesterLevel, cycleType, isActive: isActive! };
}

export function validateUpdateCurriculum(body: unknown): CurriculumPatch {
  const record = expectObject(body);
  rejectUnknown(record, PATCH_FIELDS);
  const details: FieldError[] = [];
  const patch: CurriculumPatch = {};
  if ('name' in record) {
    const name = readRequiredString(record.name, 'name', 150, details);
    if (name) {
      patch.name = name;
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

export function validateCurriculumCourses(body: unknown): number[] {
  const record = expectObject(body);
  rejectUnknown(record, ['courseIds']);
  if (!Array.isArray(record.courseIds)) {
    throwDetails([{ field: 'courseIds', message: 'Provide a list of courses.' }]);
  }
  const courseIds = record.courseIds as unknown[];
  if (courseIds.length > 100) {
    throwDetails([{ field: 'courseIds', message: 'Select 100 courses or fewer.' }]);
  }
  const details: FieldError[] = [];
  const ids = courseIds.map((value, index) => {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
      details.push({ field: `courseIds.${index}`, message: 'Choose a valid course.' });
      return 0;
    }
    return value;
  });
  throwDetails(details);
  return ids;
}
