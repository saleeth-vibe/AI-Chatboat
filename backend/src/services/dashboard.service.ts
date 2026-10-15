import { AcademicTerm, AcademicYear, Branch, Course, Curriculum, Department, Faculty, Student } from '../models';
import { asDateOnly } from '../utils/dates';
import { currentCalendar } from './academic-term.service';

export async function dashboard() {
  const [branches, departments, courses, curricula, faculty, students, calendar] = await Promise.all([
    Branch.count({ where: { isActive: true } }),
    Department.count({ where: { isActive: true } }),
    Course.count({ where: { isActive: true } }),
    Curriculum.count({ where: { isActive: true } }),
    Faculty.count({ where: { isActive: true } }),
    Student.count({ where: { isActive: true } }),
    currentCalendar(),
  ]);
  return {
    counts: { branches, departments, courses, curricula, faculty, students },
    calendar,
  };
}

export async function listTermChoices() {
  const terms = await AcademicTerm.findAll({ order: [['startDate', 'DESC']] });
  const years = await AcademicYear.findAll({ where: { id: terms.map((term) => term.academicYearId) } });
  const yearById = new Map(years.map((year) => [Number(year.id), year.name]));
  return terms.map((term) => ({
    id: Number(term.id),
    academicYearId: Number(term.academicYearId),
    label: `${yearById.get(Number(term.academicYearId)) ?? 'Year'} ${term.periodType}`,
    periodType: term.periodType,
    startDate: asDateOnly(term.startDate),
    endDate: asDateOnly(term.endDate),
  }));
}