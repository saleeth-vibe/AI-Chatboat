import { Router } from 'express';
import { changePassword, login, logout, me } from '../controllers/auth.controller';

export const publicAuthRouter = Router();
publicAuthRouter.post('/login', login);

export const sessionAuthRouter = Router();
sessionAuthRouter.get('/me', me);
sessionAuthRouter.post('/password', changePassword);
sessionAuthRouter.post('/logout', logout);
