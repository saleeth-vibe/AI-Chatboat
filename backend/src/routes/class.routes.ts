import { Router } from 'express';
import { getClassOne, updateClassOne } from '../controllers/branch.controller';
import { curriculumForClass, offeringsForClass } from '../controllers/assignment.controller';
import { classStudents } from '../controllers/student.controller';

export const classRouter = Router();

classRouter.get('/:id/students', classStudents);
classRouter.get('/:id/curriculum', curriculumForClass);
classRouter.get('/:id/course-offerings', offeringsForClass);
classRouter.get('/:id', getClassOne);
classRouter.patch('/:id', updateClassOne);
