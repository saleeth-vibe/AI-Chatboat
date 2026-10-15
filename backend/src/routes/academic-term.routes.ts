import { Router } from 'express';
import { create, list, update } from '../controllers/academic-term.controller';
import { allocation, clearAllocation, saveAllocation } from '../controllers/assignment.controller';

export const academicYearNestedRouter = Router();

academicYearNestedRouter.get('/:id/terms', list);
academicYearNestedRouter.post('/:id/terms', create);
academicYearNestedRouter.get('/:id/first-year-cycle-allocation', allocation);
academicYearNestedRouter.post('/:id/first-year-cycle-allocation', saveAllocation);
academicYearNestedRouter.post('/:id/first-year-cycle-allocation/reset', clearAllocation);

export const academicTermRouter = Router();
academicTermRouter.patch('/:id', update);
