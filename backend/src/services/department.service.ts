import { Op, type WhereOptions } from 'sequelize';
import { Department } from '../models';
import { notFound, rethrowUnique } from '../utils/errors';
import { escapeLike } from '../utils/request';
import { pageMeta, type PageMeta } from '../utils/pagination';
import type { ListQuery } from '../utils/request';

export type DepartmentInput = { name: string; code: string; isActive: boolean };
export type DepartmentPatch = { name?: string; code?: string; isActive?: boolean };

export async function listDepartments(query: ListQuery) {
  const where: WhereOptions<Department> = {};
  if (query.search) {
    const like = `%${escapeLike(query.search)}%`;
    Object.assign(where, { [Op.or]: [{ name: { [Op.like]: like } }, { code: { [Op.like]: like } }] });
  }
  if (query.isActive !== undefined) {
    where.isActive = query.isActive;
  }
  const { rows, count } = await Department.findAndCountAll({
    where,
    order: [['code', 'ASC']],
    limit: query.pageSize,
    offset: (query.page - 1) * query.pageSize,
  });
  return { data: rows.map(toDto), meta: pageMeta(query.page, query.pageSize, count) satisfies PageMeta };
}

export async function getDepartment(id: number) {
  const department = await Department.findByPk(id);
  if (!department) {
    throw notFound('Department not found.');
  }
  return toDto(department);
}

export async function createDepartment(input: DepartmentInput) {
  try {
    const department = await Department.create({ name: input.name, code: input.code, isActive: input.isActive });
    return toDto(department);
  } catch (error) {
    rethrowUnique(error, 'A department with this code already exists.', 'code');
  }
}

export async function updateDepartment(id: number, input: DepartmentPatch) {
  const department = await Department.findByPk(id);
  if (!department) {
    throw notFound('Department not found.');
  }
  try {
    await department.update({
      name: input.name ?? department.name,
      code: input.code ?? department.code,
      isActive: input.isActive ?? department.isActive,
    });
    return toDto(department);
  } catch (error) {
    rethrowUnique(error, 'A department with this code already exists.', 'code');
  }
}

function toDto(department: Department) {
  return {
    id: Number(department.id),
    name: department.name,
    code: department.code,
    isActive: Boolean(department.isActive),
  };
}
