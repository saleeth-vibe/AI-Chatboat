import { Op, UniqueConstraintError } from 'sequelize';
import { AcademicTerm, AcademicYear } from '../models';
import { env } from '../config/env';
import { rangesOverlap, resolveCalendar, termInsideYear, type PeriodType } from './academic-rules';
import { asDateOnly, isEndAfterStart, todayInTimeZone } from '../utils/dates';
import { conflict, notFound, unprocessable } from '../utils/errors';

export type TermInput = {
  periodType: PeriodType;
  startDate: string;
  endDate: string;
};

export type TermPatch = {
  startDate?: string;
  endDate?: string;
};

export async function listTerms(academicYearId: number) {
  await requireYear(academicYearId);
  const terms = await AcademicTerm.findAll({
    where: { academicYearId },
    order: [['startDate', 'ASC']],
  });
  return terms.map(toDto);
}

export async function createTerm(academicYearId: number, input: TermInput) {
  const year = await requireYear(academicYearId);
  assertTermDates(input.startDate, input.endDate, asDateOnly(year.startDate), asDateOnly(year.endDate));
  await assertNoSiblingOverlap(academicYearId, input.periodType, input.startDate, input.endDate);

  try {
    const term = await AcademicTerm.create({
      academicYearId,
      periodType: input.periodType,
      startDate: input.startDate,
      endDate: input.endDate,
    });
    return toDto(term);
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      throw conflict(`The ${input.periodType} term already exists for this academic year.`, 'periodType');
    }
    throw error;
  }
}

export async function updateTerm(id: number, input: TermPatch) {
  const term = await AcademicTerm.findByPk(id);
  if (!term) {
    throw notFound('Academic term not found.');
  }
  const year = await requireYear(Number(term.academicYearId));
  const startDate = input.startDate ?? asDateOnly(term.startDate);
  const endDate = input.endDate ?? asDateOnly(term.endDate);
  assertTermDates(startDate, endDate, asDateOnly(year.startDate), asDateOnly(year.endDate));
  await assertNoSiblingOverlap(Number(term.academicYearId), term.periodType, startDate, endDate, term.id);
  await term.update({ startDate, endDate });
  return toDto(term);
}

export async function currentCalendar() {
  const today = todayInTimeZone(env.appTimezone);
  const years = await AcademicYear.findAll();
  const terms = await AcademicTerm.findAll();
  return resolveCalendar(
    today,
    years.map((year) => ({
      id: Number(year.id),
      name: year.name,
      startDate: asDateOnly(year.startDate),
      endDate: asDateOnly(year.endDate),
      isActive: Boolean(year.isActive),
    })),
    terms.map((term) => ({
      id: Number(term.id),
      academicYearId: Number(term.academicYearId),
      periodType: term.periodType,
      startDate: asDateOnly(term.startDate),
      endDate: asDateOnly(term.endDate),
    })),
  );
}

async function requireYear(id: number) {
  const year = await AcademicYear.findByPk(id);
  if (!year) {
    throw notFound('Academic year not found.');
  }
  return year;
}

function assertTermDates(startDate: string, endDate: string, yearStart: string, yearEnd: string) {
  if (!isEndAfterStart(startDate, endDate)) {
    throw unprocessable('End date must be after start date.', 'endDate');
  }
  if (!termInsideYear(startDate, endDate, yearStart, yearEnd)) {
    throw unprocessable('Term dates must fall inside the academic year.', 'startDate');
  }
}

async function assertNoSiblingOverlap(
  academicYearId: number,
  periodType: PeriodType,
  startDate: string,
  endDate: string,
  excludeId?: number,
) {
  const sibling = await AcademicTerm.findOne({
    where: {
      academicYearId,
      periodType: { [Op.ne]: periodType },
      ...(excludeId === undefined ? {} : { id: { [Op.ne]: excludeId } }),
    },
  });
  if (sibling && rangesOverlap(startDate, endDate, asDateOnly(sibling.startDate), asDateOnly(sibling.endDate))) {
    throw conflict('Odd and Even terms cannot overlap.');
  }
}

function toDto(term: AcademicTerm) {
  return {
    id: Number(term.id),
    academicYearId: Number(term.academicYearId),
    periodType: term.periodType,
    startDate: asDateOnly(term.startDate),
    endDate: asDateOnly(term.endDate),
  };
}
