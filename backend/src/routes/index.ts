import { Router } from 'express';
import { current } from '../controllers/academic-term.controller';
import { show } from '../controllers/dashboard.controller';
import { health } from '../controllers/health.controller';
import { authenticate } from '../middleware/authenticate';
import { requireAdmin } from '../middleware/require-admin';
import { requireFaculty, requireStudent } from '../middleware/require-role';
import { academicYearRouter } from './academic-year.routes';
import { academicTermRouter, academicYearNestedRouter } from './academic-term.routes';
import { academicTermActionRouter, assignmentRouter, offeringRouter } from './assignment.routes';
import { publicAuthRouter, sessionAuthRouter } from './auth.routes';
import { branchRouter } from './branch.routes';
import { classRouter } from './class.routes';
import { courseRouter } from './course.routes';
import { curriculumRouter } from './curriculum.routes';
import { departmentRouter } from './department.routes';
import { document as facultyDocument } from '../controllers/faculty-material.controller';
import { facultyMaterialRouter } from './faculty-material.routes';
import { facultyRouter } from './faculty.routes';
import { studentAssistantRouter } from './student-assistant.routes';
import { studentRouter } from './student.routes';

export const apiRouter = Router();

apiRouter.get('/health', health);
apiRouter.use('/auth', publicAuthRouter);

const sessionRouter = Router();
sessionRouter.use(authenticate);
sessionRouter.use('/auth', sessionAuthRouter);
sessionRouter.get('/academic-calendar/current', current);
sessionRouter.use('/faculty/courses', requireFaculty, facultyMaterialRouter);
sessionRouter.get('/faculty/documents/:documentId', requireFaculty, facultyDocument);
sessionRouter.use('/student', requireStudent, studentAssistantRouter);

const adminRouter = Router();
adminRouter.use(requireAdmin);
adminRouter.use('/academic-years', academicYearNestedRouter);
adminRouter.use('/academic-years', academicYearRouter);
adminRouter.use('/academic-terms', academicTermActionRouter);
adminRouter.use('/academic-terms', academicTermRouter);
adminRouter.use('/departments', departmentRouter);
adminRouter.use('/branches', branchRouter);
adminRouter.use('/classes', classRouter);
adminRouter.use('/courses', courseRouter);
adminRouter.use('/curricula', curriculumRouter);
adminRouter.use('/faculty', facultyRouter);
adminRouter.use('/students', studentRouter);
adminRouter.use('/class-curriculum-assignments', assignmentRouter);
adminRouter.use('/class-course-offerings', offeringRouter);
adminRouter.get('/dashboard', show);

sessionRouter.use(adminRouter);
apiRouter.use(sessionRouter);
