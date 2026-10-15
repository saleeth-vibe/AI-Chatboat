import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from '../components/layout/AdminLayout';
import { AllocationPage } from '../features/academic-years/pages/AllocationPage';
import { AcademicYearFormPage } from '../features/academic-years/pages/AcademicYearFormPage';
import { AcademicYearListPage } from '../features/academic-years/pages/AcademicYearListPage';
import { AssignmentDetailPage } from '../features/assignments/AssignmentDetailPage';
import { AssignmentListPage } from '../features/assignments/AssignmentListPage';
import { RequireAdmin } from '../features/auth/RequireAdmin';
import { RequirePasswordChange } from '../features/auth/RequirePasswordChange';
import { RequireFaculty } from '../features/auth/RequireFaculty';
import { RequireStudent } from '../features/auth/RequireStudent';
import { RoleLayout } from '../components/layout/RoleLayout';
import { FacultyHomePage } from '../features/teaching/FacultyHomePage';
import { AssistantPage } from '../features/assistant/AssistantPage';
import { ChangePasswordPage } from '../features/auth/pages/ChangePasswordPage';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { BranchDetailPage, BranchFormPage, BranchListPage } from '../features/branches/BranchPages';
import { ConfigurationPage } from '../features/configuration/ConfigurationPage';
import { CourseFormPage, CourseListPage } from '../features/courses/CoursePages';
import { CurriculumDetailPage, CurriculumFormPage, CurriculumListPage } from '../features/curricula/CurriculumPages';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { DepartmentFormPage, DepartmentListPage } from '../features/departments/DepartmentPages';
import { FacultyDetailPage, FacultyFormPage, FacultyListPage } from '../features/faculty/FacultyPages';
import { StudentDetailPage, StudentFormPage, StudentListPage } from '../features/students/StudentPages';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequirePasswordChange />}>
          <Route path="/account/password" element={<ChangePasswordPage />} />
        </Route>
        {/* Faculty course material management */}
        <Route element={<RequireFaculty />}>
          <Route element={<RoleLayout title="Campus Teaching" />}>
            <Route path="/teach" element={<FacultyHomePage />} />
          </Route>
        </Route>
        {/* Student course assistant */}
        <Route element={<RequireStudent />}>
          <Route path="/assistant" element={<AssistantPage />} />
        </Route>
        <Route element={<RequireAdmin />}>
          <Route element={<AdminLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/academic-years" element={<AcademicYearListPage />} />
            <Route path="/academic-years/new" element={<AcademicYearFormPage />} />
            <Route path="/academic-years/:id/first-year-allocation" element={<AllocationPage />} />
            <Route path="/academic-years/:id" element={<AcademicYearFormPage />} />
            <Route path="/departments" element={<DepartmentListPage />} />
            <Route path="/departments/new" element={<DepartmentFormPage />} />
            <Route path="/departments/:id" element={<DepartmentFormPage />} />
            <Route path="/branches" element={<BranchListPage />} />
            <Route path="/branches/new" element={<BranchFormPage />} />
            <Route path="/branches/:id" element={<BranchDetailPage />} />
            <Route path="/courses" element={<CourseListPage />} />
            <Route path="/courses/new" element={<CourseFormPage />} />
            <Route path="/courses/:id" element={<CourseFormPage />} />
            <Route path="/curricula" element={<CurriculumListPage />} />
            <Route path="/curricula/new" element={<CurriculumFormPage />} />
            <Route path="/curricula/:id" element={<CurriculumDetailPage />} />
            <Route path="/faculty" element={<FacultyListPage />} />
            <Route path="/faculty/new" element={<FacultyFormPage />} />
            <Route path="/faculty/:id" element={<FacultyDetailPage />} />
            <Route path="/students" element={<StudentListPage />} />
            <Route path="/students/new" element={<StudentFormPage />} />
            <Route path="/students/:id" element={<StudentDetailPage />} />
            <Route path="/assignments" element={<AssignmentListPage />} />
            <Route path="/class-curriculum-assignments/:id" element={<AssignmentDetailPage />} />
            <Route path="/configuration" element={<ConfigurationPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
