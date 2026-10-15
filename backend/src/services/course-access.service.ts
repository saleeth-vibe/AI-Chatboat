import { AcademicClass, AcademicTerm, Branch, ClassCourseOffering, ClassCurriculumAssignment, Course, Faculty, FacultyCourseAssignment, Student, StudentClassEnrolment, User } from '../models';
import { classLabel } from './branch.service';
import { AppError, notFound } from '../utils/errors';

export type CourseOption = {
  id: number;
  code: string;
  name: string;
};

export async function facultyCourses(userId: number, academicTermId: number): Promise<CourseOption[]> {
  const faculty = await requireActiveFaculty(userId);
  await requireTerm(academicTermId);
  const rows = await FacultyCourseAssignment.findAll({
    where: { facultyId: faculty.id, academicTermId, status: 'ACTIVE' },
  });
  return loadCourses(rows.map((row) => Number(row.courseId)));
}

export async function requireEligibleFaculty(userId: number, courseId: number, academicTermId: number): Promise<Faculty> {
  const faculty = await requireActiveFaculty(userId);
  const course = await Course.findByPk(courseId);
  if (!course) {
    throw notFound('Course not found.');
  }
  await requireTerm(academicTermId);
  const eligibility = await FacultyCourseAssignment.findOne({
    where: { facultyId: faculty.id, courseId, academicTermId, status: 'ACTIVE' },
  });
  if (!eligibility) {
    throw new AppError(403, 'FORBIDDEN', 'You are not allowed to use this course.');
  }
  return faculty;
}

export async function studentCourseContext(userId: number, academicTermId: number): Promise<{
  classLabel: string | null;
  courses: CourseOption[];
}> {
  const student = await requireActiveStudent(userId);
  await requireTerm(academicTermId);
  const enrolment = await StudentClassEnrolment.findOne({ where: { studentId: student.id, status: 'ACTIVE' } });
  if (!enrolment) {
    return { classLabel: null, courses: [] };
  }
  const schoolClass = await AcademicClass.findByPk(enrolment.classId);
  const branch = schoolClass ? await Branch.findByPk(schoolClass.branchId) : null;
  const label = schoolClass && branch ? classLabel(branch.code, Number(schoolClass.yearLevel), schoolClass.sectionCode) : null;
  const assignment = schoolClass
    ? await ClassCurriculumAssignment.findOne({ where: { classId: schoolClass.id, academicTermId } })
    : null;
  if (!assignment) {
    return { classLabel: label, courses: [] };
  }
  const offerings = await ClassCourseOffering.findAll({ where: { classCurriculumAssignmentId: assignment.id } });
  return { classLabel: label, courses: await loadCourses(offerings.map((row) => Number(row.courseId))) };
}

export async function requireStudentCourse(userId: number, courseId: number, academicTermId: number): Promise<number> {
  const course = await Course.findByPk(courseId);
  if (!course) {
    throw notFound('Course not found.');
  }
  const context = await studentCourseContext(userId, academicTermId);
  if (!context.courses.some((item) => item.id === courseId)) {
    throw new AppError(403, 'FORBIDDEN', 'You are not allowed to use this course.');
  }
  const student = await requireActiveStudent(userId);
  return Number(student.id);
}

async function requireActiveFaculty(userId: number): Promise<Faculty> {
  const faculty = await Faculty.findOne({ where: { userId } });
  const user = await User.findByPk(userId);
  if (!faculty || !faculty.isActive || !user?.isActive) {
    throw new AppError(403, 'FORBIDDEN', 'Faculty access required');
  }
  return faculty;
}

async function requireActiveStudent(userId: number): Promise<Student> {
  const student = await Student.findOne({ where: { userId } });
  const user = await User.findByPk(userId);
  if (!student || !student.isActive || !user?.isActive) {
    throw new AppError(403, 'FORBIDDEN', 'Student access required');
  }
  return student;
}

async function requireTerm(academicTermId: number): Promise<void> {
  const term = await AcademicTerm.findByPk(academicTermId);
  if (!term) {
    throw notFound('Academic term not found.');
  }
}

async function loadCourses(ids: number[]): Promise<CourseOption[]> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) {
    return [];
  }
  const courses = await Course.findAll({ where: { id: unique, isActive: true }, order: [['code', 'ASC']] });
  return courses.map((course) => ({ id: Number(course.id), code: course.code, name: course.name }));
}
