import { Op, type WhereOptions } from 'sequelize';
import { Course, Department } from '../models';
import { notFound, rethrowUnique, unprocessable } from '../utils/errors';
import { escapeLike, type ListQuery } from '../utils/request';
import { pageMeta } from '../utils/pagination';

export type CourseInput = {
  code: string;
  name: string;
  departmentId: number | null;
  description: string | null;
  isActive: boolean;
};

export type CoursePatch = {
  code?: string;
  name?: string;
  departmentId?: number | null;
  description?: string | null;
  isActive?: boolean;
};

export async function listCourses(query: ListQuery & { departmentId?: number }) {
  const where: WhereOptions<Course> = {};
  if (query.search) {
    const like = `%${escapeLike(query.search)}%`;
    Object.assign(where, { [Op.or]: [{ name: { [Op.like]: like } }, { code: { [Op.like]: like } }] });
  }
  if (query.isActive !== undefined) {
    where.isActive = query.isActive;
  }
  if (query.departmentId !== undefined) {
    where.departmentId = query.departmentId;
  }
  const { rows, count } = await Course.findAndCountAll({
    where,
    order: [['code', 'ASC']],
    limit: query.pageSize,
    offset: (query.page - 1) * query.pageSize,
  });
  const departments = await departmentNames(rows.map((course) => course.departmentId));
  return { data: rows.map((course) => toDto(course, departments)), meta: pageMeta(query.page, query.pageSize, count) };
}

export async function getCourse(id: number) {
  const course = await Course.findByPk(id);
  if (!course) {
    throw notFound('Course not found.');
  }
  const departments = await departmentNames([course.departmentId]);
  return toDto(course, departments);
}

export async function createCourse(input: CourseInput) {
  await assertDepartment(input.departmentId);
  try {
    const course = await Course.create(input);
    return getCourse(Number(course.id));
  } catch (error) {
    rethrowUnique(error, 'A course with this code already exists.', 'code');
  }
}

export async function updateCourse(id: number, input: CoursePatch) {
  const course = await Course.findByPk(id);
  if (!course) {
    throw notFound('Course not found.');
  }
  if (input.departmentId !== undefined) {
    await assertDepartment(input.departmentId);
  }
  try {
    await course.update({
      code: input.code ?? course.code,
      name: input.name ?? course.name,
      departmentId: input.departmentId === undefined ? course.departmentId : input.departmentId,
      description: input.description === undefined ? course.description : input.description,
      isActive: input.isActive ?? course.isActive,
    });
    return getCourse(id);
  } catch (error) {
    rethrowUnique(error, 'A course with this code already exists.', 'code');
  }
}

async function assertDepartment(departmentId: number | null) {
  if (departmentId === null) {
    return;
  }
  const department = await Department.findByPk(departmentId);
  if (!department) {
    throw unprocessable('Choose a department.', 'departmentId');
  }
}

async function departmentNames(ids: Array<number | null>) {
  const wanted = [...new Set(ids.filter((id): id is number => id !== null).map(Number))];
  const rows = wanted.length === 0 ? [] : await Department.findAll({ where: { id: wanted } });
  return new Map(rows.map((department) => [Number(department.id), department.name]));
}

function toDto(course: Course, departments: Map<number, string>) {
  const departmentId = course.departmentId === null ? null : Number(course.departmentId);
  return {
    id: Number(course.id),
    code: course.code,
    name: course.name,
    departmentId,
    departmentName: departmentId === null ? null : (departments.get(departmentId) ?? null),
    description: course.description,
    isActive: Boolean(course.isActive),
  };
}
