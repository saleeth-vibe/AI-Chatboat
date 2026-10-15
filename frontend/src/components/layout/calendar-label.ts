import type { CalendarSnapshot } from '../../types/admin';

export function calendarLabel(calendar: CalendarSnapshot): string {
  if (calendar.status === 'NONE' || !calendar.academicYear) {
    return 'No active year';
  }
  if (calendar.status === 'BREAK' || !calendar.academicTerm) {
    return `${calendar.academicYear.name} · Break`;
  }
  const period = calendar.academicTerm.periodType === 'ODD' ? 'Odd' : 'Even';
  return `${calendar.academicYear.name} · ${period}`;
}
