export type AcademicYear = {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

export type AcademicYearInput = {
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

export type AcademicYearList = {
  data: AcademicYear[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};
