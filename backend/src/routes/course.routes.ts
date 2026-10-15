import { Router } from 'express';
import { create, getOne, list, update } from '../controllers/course.controller';

export const courseRouter = Router();

courseRouter.get('/', list);
courseRouter.post('/', create);
courseRouter.get('/:id', getOne);
courseRouter.patch('/:id', update);
