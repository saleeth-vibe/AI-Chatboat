import { AcademicClass } from './academic-class.model';
import { AcademicTerm } from './academic-term.model';
import { AcademicYear } from './academic-year.model';
import { AssistantChat } from './assistant-chat.model';
import { AssistantMessage } from './assistant-message.model';
import { Branch } from './branch.model';
import { ClassCourseOffering } from './class-course-offering.model';
import { ClassCurriculumAssignment } from './class-curriculum-assignment.model';
import { CourseDocumentChunk } from './course-document-chunk.model';
import { CourseDocument } from './course-document.model';
import { Course } from './course.model';
import { CurriculumCourse } from './curriculum-course.model';
import { Curriculum } from './curriculum.model';
import { Department } from './department.model';
import { FacultyCourseAssignment } from './faculty-course-assignment.model';
import { Faculty } from './faculty.model';
import { FirstYearCycleAllocation } from './first-year-cycle-allocation.model';
import { StudentClassEnrolment } from './student-class-enrolment.model';
import { Student } from './student.model';
import { User } from './user.model';

AcademicYear.hasMany(AcademicTerm, { foreignKey: 'academicYearId' });
AcademicTerm.belongsTo(AcademicYear, { foreignKey: 'academicYearId' });

Branch.hasMany(AcademicClass, { foreignKey: 'branchId' });
AcademicClass.belongsTo(Branch, { foreignKey: 'branchId' });

Department.hasMany(Course, { foreignKey: 'departmentId' });
Course.belongsTo(Department, { foreignKey: 'departmentId' });

Branch.hasMany(Curriculum, { foreignKey: 'branchId' });
Curriculum.belongsTo(Branch, { foreignKey: 'branchId' });
Curriculum.belongsToMany(Course, { through: CurriculumCourse, foreignKey: 'curriculumId', otherKey: 'courseId' });
Course.belongsToMany(Curriculum, { through: CurriculumCourse, foreignKey: 'courseId', otherKey: 'curriculumId' });
CurriculumCourse.belongsTo(Curriculum, { foreignKey: 'curriculumId' });
CurriculumCourse.belongsTo(Course, { foreignKey: 'courseId' });

User.hasOne(Faculty, { foreignKey: 'userId' });
Faculty.belongsTo(User, { foreignKey: 'userId' });
Faculty.belongsTo(Branch, { foreignKey: 'branchId' });
Faculty.belongsTo(Department, { foreignKey: 'departmentId' });

User.hasOne(Student, { foreignKey: 'userId' });
Student.belongsTo(User, { foreignKey: 'userId' });
Student.belongsTo(Branch, { foreignKey: 'branchId' });
Student.hasMany(StudentClassEnrolment, { foreignKey: 'studentId' });
StudentClassEnrolment.belongsTo(Student, { foreignKey: 'studentId' });
StudentClassEnrolment.belongsTo(AcademicClass, { foreignKey: 'classId' });
StudentClassEnrolment.belongsTo(AcademicYear, { foreignKey: 'startAcademicYearId', as: 'startYear' });
StudentClassEnrolment.belongsTo(AcademicYear, { foreignKey: 'endAcademicYearId', as: 'endYear' });

Faculty.hasMany(FacultyCourseAssignment, { foreignKey: 'facultyId' });
FacultyCourseAssignment.belongsTo(Faculty, { foreignKey: 'facultyId' });
FacultyCourseAssignment.belongsTo(Course, { foreignKey: 'courseId' });
FacultyCourseAssignment.belongsTo(AcademicTerm, { foreignKey: 'academicTermId' });

AcademicYear.hasMany(FirstYearCycleAllocation, { foreignKey: 'cohortAcademicYearId' });
FirstYearCycleAllocation.belongsTo(AcademicYear, { foreignKey: 'cohortAcademicYearId' });
FirstYearCycleAllocation.belongsTo(AcademicClass, { foreignKey: 'classId' });
FirstYearCycleAllocation.belongsTo(User, { foreignKey: 'allocatedByUserId' });

AcademicClass.hasMany(ClassCurriculumAssignment, { foreignKey: 'classId' });
ClassCurriculumAssignment.belongsTo(AcademicClass, { foreignKey: 'classId' });
ClassCurriculumAssignment.belongsTo(AcademicTerm, { foreignKey: 'academicTermId' });
ClassCurriculumAssignment.belongsTo(Curriculum, { foreignKey: 'curriculumId' });
ClassCurriculumAssignment.hasMany(ClassCourseOffering, { foreignKey: 'classCurriculumAssignmentId' });
ClassCourseOffering.belongsTo(ClassCurriculumAssignment, { foreignKey: 'classCurriculumAssignmentId' });
ClassCourseOffering.belongsTo(Course, { foreignKey: 'courseId' });
ClassCourseOffering.belongsTo(Faculty, { foreignKey: 'assignedFacultyId' });

Course.hasMany(CourseDocument, { foreignKey: 'courseId' });
CourseDocument.belongsTo(Course, { foreignKey: 'courseId' });
CourseDocument.belongsTo(AcademicTerm, { foreignKey: 'academicTermId' });
CourseDocument.belongsTo(Faculty, { foreignKey: 'uploadedByFacultyId' });
CourseDocument.hasMany(CourseDocumentChunk, { foreignKey: 'documentId' });
CourseDocumentChunk.belongsTo(CourseDocument, { foreignKey: 'documentId' });

Student.hasMany(AssistantChat, { foreignKey: 'studentId' });
AssistantChat.belongsTo(Student, { foreignKey: 'studentId' });
AssistantChat.belongsTo(Course, { foreignKey: 'courseId' });
AssistantChat.belongsTo(AcademicTerm, { foreignKey: 'academicTermId' });
AssistantChat.hasMany(AssistantMessage, { foreignKey: 'chatId' });
AssistantMessage.belongsTo(AssistantChat, { foreignKey: 'chatId' });

export {
  AcademicClass,
  AcademicTerm,
  AcademicYear,
  AssistantChat,
  AssistantMessage,
  Branch,
  ClassCourseOffering,
  ClassCurriculumAssignment,
  Course,
  CourseDocument,
  CourseDocumentChunk,
  Curriculum,
  CurriculumCourse,
  Department,
  Faculty,
  FacultyCourseAssignment,
  FirstYearCycleAllocation,
  Student,
  StudentClassEnrolment,
  User,
};
