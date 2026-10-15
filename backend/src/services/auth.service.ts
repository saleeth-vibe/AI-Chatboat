import { User } from '../models';
import type { PublicUser } from '../types/user';
import { AppError, conflict } from '../utils/errors';
import { hashPassword, passwordsMatch } from '../utils/password';
import { signToken } from '../utils/token';

export type LoginResult = {
  token: string;
  user: PublicUser;
};

export async function login(email: string, password: string): Promise<LoginResult> {
  const user = await User.unscoped().findOne({ where: { email } });
  const passwordMatches = await passwordsMatch(password, user?.passwordHash);

  if (!user || !user.isActive || !passwordMatches) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  return {
    token: signToken({ sub: user.id, role: user.role }),
    user: toPublicUser(user),
  };
}

export async function changePassword(userId: number, password: string): Promise<PublicUser> {
  const user = await User.unscoped().findByPk(userId);
  if (!user || !user.isActive || (user.role !== 'STUDENT' && user.role !== 'FACULTY') || !user.mustChangePassword) {
    throw conflict('This password was already changed.');
  }
  await user.update({
    passwordHash: await hashPassword(password),
    mustChangePassword: false,
    initialPassword: null,
  });
  return {
    id: Number(user.id),
    email: user.email,
    role: user.role,
    mustChangePassword: false,
  };
}

function toPublicUser(user: User): PublicUser {
  return {
    id: Number(user.id),
    email: user.email,
    role: user.role,
    mustChangePassword: Boolean(user.mustChangePassword),
  };
}
