import { dateWithin, rangesOverlap } from '../utils/dates';

export type PeriodType = 'ODD' | 'EVEN';
export type CycleType = 'P' | 'C';
export type OfferingStatus = 'PLANNED' | 'ONGOING' | 'COMPLETED';

export function semesterLevel(yearLevel: number, periodType: PeriodType): number {
  return periodType === 'ODD' ? yearLevel * 2 - 1 : yearLevel * 2;
}

export function oppositeCycle(cycle: CycleType): CycleType {
  return cycle === 'P' ? 'C' : 'P';
}

export function sectionCode(index: number): string {
  return String.fromCharCode(64 + index);
}

export function sectionCodes(count: number): string[] {
  return Array.from({ length: count }, (_, index) => sectionCode(index + 1));
}

export function allocateCycles<T>(items: T[]): Array<{ item: T; semester1: CycleType; semester2: CycleType }> {
  return items.map((item, index) => {
    const semester1: CycleType = index % 2 === 0 ? 'P' : 'C';
    return { item, semester1, semester2: oppositeCycle(semester1) };
  });
}

export function termInsideYear(termStart: string, termEnd: string, yearStart: string, yearEnd: string): boolean {
  return dateWithin(termStart, yearStart, yearEnd) && dateWithin(termEnd, yearStart, yearEnd);
}

export function canAdvanceStatus(current: OfferingStatus, next: OfferingStatus): boolean {
  const order: Record<OfferingStatus, number> = { PLANNED: 0, ONGOING: 1, COMPLETED: 2 };
  return order[next] >= order[current];
}

export type CalendarYear = {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

export type CalendarTerm = {
  id: number;
  academicYearId: number;
  periodType: PeriodType;
  startDate: string;
  endDate: string;
};

export type CalendarSnapshot = {
  today: string;
  status: 'TERM' | 'BREAK' | 'NONE';
  academicYear: { id: number; name: string } | null;
  academicTerm: { id: number; periodType: PeriodType; startDate: string; endDate: string } | null;
};

export function resolveCalendar(today: string, years: CalendarYear[], terms: CalendarTerm[]): CalendarSnapshot {
  const activeYear = years.find((year) => year.isActive && dateWithin(today, year.startDate, year.endDate));
  if (!activeYear) {
    return { today, status: 'NONE', academicYear: null, academicTerm: null };
  }

  const term = terms.find(
    (item) => item.academicYearId === activeYear.id && dateWithin(today, item.startDate, item.endDate),
  );
  return {
    today,
    status: term ? 'TERM' : 'BREAK',
    academicYear: { id: activeYear.id, name: activeYear.name },
    academicTerm: term
      ? { id: term.id, periodType: term.periodType, startDate: term.startDate, endDate: term.endDate }
      : null,
  };
}

export { rangesOverlap };
