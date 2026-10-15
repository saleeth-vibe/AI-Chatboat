import { Router } from 'express';
import { create, getOne, list, update } from '../controllers/academic-year.controller';

export const academicYearRouter = Router();

academicYearRouter.get('/', list);
academicYearRouter.post('/', create);
academicYearRouter.get('/:id', getOne);
academicYearRouter.patch('/:id', update);
