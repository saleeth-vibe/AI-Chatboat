import { Op, type WhereOptions } from 'sequelize';
import { sequelize } from '../database/connection';
import { AcademicClass, Branch, StudentClassEnrolment } from '../models';
import { sectionCodes } from './academic-rules';
import { notFound, rethrowUnique, unprocessable } from '../utils/errors';
import { escapeLike, type ListQuery } from '../utils/request';
import { pageMeta } from '../utils/pagination';

export type BranchInput = {
  name: string;
  code: string;
  durationYears: number;
  sectionsPerYear: number;
  classCapacity: number;
  supportsFirstYearCycles: boolean;
  isActive: boolean;
};

export type BranchPatch = {
  name?: string;
  classCapacity?: number;
  isActive?: boolean;
};

export type ClassPatch = {
  capacity?: number;
  isActive?: boolean;
};

export async function listBranches(query: ListQuery) {
  const where: WhereOptions<Branch> = {};
  if (query.search) {
    const like = `%${escapeLike(query.search)}%`;
    Object.assign(where, { [Op.or]: [{ name: { [Op.like]: like } }, { code: { [Op.like]: like } }] });
  }
  if (query.isActive !== undefined) {
    where.isActive = query.isActive;
  }
  const { rows, count } = await Branch.findAndCountAll({
    where,
    order: [['code', 'ASC']],
    limit: query.pageSize,
    offset: (query.page - 1) * query.pageSize,
  });
  return { data: rows.map(toBranchDto), meta: pageMeta(query.page, query.pageSize, count) };
}

export async function getBranch(id: number) {
  const branch = await Branch.findByPk(id);
  if (!branch) {
    throw notFound('Branch not found.');
  }
  return toBranchDto(branch);
}

export async function createBranch(input: BranchInput) {
  try {
    return await sequelize.transaction(async (transaction) => {
      const branch = await Branch.create(
        {
          name: input.name,
          code: input.code,
          durationYears: input.durationYears,
          sectionsPerYear: input.sectionsPerYear,
          classCapacity: input.classCapacity,
          supportsFirstYearCycles: input.supportsFirstYearCycles,
          isActive: input.isActive,
        },
        { transaction },
      );
      const rows = [];
      for (let yearLevel = 1; yearLevel <= input.durationYears; yearLevel += 1) {
        for (const sectionCode of sectionCodes(input.sectionsPerYear)) {
          rows.push({
            branchId: branch.id,
            yearLevel,
            sectionCode,
            capacity: input.classCapacity,
            isActive: true,
          });
        }
      }
      const classes = await AcademicClass.bulkCreate(rows, { transaction });
      return {
        ...toBranchDto(branch),
        classes: classes.map((schoolClass) => toClassDto(schoolClass, branch.code, 0)),
      };
    });
  } catch (error) {
    rethrowUnique(error, 'A branch with this code already exists.', 'code');
  }
}

export async function updateBranch(id: number, input: BranchPatch) {
  const branch = await Branch.findByPk(id);
  if (!branch) {
    throw notFound('Branch not found.');
  }
  await branch.update({
    name: input.name ?? branch.name,
    classCapacity: input.classCapacity ?? branch.classCapacity,
    isActive: input.isActive ?? branch.isActive,
  });
  return toBranchDto(branch);
}

export async function listClasses(branchId: number) {
  const branch = await Branch.findByPk(branchId);
  if (!branch) {
    throw notFound('Branch not found.');
  }
  const classes = await AcademicClass.findAll({
    where: { branchId },
    order: [
      ['yearLevel', 'ASC'],
      ['sectionCode', 'ASC'],
    ],
  });
  const counts = await activeCounts(classes.map((schoolClass) => Number(schoolClass.id)));
  return classes.map((schoolClass) => toClassDto(schoolClass, branch.code, counts.get(Number(schoolClass.id)) ?? 0));
}

export async function getClass(id: number) {
  const schoolClass = await AcademicClass.findByPk(id);
  if (!schoolClass) {
    throw notFound('Class not found.');
  }
  const branch = await Branch.findByPk(schoolClass.branchId);
  const counts = await activeCounts([Number(schoolClass.id)]);
  return toClassDto(schoolClass, branch?.code ?? '', counts.get(Number(schoolClass.id)) ?? 0);
}

export async function updateClass(id: number, input: ClassPatch) {
  const schoolClass = await AcademicClass.findByPk(id);
  if (!schoolClass) {
    throw notFound('Class not found.');
  }
  if (input.capacity !== undefined) {
    const active = await StudentClassEnrolment.count({ where: { classId: id, status: 'ACTIVE' } });
    if (input.capacity < active) {
      throw unprocessable(`Capacity cannot be below the ${active} active student(s) already in this class.`, 'capacity');
    }
  }
  await schoolClass.update({
    capacity: input.capacity ?? schoolClass.capacity,
    isActive: input.isActive ?? schoolClass.isActive,
  });
  return getClass(id);
}

export function classLabel(code: string, yearLevel: number, sectionCode: string) {
  return `${code} ${yearLevel}${sectionCode}`;
}

async function activeCounts(classIds: number[]) {
  const counts = new Map<number, number>();
  if (classIds.length === 0) {
    return counts;
  }
  const rows = await StudentClassEnrolment.findAll({
    attributes: ['classId', [sequelize.fn('COUNT', sequelize.col('id')), 'total']],
    where: { classId: classIds, status: 'ACTIVE' },
    group: ['classId'],
    raw: true,
  });
  for (const row of rows as unknown as Array<{ classId?: number; class_id?: number; total: number }>) {
    counts.set(Number(row.classId ?? row.class_id), Number(row.total));
  }
  return counts;
}

function toBranchDto(branch: Branch) {
  return {
    id: Number(branch.id),
    name: branch.name,
    code: branch.code,
    durationYears: Number(branch.durationYears),
    sectionsPerYear: Number(branch.sectionsPerYear),
    classCapacity: Number(branch.classCapacity),
    supportsFirstYearCycles: Boolean(branch.supportsFirstYearCycles),
    isActive: Boolean(branch.isActive),
  };
}

function toClassDto(schoolClass: AcademicClass, branchCode: string, activeStudents: number) {
  return {
    id: Number(schoolClass.id),
    branchId: Number(schoolClass.branchId),
    yearLevel: Number(schoolClass.yearLevel),
    sectionCode: schoolClass.sectionCode,
    capacity: Number(schoolClass.capacity),
    isActive: Boolean(schoolClass.isActive),
    activeStudents,
    label: classLabel(branchCode, Number(schoolClass.yearLevel), schoolClass.sectionCode),
  };
}
