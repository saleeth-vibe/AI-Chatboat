import multer from 'multer';
import { env } from '../config/env';

export const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.rag.maxPdfBytes, files: 1 },
});
