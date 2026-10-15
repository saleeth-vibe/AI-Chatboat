import type { UserRole } from './user';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        role: UserRole;
        isActive: boolean;
        mustChangePassword: boolean;
      };
    }
  }
}

export {};
