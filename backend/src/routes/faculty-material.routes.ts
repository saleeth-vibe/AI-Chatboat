import { Router } from 'express';
import { courses, documents, upload } from '../controllers/faculty-material.controller';
import { pdfUpload } from '../middleware/pdf-upload';

export const facultyMaterialRouter = Router();

facultyMaterialRouter.get('/', courses);
facultyMaterialRouter.post('/:courseId/documents', pdfUpload.single('file'), upload);
facultyMaterialRouter.get('/:courseId/documents', documents);
