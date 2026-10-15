import { Router } from 'express';
import { assignment, assignments, configuration, generate, patchOffering, terms } from '../controllers/assignment.controller';

export const academicTermActionRouter = Router();

academicTermActionRouter.get('/', terms);
academicTermActionRouter.post('/:id/generate-class-curriculum-assignments', generate);
academicTermActionRouter.get('/:id/class-curriculum-assignments', assignments);
academicTermActionRouter.get('/:id/configuration-status', configuration);

export const assignmentRouter = Router();
assignmentRouter.get('/:id', assignment);

export const offeringRouter = Router();
offeringRouter.patch('/:id', patchOffering);
