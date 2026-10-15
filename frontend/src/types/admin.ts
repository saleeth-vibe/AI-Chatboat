export type PageMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type Page<T> = {
  data: T[];
  meta: PageMeta;
};

export type Department = {
  id: number;
  name: string;
  code: string;
  isActive: boolean;
};

export type Branch = {
  id: number;
  name: string;
  code: string;
  durationYears: number;
  sectionsPerYear: number;
  classCapacity: number;
  supportsFirstYearCycles: boolean;
  isActive: boolean;
};

export type SchoolClass = {
  id: number;
  branchId: number;
  yearLevel: number;
  sectionCode: string;
  capacity: number;
  isActive: boolean;
  activeStudents: number;
  label: string;
};

export type Course = {
  id: number;
  code: string;
  name: string;
  departmentId: number | null;
  departmentName: string | null;
  description: string | null;
  isActive: boolean;
};

export type CurriculumCourse = {
  id: number;
  code: string;
  name: string;
};

export type Curriculum = {
  id: number;
  name: string;
  scopeType: 'GLOBAL_CYCLE' | 'BRANCH';
  branchId: number | null;
  branchCode: string | null;
  semesterLevel: number | null;
  cycleType: 'P' | 'C' | null;
  isActive: boolean;
  courseCount: number;
  courses: CurriculumCourse[];
};

export type FacultyMember = {
  id: number;
  userId: number;
  email: string;
  initialPassword: string | null;
  employeeNumber: string;
  name: string;
  affiliationType: 'BRANCH' | 'DEPARTMENT';
  branchId: number | null;
  departmentId: number | null;
  branchCode: string | null;
  departmentCode: string | null;
  isActive: boolean;
};

export type Eligibility = {
  id: number;
  facultyId: number;
  courseId: number;
  courseCode: string;
  courseName: string;
  academicTermId: number;
  termLabel: string;
  periodType: 'ODD' | 'EVEN' | null;
  startDate: string | null;
  status: 'ACTIVE' | 'CANCELLED';
};

export type StudentClass = {
  id: number;
  yearLevel: number;
  sectionCode: string;
  label: string;
  academicYearId: number | null;
  academicYearName: string;
};

export type Student = {
  id: number;
  email: string;
  initialPassword: string | null;
  universityId: string;
  name: string;
  branchId: number;
  branchCode: string;
  entryYearLevel: number;
  isActive: boolean;
  currentClass: StudentClass | null;
};

export type ClassHistoryRow = {
  id: number;
  classLabel: string;
  startYear: string;
  endYear: string | null;
  status: 'ACTIVE' | 'COMPLETED' | 'TRANSFERRED';
};

export type PromotionResult = {
  studentId: number;
  outcome: 'PROMOTED' | 'GRADUATED';
  fromClass: string;
  toClass: string | null;
};

export type AcademicTerm = {
  id: number;
  academicYearId: number;
  periodType: 'ODD' | 'EVEN';
  startDate: string;
  endDate: string;
};

export type TermChoice = AcademicTerm & {
  label: string;
};

export type CalendarSnapshot = {
  today: string;
  status: 'TERM' | 'BREAK' | 'NONE';
  academicYear: { id: number; name: string } | null;
  academicTerm: { id: number; periodType: 'ODD' | 'EVEN'; startDate: string; endDate: string } | null;
};

export type Allocation = {
  cohortAcademicYearId: number;
  exists: boolean;
  canReset: boolean;
  allocations: Array<{
    classId: number;
    label: string;
    branchCode: string;
    sectionCode: string;
    semester1CycleType: 'P' | 'C';
    semester2CycleType: 'P' | 'C';
  }>;
};

export type AssignmentSummary = {
  id: number;
  classId: number;
  classLabel: string;
  academicTermId: number;
  academicYearName: string;
  periodType: 'ODD' | 'EVEN';
  curriculumId: number;
  curriculumName: string;
  semesterLevel: number | null;
  status: 'PLANNED' | 'ONGOING' | 'COMPLETED';
};

export type Offering = {
  id: number;
  courseId: number;
  courseCode: string;
  courseName: string;
  assignedFacultyId: number | null;
  assignedFacultyName: string | null;
  status: 'PLANNED' | 'ONGOING' | 'COMPLETED';
  eligibleFaculty: Array<{ id: number; name: string }>;
};

export type AssignmentDetail = AssignmentSummary & {
  offerings: Offering[];
};

export type GenerateResult = {
  academicTermId: number;
  createdAssignments: number;
  createdOfferings: number;
  alreadyAssigned: number;
  conflicts: Array<{ classId: number; classLabel: string; reason: string }>;
};

export type ConfigurationStatus = {
  academicTermId: number;
  missingFirstYearAllocation: boolean;
  classesMissingCurriculum: Array<{ classId: number; classLabel: string; reason: string }>;
  offeringsMissingFaculty: Array<{ offeringId: number; assignmentId: number; classLabel: string; courseCode: string }>;
};

export type Dashboard = {
  counts: {
    branches: number;
    departments: number;
    courses: number;
    curricula: number;
    faculty: number;
    students: number;
  };
  calendar: CalendarSnapshot;
};
