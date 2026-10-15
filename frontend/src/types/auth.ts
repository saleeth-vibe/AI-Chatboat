export type AuthUser = {
  id: number;
  email: string;
  role: 'ADMIN' | 'STUDENT' | 'FACULTY';
  mustChangePassword: boolean;
};

export type FieldError = {
  field: string;
  message: string;
};
