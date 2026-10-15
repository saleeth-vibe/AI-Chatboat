import { Router } from 'express';
import { classes, create, getOne, list, update } from '../controllers/branch.controller';

export const branchRouter = Router();

branchRouter.get('/', list);
branchRouter.post('/', create);
branchRouter.get('/:id/classes', classes);
branchRouter.get('/:id', getOne);
branchRouter.patch('/:id', update);
