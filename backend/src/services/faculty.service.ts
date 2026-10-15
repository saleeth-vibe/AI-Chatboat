import { Op, type WhereOptions } from 'sequelize';
import { sequelize } from '../database/connection';
import {
  AcademicTerm,
  AcademicYear,
  Branch,
  ClassCourseOffering,
  ClassCurriculumAssignment,
  Course,
  Department,
  Faculty,
  FacultyCourseAssignment,
  User,
} from '../models';
import { asDateOnly } from '../utils/dates';
import { conflict, notFound, rethrowUnique, unprocessable } from '../utils/errors';
import { generatePassword, hashPassword } from '../utils/password';
import { escapeLike, type ListQuery } from '../utils/request';
import { pageMeta } from '../utils/pagination';

export type FacultyInput = {
  email: string;
  name: string;
  employeeNumber: string;
  affiliationType: 'BRANCH' | 'DEPARTMENT';
  branchId: number | null;
  departmentId: number | null;
  isActive: boolean;
};

export type FacultyPatch = {
  email?: string;
  name?: string;
  affiliationType?: 'BRANCH' | 'DEPARTMENT';
  branchId?: number | null;
  departmentId?: number | null;
  isActive?: boolean;
};

export type EligibilityInput = {
  courseId: number;
  academicTermId: number;
};

export async function listFaculty(query: ListQuery & { affiliationType?: 'BRANCH' | 'DEPARTMENT' }) {
  const where: WhereOptions<Faculty> = {};
  if (query.search) {
    const like = `%${escapeLike(query.search)}%`;
    Object.assign(where, { [Op.or]: [{ name: { [Op.like]: like } }, { employeeNumber: { [Op.like]: like } }] });
  }
  if (query.isActive !== undefined) {
    where.isActive = query.isActive;
  }
  if (query.affiliationType) {
    where.affiliationType = query.affiliationType;
  }
  const { rows, count } = await Faculty.findAndCountAll({
    where,
    order: [['name', 'ASC']],
    limit: query.pageSize,
    offset: (query.page - 1) * query.pageSize,
  });
  return { data: await mapFaculty(rows), meta: pageMeta(query.page, query.pageSize, count) };
}

export async function getFaculty(id: number) {
  const faculty = await Faculty.findByPk(id);
  if (!faculty) {
    throw notFound('Faculty member not found.');
  }
  const [dto] = await mapFaculty([faculty]);
  return dto;
}

export async function createFaculty(input: FacultyInput) {
  await assertAffiliation(input.affiliationType, input.branchId, input.departmentId);
  const password = generatePassword();
  const passwordHash = await hashPassword(password);
  try {
    return await sequelize.transaction(async (transaction) => {
      const user = await User.create(
        {
          email: input.email,
          passwordHash,
          role: 'FACULTY',
          isActive: input.isActive,
          mustChangePassword: true,
          initialPassword: password,
        },
        { transaction },
      );
      const faculty = await Faculty.create(
        {
          userId: user.id,
          employeeNumber: input.employeeNumber,
          name: input.name,
          affiliationType: input.affiliationType,
          branchId: input.affiliationType === 'BRANCH' ? input.branchId : null,
          departmentId: input.affiliationType === 'DEPARTMENT' ? input.departmentId : null,
          isActive: input.isActive,
        },
        { transaction },
      );
      const [dto] = await mapFaculty([faculty], transaction);
      return dto;
    });
  } catch (error) {
    rethrowUnique(error, 'That email or employee number is already in use.', 'email');
  }
}

export async function updateFaculty(id: number, input: FacultyPatch) {
  const faculty = await Faculty.findByPk(id);
  if (!faculty) {
    throw notFound('Faculty member not found.');
  }
  const affiliationType = input.affiliationType ?? faculty.affiliationType;
  const branchId = input.branchId === undefined ? nullableId(faculty.branchId) : input.branchId;
  const departmentId = input.departmentId === undefined ? nullableId(faculty.departmentId) : input.departmentId;
  if (input.affiliationType || input.branchId !== undefined || input.departmentId !== undefined) {
    await assertAffiliation(affiliationType, affiliationType === 'BRANCH' ? branchId : null, affiliationType === 'DEPARTMENT' ? departmentId : null);
  }
  const user = await User.unscoped().findByPk(faculty.userId);
  if (!user) {
    throw notFound('Faculty account not found.');
  }

  try {
    await sequelize.transaction(async (transaction) => {
      const userChanges: { email?: string; isActive?: boolean } = {};
      if (input.email) {
        userChanges.email = input.email;
      }
      if (input.isActive !== undefined) {
        userChanges.isActive = input.isActive;
      }
      if (Object.keys(userChanges).length > 0) {
        await user.update(userChanges, { transaction });
      }
      await faculty.update(
        {
          name: input.name ?? faculty.name,
          affiliationType,
          branchId: affiliationType === 'BRANCH' ? branchId : null,
          departmentId: affiliationType === 'DEPARTMENT' ? departmentId : null,
          isActive: input.isActive ?? faculty.isActive,
        },
        { transaction },
      );
    });
  } catch (error) {
    rethrowUnique(error, 'That email is already in use.', 'email');
  }
  return getFaculty(id);
}

export async function listEligibility(facultyId: number) {
  await getFaculty(facultyId);
  const rows = await FacultyCourseAssignment.findAll({
    where: { facultyId },
    order: [['academicTermId', 'DESC']],
  });
  return mapEligibility(rows);
}

export async function addEligibility(facultyId: number, input: EligibilityInput) {
  const faculty = await Faculty.findByPk(facultyId);
  if (!faculty || !faculty.isActive) {
    throw unprocessable('Choose an active faculty member.', 'facultyId');
  }
  const course = await Course.findByPk(input.courseId);
  if (!course || !course.isActive) {
    throw unprocessable('Choose an active course.', 'courseId');
  }
  const term = await AcademicTerm.findByPk(input.academicTermId);
  if (!term) {
    throw unprocessable('Choose an academic term.', 'academicTermId');
  }
  try {
    const row = await FacultyCourseAssignment.create({
      facultyId,
      courseId: input.courseId,
      academicTermId: input.academicTermId,
      status: 'ACTIVE',
    });
    const [dto] = await mapEligibility([row]);
    return dto;
  } catch (error) {
    rethrowUnique(error, 'This faculty member is already eligible for that course in this term.', 'courseId');
  }
}

export async function removeEligibility(facultyId: number, assignmentId: number) {
  const row = await FacultyCourseAssignment.findOne({ where: { id: assignmentId, facultyId } });
  if (!row) {
    throw notFound('Course eligibility not found.');
  }
  const used = await ClassCourseOffering.count({
    where: { assignedFacultyId: facultyId, courseId: row.courseId },
    include: [{ model: ClassCurriculumAssignment, required: true, where: { academicTermId: row.academicTermId } }],
  });
  if (used > 0) {
    throw conflict('Unassign this faculty member from class offerings before removing eligibility.');
  }
  await row.destroy();
  return { success: true };
}

async function assertAffiliation(
  affiliationType: 'BRANCH' | 'DEPARTMENT',
  branchId: number | null,
  departmentId: number | null,
) {
  if (affiliationType === 'BRANCH') {
    if (!branchId || departmentId) {
      throw unprocessable('A branch faculty member needs a branch and no department.', 'branchId');
    }
    const branch = await Branch.findByPk(branchId);
    if (!branch) {
      throw unprocessable('Choose a branch.', 'branchId');
    }
    return;
  }
  if (!departmentId || branchId) {
    throw unprocessable('A department faculty member needs a department and no branch.', 'departmentId');
  }
  const department = await Department.findByPk(departmentId);
  if (!department) {
    throw unprocessable('Choose a department.', 'departmentId');
  }
}

async function mapFaculty(rows: Faculty[], transaction?: import('sequelize').Transaction) {
  const userIds = rows.map((row) => Number(row.userId));
  const users = userIds.length === 0 ? [] : await User.unscoped().findAll({ where: { id: userIds }, transaction });
  const accounts = new Map(users.map((user) => [Number(user.id), user]));
  const branchIds = ids(rows.map((row) => row.branchId));
  const departmentIds = ids(rows.map((row) => row.departmentId));
  const branches = branchIds.length === 0 ? [] : await Branch.findAll({ where: { id: branchIds }, transaction });
  const departments = departmentIds.length === 0 ? [] : await Department.findAll({ where: { id: departmentIds }, transaction });
  const branchCodes = new Map(branches.map((branch) => [Number(branch.id), branch.code]));
  const departmentCodes = new Map(departments.map((department) => [Number(department.id), department.code]));
  return rows.map((faculty) => {
    const account = accounts.get(Number(faculty.userId));
    return {
      id: Number(faculty.id),
      userId: Number(faculty.userId),
      email: account?.email ?? '',
      initialPassword: account?.mustChangePassword ? (account.initialPassword ?? null) : null,
      employeeNumber: faculty.employeeNumber,
      name: faculty.name,
      affiliationType: faculty.affiliationType,
      branchId: nullableId(faculty.branchId),
      departmentId: nullableId(faculty.departmentId),
      branchCode: faculty.branchId ? (branchCodes.get(Number(faculty.branchId)) ?? null) : null,
      departmentCode: faculty.departmentId ? (departmentCodes.get(Number(faculty.departmentId)) ?? null) : null,
      isActive: Boolean(faculty.isActive),
    };
  });
}

async function mapEligibility(rows: FacultyCourseAssignment[]) {
  const courses = await Course.findAll({ where: { id: rows.map((row) => row.courseId) } });
  const terms = await AcademicTerm.findAll({ where: { id: rows.map((row) => row.academicTermId) } });
  const years = await AcademicYear.findAll({ where: { id: terms.map((term) => term.academicYearId) } });
  const courseById = new Map(courses.map((course) => [Number(course.id), course]));
  const yearById = new Map(years.map((year) => [Number(year.id), year.name]));
  const termById = new Map(terms.map((term) => [Number(term.id), term]));
  return rows.map((row) => {
    const course = courseById.get(Number(row.courseId));
    const term = termById.get(Number(row.academicTermId));
    const yearName = term ? (yearById.get(Number(term.academicYearId)) ?? '') : '';
    return {
      id: Number(row.id),
      facultyId: Number(row.facultyId),
      courseId: Number(row.courseId),
      courseCode: course?.code ?? '',
      courseName: course?.name ?? '',
      academicTermId: Number(row.academicTermId),
      termLabel: term ? `${yearName} ${term.periodType}` : '',
      periodType: term?.periodType ?? null,
      startDate: term ? asDateOnly(term.startDate) : null,
      status: row.status,
    };
  });
}

function ids(values: Array<number | null>) {
  return [...new Set(values.filter((value): value is number => value !== null).map(Number))];
}

function nullableId(value: number | null) {
  return value === null ? null : Number(value);
}
