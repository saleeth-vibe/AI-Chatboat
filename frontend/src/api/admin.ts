import type {
  AcademicTerm,
  Allocation,
  AssignmentDetail,
  AssignmentSummary,
  Branch,
  CalendarSnapshot,
  ConfigurationStatus,
  Course,
  Curriculum,
  Dashboard,
  Department,
  Eligibility,
  FacultyMember,
  GenerateResult,
  Page,
  PromotionResult,
  SchoolClass,
  Student,
  ClassHistoryRow,
  TermChoice,
} from '../types/admin';
import { apiRequest } from './client';
import { toQuery } from './query';

export type ListQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
};

export function listDepartments(query: ListQuery = {}): Promise<Page<Department>> {
  return apiRequest(`/departments${toQuery(query)}`);
}

export function getDepartment(id: number): Promise<Department> {
  return apiRequest(`/departments/${id}`);
}

export function createDepartment(input: { name: string; code: string; isActive: boolean }): Promise<Department> {
  return apiRequest('/departments', { method: 'POST', body: JSON.stringify(input) });
}

export function updateDepartment(id: number, input: { name: string; code: string; isActive: boolean }): Promise<Department> {
  return apiRequest(`/departments/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function listBranches(query: ListQuery = {}): Promise<Page<Branch>> {
  return apiRequest(`/branches${toQuery(query)}`);
}

export function getBranch(id: number): Promise<Branch> {
  return apiRequest(`/branches/${id}`);
}

export function createBranch(input: {
  name: string;
  code: string;
  durationYears: number;
  sectionsPerYear: number;
  classCapacity: number;
  supportsFirstYearCycles: boolean;
  isActive: boolean;
}): Promise<Branch & { classes: SchoolClass[] }> {
  return apiRequest('/branches', { method: 'POST', body: JSON.stringify(input) });
}

export function updateBranch(
  id: number,
  input: { name?: string; classCapacity?: number; isActive?: boolean },
): Promise<Branch> {
  return apiRequest(`/branches/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function listClasses(branchId: number): Promise<SchoolClass[]> {
  return apiRequest(`/branches/${branchId}/classes`);
}

export function updateClass(id: number, input: { capacity?: number; isActive?: boolean }): Promise<SchoolClass> {
  return apiRequest(`/classes/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function listCourses(query: ListQuery & { departmentId?: number } = {}): Promise<Page<Course>> {
  return apiRequest(`/courses${toQuery(query)}`);
}

export function getCourse(id: number): Promise<Course> {
  return apiRequest(`/courses/${id}`);
}

export function saveCourse(
  id: number | undefined,
  input: { code: string; name: string; departmentId: number | null; description: string | null; isActive: boolean },
): Promise<Course> {
  return apiRequest(id ? `/courses/${id}` : '/courses', {
    method: id ? 'PATCH' : 'POST',
    body: JSON.stringify(input),
  });
}

export function listCurricula(query: ListQuery = {}): Promise<Page<Curriculum>> {
  return apiRequest(`/curricula${toQuery(query)}`);
}

export function getCurriculum(id: number): Promise<Curriculum> {
  return apiRequest(`/curricula/${id}`);
}

export function createCurriculum(input: {
  name: string;
  scopeType: 'GLOBAL_CYCLE' | 'BRANCH';
  branchId: number | null;
  semesterLevel: number | null;
  cycleType: 'P' | 'C' | null;
  isActive: boolean;
}): Promise<Curriculum> {
  return apiRequest('/curricula', { method: 'POST', body: JSON.stringify(input) });
}

export function updateCurriculum(id: number, input: { name: string; isActive: boolean }): Promise<Curriculum> {
  return apiRequest(`/curricula/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function replaceCurriculumCourses(id: number, courseIds: number[]): Promise<Curriculum> {
  return apiRequest(`/curricula/${id}/courses`, { method: 'PUT', body: JSON.stringify({ courseIds }) });
}

export function listFaculty(query: ListQuery = {}): Promise<Page<FacultyMember>> {
  return apiRequest(`/faculty${toQuery(query)}`);
}

export function getFaculty(id: number): Promise<FacultyMember> {
  return apiRequest(`/faculty/${id}`);
}

export function createFaculty(input: {
  email: string;
  name: string;
  employeeNumber: string;
  affiliationType: 'BRANCH' | 'DEPARTMENT';
  branchId: number | null;
  departmentId: number | null;
  isActive: boolean;
}): Promise<FacultyMember> {
  return apiRequest('/faculty', { method: 'POST', body: JSON.stringify(input) });
}

export function updateFaculty(
  id: number,
  input: {
    email: string;
    name: string;
    affiliationType: 'BRANCH' | 'DEPARTMENT';
    branchId: number | null;
    departmentId: number | null;
    isActive: boolean;
  },
): Promise<FacultyMember> {
  return apiRequest(`/faculty/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function listEligibility(facultyId: number): Promise<Eligibility[]> {
  return apiRequest(`/faculty/${facultyId}/course-assignments`);
}

export function addEligibility(facultyId: number, input: { courseId: number; academicTermId: number }): Promise<Eligibility> {
  return apiRequest(`/faculty/${facultyId}/course-assignments`, { method: 'POST', body: JSON.stringify(input) });
}

export function removeEligibility(facultyId: number, assignmentId: number): Promise<{ success: boolean }> {
  return apiRequest(`/faculty/${facultyId}/course-assignments/${assignmentId}`, { method: 'DELETE' });
}

export function listStudents(query: ListQuery & { branchId?: number } = {}): Promise<Page<Student>> {
  return apiRequest(`/students${toQuery(query)}`);
}

export function getStudent(id: number): Promise<Student> {
  return apiRequest(`/students/${id}`);
}

export function createStudent(input: {
  email: string;
  name: string;
  branchId: number;
  entryYearLevel: number;
  academicYearId: number;
}): Promise<Student> {
  return apiRequest('/students', { method: 'POST', body: JSON.stringify(input) });
}

export function updateStudent(
  id: number,
  input: { name: string; email: string; isActive: boolean },
): Promise<Student> {
  return apiRequest(`/students/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function classHistory(id: number): Promise<ClassHistoryRow[]> {
  return apiRequest(`/students/${id}/class-history`);
}

export function promoteStudents(input: { academicYearId: number; studentIds: number[] }): Promise<{ results: PromotionResult[] }> {
  return apiRequest('/students/promotions', { method: 'POST', body: JSON.stringify(input) });
}

export function listTerms(academicYearId: number): Promise<AcademicTerm[]> {
  return apiRequest(`/academic-years/${academicYearId}/terms`);
}

export function createTerm(
  academicYearId: number,
  input: { periodType: 'ODD' | 'EVEN'; startDate: string; endDate: string },
): Promise<AcademicTerm> {
  return apiRequest(`/academic-years/${academicYearId}/terms`, { method: 'POST', body: JSON.stringify(input) });
}

export function updateTerm(id: number, input: { startDate: string; endDate: string }): Promise<AcademicTerm> {
  return apiRequest(`/academic-terms/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function currentCalendar(): Promise<CalendarSnapshot> {
  return apiRequest('/academic-calendar/current');
}

export function listTermChoices(): Promise<TermChoice[]> {
  return apiRequest('/academic-terms');
}

export function getAllocation(academicYearId: number): Promise<Allocation> {
  return apiRequest(`/academic-years/${academicYearId}/first-year-cycle-allocation`);
}

export function createAllocation(academicYearId: number): Promise<Allocation> {
  return apiRequest(`/academic-years/${academicYearId}/first-year-cycle-allocation`, { method: 'POST' });
}

export function resetAllocation(academicYearId: number): Promise<Allocation> {
  return apiRequest(`/academic-years/${academicYearId}/first-year-cycle-allocation/reset`, { method: 'POST' });
}

export function generateAssignments(termId: number): Promise<GenerateResult> {
  return apiRequest(`/academic-terms/${termId}/generate-class-curriculum-assignments`, { method: 'POST' });
}

export function listAssignments(termId: number): Promise<AssignmentSummary[]> {
  return apiRequest(`/academic-terms/${termId}/class-curriculum-assignments`);
}

export function getAssignment(id: number): Promise<AssignmentDetail> {
  return apiRequest(`/class-curriculum-assignments/${id}`);
}

export function updateOffering(
  id: number,
  input: { assignedFacultyId?: number | null; status?: 'PLANNED' | 'ONGOING' | 'COMPLETED' },
): Promise<AssignmentDetail> {
  return apiRequest(`/class-course-offerings/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function configurationStatus(termId: number): Promise<ConfigurationStatus> {
  return apiRequest(`/academic-terms/${termId}/configuration-status`);
}

export function getDashboard(): Promise<Dashboard> {
  return apiRequest('/dashboard');
}
