export type UserRole = 'ADMIN' | 'STUDENT' | 'FACULTY';

export type PublicUser = {
  id: number;
  email: string;
  role: UserRole;
  mustChangePassword: boolean;
};
