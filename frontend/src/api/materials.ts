import { apiRequest } from './client';
import type { CalendarSnapshot } from '../types/admin';

export type TeachingCourse = {
  id: number;
  code: string;
  name: string;
};

export type CourseDocument = {
  id: number;
  courseId: number;
  academicTermId: number;
  title: string;
  originalFilename: string;
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';
  errorMessage: string | null;
  pageCount: number | null;
  chunkCount: number;
  createdAt: string;
};

export function currentCalendar(): Promise<CalendarSnapshot> {
  return apiRequest('/academic-calendar/current');
}

export function listTeachingCourses(academicTermId: number): Promise<{ courses: TeachingCourse[] }> {
  return apiRequest(`/faculty/courses?academicTermId=${academicTermId}`);
}

export function listCourseDocuments(courseId: number, academicTermId: number): Promise<{ documents: CourseDocument[] }> {
  return apiRequest(`/faculty/courses/${courseId}/documents?academicTermId=${academicTermId}`);
}

export function uploadCourseDocument(courseId: number, academicTermId: number, title: string, file: File): Promise<CourseDocument> {
  const body = new FormData();
  body.set('academicTermId', String(academicTermId));
  body.set('title', title);
  body.set('file', file);
  return apiRequest(`/faculty/courses/${courseId}/documents`, { method: 'POST', body });
}
