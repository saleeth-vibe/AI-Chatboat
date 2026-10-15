import { Router } from 'express';
import { create, getOne, history, list, promote, update } from '../controllers/student.controller';

export const studentRouter = Router();

studentRouter.get('/', list);
studentRouter.post('/promotions', promote);
studentRouter.post('/', create);
studentRouter.get('/:id/class-history', history);
studentRouter.get('/:id', getOne);
studentRouter.patch('/:id', update);
