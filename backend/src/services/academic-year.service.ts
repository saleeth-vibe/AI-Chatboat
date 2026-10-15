import { Op, UniqueConstraintError, type WhereOptions } from 'sequelize';
import { AcademicYear } from '../models';
import { isEndAfterStart } from '../utils/dates';
import { AppError } from '../utils/errors';
import type { AcademicYearInput, AcademicYearListQuery, AcademicYearPatch } from '../validators/academic-year.validator';

export type AcademicYearDto = {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

export type AcademicYearList = {
  data: AcademicYearDto[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export async function listAcademicYears(query: AcademicYearListQuery): Promise<AcademicYearList> {
  const where: WhereOptions<AcademicYear> = {};
  if (query.search) {
    where.name = { [Op.like]: `%${escapeLike(query.search)}%` };
  }
  if (query.isActive !== undefined) {
    where.isActive = query.isActive;
  }

  const { rows, count } = await AcademicYear.findAndCountAll({
    where,
    order: [
      ['startDate', 'DESC'],
      ['name', 'ASC'],
    ],
    limit: query.pageSize,
    offset: (query.page - 1) * query.pageSize,
  });

  return {
    data: rows.map(toDto),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total: count,
      totalPages: count === 0 ? 0 : Math.ceil(count / query.pageSize),
    },
  };
}

export async function getAcademicYear(id: number): Promise<AcademicYearDto> {
  const year = await AcademicYear.findByPk(id);
  if (!year) {
    throw new AppError(404, 'NOT_FOUND', 'Academic year not found.');
  }
  return toDto(year);
}

export async function createAcademicYear(input: AcademicYearInput): Promise<AcademicYearDto> {
  assertDateOrder(input.startDate, input.endDate);
  await assertNoOverlap(input.startDate, input.endDate);

  try {
    const year = await AcademicYear.create({
      name: input.name,
      startDate: input.startDate,
      endDate: input.endDate,
      isActive: input.isActive,
    });
    return toDto(year);
  } catch (error) {
    throw mapUniqueName(error);
  }
}

export async function updateAcademicYear(id: number, input: AcademicYearPatch): Promise<AcademicYearDto> {
  const year = await AcademicYear.findByPk(id);
  if (!year) {
    throw new AppError(404, 'NOT_FOUND', 'Academic year not found.');
  }

  const next = {
    name: input.name ?? year.name,
    startDate: input.startDate ?? asDateOnly(year.startDate),
    endDate: input.endDate ?? asDateOnly(year.endDate),
    isActive: input.isActive ?? year.isActive,
  };
  assertDateOrder(next.startDate, next.endDate);
  await assertNoOverlap(next.startDate, next.endDate, id);

  try {
    await year.update(next);
    return toDto(year);
  } catch (error) {
    throw mapUniqueName(error);
  }
}

function assertDateOrder(startDate: string, endDate: string): void {
  if (!isEndAfterStart(startDate, endDate)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', [
      { field: 'endDate', message: 'End date must be after start date.' },
    ]);
  }
}

async function assertNoOverlap(startDate: string, endDate: string, excludeId?: number): Promise<void> {
  const where: WhereOptions<AcademicYear> = {
    startDate: { [Op.lte]: endDate },
    endDate: { [Op.gte]: startDate },
  };
  if (excludeId !== undefined) {
    where.id = { [Op.ne]: excludeId };
  }

  const overlapping = await AcademicYear.findOne({ where });
  if (overlapping) {
    throw new AppError(409, 'CONFLICT', `These dates overlap ${overlapping.name}.`);
  }
}

function mapUniqueName(error: unknown): unknown {
  if (error instanceof UniqueConstraintError) {
    return new AppError(409, 'CONFLICT', 'An academic year with this name already exists.', [
      { field: 'name', message: 'An academic year with this name already exists.' },
    ]);
  }
  return error;
}

function toDto(year: AcademicYear): AcademicYearDto {
  return {
    id: Number(year.id),
    name: year.name,
    startDate: asDateOnly(year.startDate),
    endDate: asDateOnly(year.endDate),
    isActive: Boolean(year.isActive),
  };
}

function asDateOnly(value: string | Date): string {
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}
