import { Router } from 'express';
import { create, getOne, list, update } from '../controllers/department.controller';

export const departmentRouter = Router();

departmentRouter.get('/', list);
departmentRouter.post('/', create);
departmentRouter.get('/:id', getOne);
departmentRouter.patch('/:id', update);
