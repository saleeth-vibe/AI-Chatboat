import { Router } from 'express';
import { addAssignment, assignments, create, getOne, list, removeAssignment, update } from '../controllers/faculty.controller';

export const facultyRouter = Router();

facultyRouter.get('/', list);
facultyRouter.post('/', create);
facultyRouter.get('/:id/course-assignments', assignments);
facultyRouter.post('/:id/course-assignments', addAssignment);
facultyRouter.delete('/:id/course-assignments/:assignmentId', removeAssignment);
facultyRouter.get('/:id', getOne);
facultyRouter.patch('/:id', update);
