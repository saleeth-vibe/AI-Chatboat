import { Router } from 'express';
import { create, getOne, list, replaceCourses, update } from '../controllers/curriculum.controller';

export const curriculumRouter = Router();

curriculumRouter.get('/', list);
curriculumRouter.post('/', create);
curriculumRouter.get('/:id', getOne);
curriculumRouter.patch('/:id', update);
curriculumRouter.put('/:id/courses', replaceCourses);
