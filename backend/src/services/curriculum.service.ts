import { Op, type WhereOptions } from 'sequelize';
import { sequelize } from '../database/connection';
import { Branch, ClassCurriculumAssignment, Course, Curriculum, CurriculumCourse } from '../models';
import type { CycleType } from './academic-rules';
import { conflict, notFound, unprocessable } from '../utils/errors';
import { escapeLike, type ListQuery } from '../utils/request';
import { pageMeta } from '../utils/pagination';

export type CurriculumInput = {
  name: string;
  scopeType: 'GLOBAL_CYCLE' | 'BRANCH';
  branchId: number | null;
  semesterLevel: number | null;
  cycleType: CycleType | null;
  isActive: boolean;
};

export type CurriculumPatch = {
  name?: string;
  isActive?: boolean;
};

export async function listCurricula(query: ListQuery & { scopeType?: 'GLOBAL_CYCLE' | 'BRANCH'; branchId?: number }) {
  const where: WhereOptions<Curriculum> = {};
  if (query.search) {
    where.name = { [Op.like]: `%${escapeLike(query.search)}%` };
  }
  if (query.isActive !== undefined) {
    where.isActive = query.isActive;
  }
  if (query.scopeType) {
    where.scopeType = query.scopeType;
  }
  if (query.branchId !== undefined) {
    where.branchId = query.branchId;
  }
  const { rows, count } = await Curriculum.findAndCountAll({
    where,
    order: [['name', 'ASC']],
    limit: query.pageSize,
    offset: (query.page - 1) * query.pageSize,
  });
  const branches = await branchCodes(rows.map((row) => row.branchId));
  const counts = await courseCounts(rows.map((row) => Number(row.id)));
  return {
    data: rows.map((row) => toDto(row, branches, [], counts.get(Number(row.id)) ?? 0)),
    meta: pageMeta(query.page, query.pageSize, count),
  };
}

export async function getCurriculum(id: number) {
  const curriculum = await Curriculum.findByPk(id);
  if (!curriculum) {
    throw notFound('Curriculum not found.');
  }
  const courses = await coursesFor(id);
  const branches = await branchCodes([curriculum.branchId]);
  return toDto(curriculum, branches, courses, courses.length);
}

export async function createCurriculum(input: CurriculumInput) {
  return sequelize.transaction(async (transaction) => {
    if (input.scopeType === 'GLOBAL_CYCLE') {
      const existing = await Curriculum.findOne({
        where: { scopeType: 'GLOBAL_CYCLE', cycleType: input.cycleType },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (existing) {
        throw conflict('A global curriculum for this cycle already exists.', 'cycleType');
      }
    } else {
      if (input.branchId === null) {
        throw unprocessable('Choose a branch.', 'branchId');
      }
      const branch = await Branch.findByPk(input.branchId, { transaction });
      if (!branch) {
        throw unprocessable('Choose a branch.', 'branchId');
      }
      const maxSemester = Number(branch.durationYears) * 2;
      if (!input.semesterLevel || input.semesterLevel > maxSemester) {
        throw unprocessable(`Semester must be from 1 to ${maxSemester}.`, 'semesterLevel');
      }
      const existing = await Curriculum.findOne({
        where: { scopeType: 'BRANCH', branchId: input.branchId, semesterLevel: input.semesterLevel },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (existing) {
        throw conflict('This branch already has a curriculum for that semester.', 'semesterLevel');
      }
    }

    const curriculum = await Curriculum.create(
      {
        name: input.name,
        scopeType: input.scopeType,
        branchId: input.scopeType === 'BRANCH' ? input.branchId : null,
        semesterLevel: input.scopeType === 'BRANCH' ? input.semesterLevel : null,
        cycleType: input.scopeType === 'GLOBAL_CYCLE' ? input.cycleType : null,
        isActive: input.isActive,
      },
      { transaction },
    );
    const branches = await branchCodes([curriculum.branchId]);
    return toDto(curriculum, branches, [], 0);
  });
}

export async function updateCurriculum(id: number, input: CurriculumPatch) {
  const curriculum = await Curriculum.findByPk(id);
  if (!curriculum) {
    throw notFound('Curriculum not found.');
  }
  await curriculum.update({
    name: input.name ?? curriculum.name,
    isActive: input.isActive ?? curriculum.isActive,
  });
  return getCurriculum(id);
}

export async function replaceCurriculumCourses(id: number, courseIds: number[]) {
  const curriculum = await Curriculum.findByPk(id);
  if (!curriculum) {
    throw notFound('Curriculum not found.');
  }
  const assigned = await ClassCurriculumAssignment.count({ where: { curriculumId: id } });
  if (assigned > 0) {
    throw conflict('This curriculum is already assigned to a class. Create a new curriculum instead.');
  }
  const uniqueIds = [...new Set(courseIds)];
  const courses = uniqueIds.length === 0 ? [] : await Course.findAll({ where: { id: uniqueIds } });
  if (courses.length !== uniqueIds.length) {
    throw unprocessable('One or more selected courses do not exist.', 'courseIds');
  }

  await sequelize.transaction(async (transaction) => {
    await CurriculumCourse.destroy({ where: { curriculumId: id }, transaction });
    if (uniqueIds.length > 0) {
      await CurriculumCourse.bulkCreate(
        uniqueIds.map((courseId) => ({ curriculumId: id, courseId })),
        { transaction },
      );
    }
  });
  return getCurriculum(id);
}

async function coursesFor(curriculumId: number) {
  const links = await CurriculumCourse.findAll({ where: { curriculumId }, order: [['courseId', 'ASC']] });
  if (links.length === 0) {
    return [];
  }
  const courses = await Course.findAll({ where: { id: links.map((link) => link.courseId) }, order: [['code', 'ASC']] });
  return courses.map((course) => ({ id: Number(course.id), code: course.code, name: course.name }));
}

async function courseCounts(ids: number[]) {
  const counts = new Map<number, number>();
  if (ids.length === 0) {
    return counts;
  }
  const rows = await CurriculumCourse.findAll({
    attributes: ['curriculumId', [sequelize.fn('COUNT', sequelize.col('id')), 'total']],
    where: { curriculumId: ids },
    group: ['curriculumId'],
    raw: true,
  });
  for (const row of rows as unknown as Array<{ curriculumId?: number; curriculum_id?: number; total: number }>) {
    counts.set(Number(row.curriculumId ?? row.curriculum_id), Number(row.total));
  }
  return counts;
}

async function branchCodes(ids: Array<number | null>) {
  const wanted = [...new Set(ids.filter((id): id is number => id !== null).map(Number))];
  const rows = wanted.length === 0 ? [] : await Branch.findAll({ where: { id: wanted } });
  return new Map(rows.map((branch) => [Number(branch.id), branch.code]));
}

function toDto(
  curriculum: Curriculum,
  branches: Map<number, string>,
  courses: Array<{ id: number; code: string; name: string }>,
  courseCount: number,
) {
  const branchId = curriculum.branchId === null ? null : Number(curriculum.branchId);
  return {
    id: Number(curriculum.id),
    name: curriculum.name,
    scopeType: curriculum.scopeType,
    branchId,
    branchCode: branchId === null ? null : (branches.get(branchId) ?? null),
    semesterLevel: curriculum.semesterLevel === null ? null : Number(curriculum.semesterLevel),
    cycleType: curriculum.cycleType,
    isActive: Boolean(curriculum.isActive),
    courseCount,
    courses,
  };
}
