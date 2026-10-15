import { changePassword as changeUserPassword, login as loginUser } from '../services/auth.service';
import { asyncHandler } from '../utils/async-handler';
import { clearAuthCookie, setAuthCookie } from '../utils/cookies';
import { AppError } from '../utils/errors';
import { validateChangePassword, validateLoginBody } from '../validators/auth.validator';

export const login = asyncHandler(async (req, res) => {
  const input = validateLoginBody(req.body);
  const result = await loginUser(input.email, input.password);
  setAuthCookie(res, result.token);
  res.json({ user: result.user });
});

export const me = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
  }

  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      mustChangePassword: req.user.mustChangePassword,
    },
  });
});

export const changePassword = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
  }
  const password = validateChangePassword(req.body);
  res.json({ user: await changeUserPassword(req.user.id, password) });
});

export const logout = asyncHandler(async (_req, res) => {
  clearAuthCookie(res);
  res.json({ success: true });
});
