import { Op, type QueryInterface, type Transaction } from 'sequelize';
import { sequelize } from '../database/connection';
import {
  AcademicClass,
  AcademicTerm,
  AcademicYear,
  Branch,
  ClassCourseOffering,
  ClassCurriculumAssignment,
  Course,
  Curriculum,
  CurriculumCourse,
  Faculty,
  FacultyCourseAssignment,
  FirstYearCycleAllocation,
  Student,
  StudentClassEnrolment,
  User,
} from '../models';
import { createAcademicYear } from '../services/academic-year.service';
import { generateAssignments, updateOffering } from '../services/assignment.service';
import { createBranch } from '../services/branch.service';
import { createCourse } from '../services/course.service';
import { createCurriculum, replaceCurriculumCourses } from '../services/curriculum.service';
import { createAllocation } from '../services/cycle-allocation.service';
import { addEligibility, createFaculty } from '../services/faculty.service';
import { createTerm } from '../services/academic-term.service';
import { hashPassword } from '../utils/password';

const YEAR_NAME = '2026-27';
const BRANCHES = [
  { name: 'Computer Science and Engineering', code: 'CSE' },
  { name: 'Mechanical Engineering', code: 'MECH' },
] as const;
const FACULTY_ACCOUNTS = [
  { email: 'p.cycle@university.test', name: 'P Cycle Faculty', employeeNumber: 'P-CYCLE', branchCode: 'CSE' },
  { email: 'c.cycle@university.test', name: 'C Cycle Faculty', employeeNumber: 'C-CYCLE', branchCode: 'MECH' },
  { email: 'cse.faculty@university.test', name: 'CSE Faculty', employeeNumber: 'CSE-FAC', branchCode: 'CSE' },
  { email: 'mech.faculty@university.test', name: 'MECH Faculty', employeeNumber: 'MECH-FAC', branchCode: 'MECH' },
] as const;
const P_COURSES: CourseSeed[] = [
  ['PHY101', 'Engineering Physics'],
  ['EEE101', 'Basic Electrical Engineering'],
  ['MEC101', 'Engineering Mechanics'],
];
const C_COURSES: CourseSeed[] = [
  ['CHE101', 'Engineering Chemistry'],
  ['CIV101', 'Engineering Drawing'],
  ['CSE101', 'Programming in C'],
];
const CSE_SEMESTERS: SemesterSeed[] = [
  [3, ['Data Structures', 'Discrete Mathematics', 'Digital Logic']],
  [4, ['Algorithms', 'Operating Systems', 'Database Systems']],
  [5, ['Theory of Computation', 'Software Engineering', 'Machine Learning']],
  [6, ['Compiler Design', 'Computer Networks', 'Artificial Intelligence']],
  [7, ['Cloud Computing', 'Distributed Systems', 'Information Security']],
  [8, ['Elective I', 'Elective II', 'Capstone Project']],
];
const MECH_SEMESTERS: SemesterSeed[] = [
  [3, ['Thermodynamics', 'Strength of Materials', 'Manufacturing Processes']],
  [4, ['Fluid Mechanics', 'Theory of Machines', 'Heat Transfer']],
  [5, ['Machine Design', 'Dynamics of Machinery', 'CAD and CAM']],
  [6, ['Industrial Engineering', 'Refrigeration and Air Conditioning', 'Finite Element Methods']],
  [7, ['Automobile Engineering', 'Robotics', 'Power Plant Engineering']],
  [8, ['Elective I', 'Elective II', 'Capstone Project']],
];

type CourseSeed = readonly [string, string];
type SemesterSeed = readonly [number, readonly [string, string, string]];

function semesterCourses(prefix: string, semester: number, names: readonly [string, string, string]): CourseSeed[] {
  const base = semester * 100;
  return names.map((name, index) => [`${prefix}${base + index + 1}`, name] as const);
}

function allCourseSeeds(): CourseSeed[] {
  const branchCourses = [
    ...CSE_SEMESTERS.flatMap(([semester, names]) => semesterCourses('CSE', semester, names)),
    ...MECH_SEMESTERS.flatMap(([semester, names]) => semesterCourses('MECH', semester, names)),
  ];
  return [...P_COURSES, ...C_COURSES, ...branchCourses];
}

function studentEmail(branchCode: string, yearLevel: number, sectionCode: string): string {
  return `${branchCode.toLowerCase()}.${yearLevel}${sectionCode.toLowerCase()}@university.test`;
}

function demoPassword(): string {
  const password = process.env.DEMO_PASSWORD?.trim() ?? '';
  if (password.length < 8) {
    throw new Error('Set DEMO_PASSWORD to at least 8 characters before seeding demo academic data.');
  }
  return password;
}

async function up(queryInterface: QueryInterface): Promise<void> {
  void queryInterface;
  const existing = await Branch.findOne({ where: { code: 'CSE' } });
  if (existing) {
    return;
  }

  const password = demoPassword();
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) {
    throw new Error('Set ADMIN_EMAIL before seeding demo academic data.');
  }
  const admin = await User.findOne({ where: { email: adminEmail, role: 'ADMIN' } });
  if (!admin) {
    throw new Error('Seed the admin user before the demo academic data.');
  }

  const year = await createAcademicYear({
    name: YEAR_NAME,
    startDate: '2026-07-01',
    endDate: '2027-06-30',
    isActive: true,
  });
  const oddTerm = await createTerm(year.id, {
    periodType: 'ODD',
    startDate: '2026-07-15',
    endDate: '2026-12-15',
  });
  const evenTerm = await createTerm(year.id, {
    periodType: 'EVEN',
    startDate: '2027-01-05',
    endDate: '2027-05-20',
  });

  const branchIds = new Map<string, number>();
  for (const branch of BRANCHES) {
    const created = await createBranch({
      name: branch.name,
      code: branch.code,
      durationYears: 4,
      sectionsPerYear: 3,
      classCapacity: 60,
      supportsFirstYearCycles: true,
      isActive: true,
    });
    branchIds.set(branch.code, created.id);
  }

  const courseIds = new Map<string, number>();
  for (const [code, name] of allCourseSeeds()) {
    const course = await createCourse({
      code,
      name,
      departmentId: null,
      description: null,
      isActive: true,
    });
    courseIds.set(code, course.id);
  }

  const pCurriculum = await createCurriculum({
    name: 'P-Cycle',
    scopeType: 'GLOBAL_CYCLE',
    branchId: null,
    semesterLevel: null,
    cycleType: 'P',
    isActive: true,
  });
  await replaceCurriculumCourses(pCurriculum.id, P_COURSES.map(([code]) => courseIds.get(code)!));

  const cCurriculum = await createCurriculum({
    name: 'C-Cycle',
    scopeType: 'GLOBAL_CYCLE',
    branchId: null,
    semesterLevel: null,
    cycleType: 'C',
    isActive: true,
  });
  await replaceCurriculumCourses(cCurriculum.id, C_COURSES.map(([code]) => courseIds.get(code)!));

  for (const [branchCode, semesters] of [
    ['CSE', CSE_SEMESTERS],
    ['MECH', MECH_SEMESTERS],
  ] as const) {
    for (const [semester, names] of semesters) {
      const curriculum = await createCurriculum({
        name: `${branchCode} Semester ${semester}`,
        scopeType: 'BRANCH',
        branchId: branchIds.get(branchCode)!,
        semesterLevel: semester,
        cycleType: null,
        isActive: true,
      });
      const codes = semesterCourses(branchCode, semester, names).map(([code]) => courseIds.get(code)!);
      await replaceCurriculumCourses(curriculum.id, codes);
    }
  }

  const facultyIds = new Map<string, number>();
  const passwordHash = await hashPassword(password);
  for (const account of FACULTY_ACCOUNTS) {
    const faculty = await createFaculty({
      email: account.email,
      name: account.name,
      employeeNumber: account.employeeNumber,
      affiliationType: 'BRANCH',
      branchId: branchIds.get(account.branchCode)!,
      departmentId: null,
      isActive: true,
    });
    await User.unscoped().update(
      { passwordHash, mustChangePassword: false, initialPassword: null },
      { where: { id: faculty.userId } },
    );
    facultyIds.set(account.email, faculty.id);
  }

  await createAllocation(year.id, Number(admin.id));

  for (const term of [oddTerm, evenTerm]) {
    const result = await generateAssignments(term.id);
    const ownConflicts = result.conflicts.filter(
      (conflict) => conflict.classLabel.startsWith('CSE ') || conflict.classLabel.startsWith('MECH '),
    );
    if (ownConflicts.length > 0) {
      throw new Error(`Class curriculum generation reported conflicts: ${JSON.stringify(ownConflicts)}`);
    }
  }

  const courseFaculty = new Map<number, number>();
  for (const [code] of P_COURSES) {
    courseFaculty.set(courseIds.get(code)!, facultyIds.get('p.cycle@university.test')!);
  }
  for (const [code] of C_COURSES) {
    courseFaculty.set(courseIds.get(code)!, facultyIds.get('c.cycle@university.test')!);
  }
  for (const [semester, names] of CSE_SEMESTERS) {
    for (const [code] of semesterCourses('CSE', semester, names)) {
      courseFaculty.set(courseIds.get(code)!, facultyIds.get('cse.faculty@university.test')!);
    }
  }
  for (const [semester, names] of MECH_SEMESTERS) {
    for (const [code] of semesterCourses('MECH', semester, names)) {
      courseFaculty.set(courseIds.get(code)!, facultyIds.get('mech.faculty@university.test')!);
    }
  }

  const classes = await AcademicClass.findAll({ where: { branchId: [...branchIds.values()] } });
  const assignments = await ClassCurriculumAssignment.findAll({ where: { classId: classes.map((row) => row.id) } });
  const offerings = await ClassCourseOffering.findAll({
    where: { classCurriculumAssignmentId: assignments.map((row) => row.id) },
  });
  const assignmentTerm = new Map(assignments.map((row) => [Number(row.id), Number(row.academicTermId)]));
  const eligible = new Set<string>();
  for (const offering of offerings) {
    const courseId = Number(offering.courseId);
    const facultyId = courseFaculty.get(courseId);
    const academicTermId = assignmentTerm.get(Number(offering.classCurriculumAssignmentId));
    if (!facultyId || !academicTermId) {
      throw new Error(`No faculty mapping for course ${courseId}.`);
    }
    const key = `${facultyId}:${courseId}:${academicTermId}`;
    if (!eligible.has(key)) {
      await addEligibility(facultyId, { courseId, academicTermId });
      eligible.add(key);
    }
    await updateOffering(Number(offering.id), { assignedFacultyId: facultyId });
  }

  await sequelize.transaction(async (transaction) => {
    for (const branch of BRANCHES) {
      const branchId = branchIds.get(branch.code)!;
      const branchClasses = classes
        .filter((row) => Number(row.branchId) === branchId)
        .sort((left, right) => left.yearLevel - right.yearLevel || left.sectionCode.localeCompare(right.sectionCode));
      for (const schoolClass of branchClasses) {
        await placeStudent(
          {
            email: studentEmail(branch.code, Number(schoolClass.yearLevel), schoolClass.sectionCode),
            passwordHash,
            name: `${branch.code} ${schoolClass.yearLevel}${schoolClass.sectionCode} Student`,
            branchId,
            branchCode: branch.code,
            yearLevel: Number(schoolClass.yearLevel),
            classId: Number(schoolClass.id),
            academicYearId: year.id,
            yearStart: year.startDate,
          },
          transaction,
        );
      }
    }
  });
}

async function placeStudent(
  input: {
    email: string;
    passwordHash: string;
    name: string;
    branchId: number;
    branchCode: string;
    yearLevel: number;
    classId: number;
    academicYearId: number;
    yearStart: string;
  },
  transaction: Transaction,
): Promise<void> {
  const user = await User.create(
    { email: input.email, passwordHash: input.passwordHash, role: 'STUDENT', isActive: true },
    { transaction },
  );
  const student = await Student.create(
    {
      userId: user.id,
      universityId: await nextUniversityId(input.branchCode, input.yearStart, transaction),
      name: input.name,
      branchId: input.branchId,
      entryYearLevel: input.yearLevel,
      isActive: true,
    },
    { transaction },
  );
  await StudentClassEnrolment.create(
    {
      studentId: student.id,
      classId: input.classId,
      startAcademicYearId: input.academicYearId,
      endAcademicYearId: null,
      status: 'ACTIVE',
    },
    { transaction },
  );
}

async function nextUniversityId(code: string, startDate: string, transaction: Transaction): Promise<string> {
  const prefix = `${startDate.slice(0, 4)}${code}`;
  const rows = await Student.findAll({
    where: { universityId: { [Op.like]: `${prefix}%` } },
    transaction,
  });
  const sequences = rows
    .map((row) => row.universityId)
    .filter((value) => value.startsWith(prefix) && /^\d{4}$/.test(value.slice(prefix.length)))
    .map((value) => Number(value.slice(prefix.length)));
  const next = (sequences.length === 0 ? 0 : Math.max(...sequences)) + 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
}

async function down(queryInterface: QueryInterface): Promise<void> {
  void queryInterface;
  const branches = await Branch.findAll({ where: { code: BRANCHES.map((branch) => branch.code) } });
  const branchIds = branches.map((branch) => branch.id);
  const classes = branchIds.length ? await AcademicClass.findAll({ where: { branchId: branchIds } }) : [];
  const classIds = classes.map((row) => row.id);
  const assignments = classIds.length
    ? await ClassCurriculumAssignment.findAll({ where: { classId: classIds } })
    : [];
  const assignmentIds = assignments.map((row) => row.id);
  if (assignmentIds.length) {
    await ClassCourseOffering.destroy({ where: { classCurriculumAssignmentId: assignmentIds } });
    await ClassCurriculumAssignment.destroy({ where: { id: assignmentIds } });
  }
  if (classIds.length) {
    await StudentClassEnrolment.destroy({ where: { classId: classIds } });
    await FirstYearCycleAllocation.destroy({ where: { classId: classIds } });
  }

  const students = branchIds.length ? await Student.findAll({ where: { branchId: branchIds } }) : [];
  const studentEmails = BRANCHES.flatMap((branch) =>
    [1, 2, 3, 4].flatMap((yearLevel) => ['A', 'B', 'C'].map((section) => studentEmail(branch.code, yearLevel, section))),
  );
  if (students.length) {
    await StudentClassEnrolment.destroy({ where: { studentId: students.map((row) => row.id) } });
    await Student.destroy({ where: { id: students.map((row) => row.id) } });
  }
  await User.destroy({ where: { email: studentEmails } });

  const faculty = await Faculty.findAll({
    where: { employeeNumber: FACULTY_ACCOUNTS.map((account) => account.employeeNumber) },
  });
  if (faculty.length) {
    await FacultyCourseAssignment.destroy({ where: { facultyId: faculty.map((row) => row.id) } });
    await ClassCourseOffering.update(
      { assignedFacultyId: null },
      { where: { assignedFacultyId: faculty.map((row) => row.id) } },
    );
    await Faculty.destroy({ where: { id: faculty.map((row) => row.id) } });
  }
  await User.destroy({ where: { email: FACULTY_ACCOUNTS.map((account) => account.email) } });

  const curriculumNames = [
    'P-Cycle',
    'C-Cycle',
    ...CSE_SEMESTERS.map(([semester]) => `CSE Semester ${semester}`),
    ...MECH_SEMESTERS.map(([semester]) => `MECH Semester ${semester}`),
  ];
  const curricula = await Curriculum.findAll({ where: { name: curriculumNames } });
  if (curricula.length) {
    await CurriculumCourse.destroy({ where: { curriculumId: curricula.map((row) => row.id) } });
    await Curriculum.destroy({ where: { id: curricula.map((row) => row.id) } });
  }
  await Course.destroy({ where: { code: allCourseSeeds().map(([code]) => code) } });
  if (classIds.length) {
    await AcademicClass.destroy({ where: { id: classIds } });
  }
  if (branchIds.length) {
    await Branch.destroy({ where: { id: branchIds } });
  }

  const year = await AcademicYear.findOne({ where: { name: YEAR_NAME } });
  if (year) {
    await AcademicTerm.destroy({ where: { academicYearId: year.id } });
    await AcademicYear.destroy({ where: { id: year.id } });
  }
}

module.exports = { up, down };
