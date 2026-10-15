import type { AcademicYear, AcademicYearInput, AcademicYearList } from '../types/academic-year';
import { apiRequest } from './client';

export type AcademicYearQuery = {
  page: number;
  pageSize: number;
  search?: string;
  isActive?: boolean;
};

export function listAcademicYears(query: AcademicYearQuery): Promise<AcademicYearList> {
  const params = new URLSearchParams();
  params.set('page', String(query.page));
  params.set('pageSize', String(query.pageSize));
  if (query.search) {
    params.set('search', query.search);
  }
  if (query.isActive !== undefined) {
    params.set('isActive', String(query.isActive));
  }
  return apiRequest(`/academic-years?${params.toString()}`);
}

export function getAcademicYear(id: number): Promise<AcademicYear> {
  return apiRequest(`/academic-years/${id}`);
}

export function createAcademicYear(input: AcademicYearInput): Promise<AcademicYear> {
  return apiRequest('/academic-years', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateAcademicYear(id: number, input: AcademicYearInput): Promise<AcademicYear> {
  return apiRequest(`/academic-years/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
