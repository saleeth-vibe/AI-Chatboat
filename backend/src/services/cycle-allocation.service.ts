import { UniqueConstraintError } from 'sequelize';
import { sequelize } from '../database/connection';
import { AcademicClass, AcademicTerm, AcademicYear, Branch, ClassCurriculumAssignment, FirstYearCycleAllocation } from '../models';
import { allocateCycles, oppositeCycle, type CycleType } from './academic-rules';
import { classLabel } from './branch.service';
import { conflict, notFound, unprocessable } from '../utils/errors';

type AllocationRow = {
  classId: number;
  label: string;
  branchCode: string;
  sectionCode: string;
  semester1CycleType: CycleType;
  semester2CycleType: CycleType;
};

export async function getAllocation(academicYearId: number) {
  const year = await AcademicYear.findByPk(academicYearId);
  if (!year) {
    throw notFound('Academic year not found.');
  }
  const rows = await FirstYearCycleAllocation.findAll({ where: { cohortAcademicYearId: academicYearId } });
  const allocations = await decorate(rows.map((row) => ({ classId: Number(row.classId), semester1: row.semester1CycleType })));
  return {
    cohortAcademicYearId: academicYearId,
    exists: rows.length > 0,
    canReset: rows.length > 0 && !(await assignmentsExist(academicYearId)),
    allocations,
  };
}

export async function createAllocation(academicYearId: number, userId: number) {
  return sequelize.transaction(async (transaction) => {
    const year = await AcademicYear.findByPk(academicYearId, { transaction });
    if (!year) {
      throw notFound('Academic year not found.');
    }
    const existing = await FirstYearCycleAllocation.count({ where: { cohortAcademicYearId: academicYearId }, transaction });
    if (existing > 0) {
      throw conflict('First-year cycles have already been saved for this academic year.');
    }

    const classes = await AcademicClass.findAll({ where: { yearLevel: 1, isActive: true }, transaction });
    const branches = await Branch.findAll({
      where: { id: classes.map((schoolClass) => schoolClass.branchId), isActive: true, supportsFirstYearCycles: true },
      transaction,
    });
    const branchById = new Map(branches.map((branch) => [Number(branch.id), branch]));
    const eligible = classes
      .filter((schoolClass) => branchById.has(Number(schoolClass.branchId)))
      .sort((left, right) => {
        const leftBranch = branchById.get(Number(left.branchId));
        const rightBranch = branchById.get(Number(right.branchId));
        const byCode = (leftBranch?.code ?? '').localeCompare(rightBranch?.code ?? '');
        return byCode === 0 ? left.sectionCode.localeCompare(right.sectionCode) : byCode;
      });
    if (eligible.length === 0) {
      throw unprocessable('There are no active first-year classes on branches that use P and C cycles.');
    }

    const allocated = allocateCycles(eligible);
    try {
      await FirstYearCycleAllocation.bulkCreate(
        allocated.map(({ item, semester1 }) => ({
          cohortAcademicYearId: academicYearId,
          classId: item.id,
          semester1CycleType: semester1,
          allocatedAt: new Date(),
          allocatedByUserId: userId,
        })),
        { transaction },
      );
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw conflict('First-year cycles have already been saved for this academic year.');
      }
      throw error;
    }

    return {
      cohortAcademicYearId: academicYearId,
      exists: true,
      canReset: true,
      allocations: allocated.map(({ item, semester1, semester2 }) => {
        const branch = branchById.get(Number(item.branchId));
        return {
          classId: Number(item.id),
          label: classLabel(branch?.code ?? '', 1, item.sectionCode),
          branchCode: branch?.code ?? '',
          sectionCode: item.sectionCode,
          semester1CycleType: semester1,
          semester2CycleType: semester2,
        } satisfies AllocationRow;
      }),
    };
  });
}

export async function resetAllocation(academicYearId: number) {
  const year = await AcademicYear.findByPk(academicYearId);
  if (!year) {
    throw notFound('Academic year not found.');
  }
  if (await assignmentsExist(academicYearId)) {
    throw conflict('Cycles cannot be reset after class curricula have been assigned for this year.');
  }
  await FirstYearCycleAllocation.destroy({ where: { cohortAcademicYearId: academicYearId } });
  return getAllocation(academicYearId);
}

async function assignmentsExist(academicYearId: number) {
  const terms = await AcademicTerm.findAll({ where: { academicYearId } });
  if (terms.length === 0) {
    return false;
  }
  const count = await ClassCurriculumAssignment.count({ where: { academicTermId: terms.map((term) => term.id) } });
  return count > 0;
}

async function decorate(rows: Array<{ classId: number; semester1: CycleType }>): Promise<AllocationRow[]> {
  if (rows.length === 0) {
    return [];
  }
  const classes = await AcademicClass.findAll({ where: { id: rows.map((row) => row.classId) } });
  const branches = await Branch.findAll({ where: { id: classes.map((schoolClass) => schoolClass.branchId) } });
  const classById = new Map(classes.map((schoolClass) => [Number(schoolClass.id), schoolClass]));
  const branchById = new Map(branches.map((branch) => [Number(branch.id), branch]));
  return rows
    .map((row) => {
      const schoolClass = classById.get(row.classId);
      const branch = schoolClass ? branchById.get(Number(schoolClass.branchId)) : undefined;
      return {
        classId: row.classId,
        label: classLabel(branch?.code ?? '', schoolClass ? Number(schoolClass.yearLevel) : 1, schoolClass?.sectionCode ?? ''),
        branchCode: branch?.code ?? '',
        sectionCode: schoolClass?.sectionCode ?? '',
        semester1CycleType: row.semester1,
        semester2CycleType: oppositeCycle(row.semester1),
      };
    })
    .sort((left, right) => left.branchCode.localeCompare(right.branchCode) || left.sectionCode.localeCompare(right.sectionCode));
}
