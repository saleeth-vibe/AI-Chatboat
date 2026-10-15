import { facultyCourses } from '../services/course-access.service';
import { getCourseDocument, ingestPdf, listCourseDocuments } from '../services/document-ingestion.service';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/errors';
import { requireId } from '../utils/request';
import { validateDocumentUpload, validateTermQuery } from '../validators/assistant.validator';

export const courses = asyncHandler(async (req, res) => {
  const query = validateTermQuery(req.query);
  res.json({ courses: await facultyCourses(requireUserId(req.user?.id), query.academicTermId) });
});

export const upload = asyncHandler(async (req, res) => {
  const courseId = requireId(req.params.courseId, 'courseId');
  const input = validateDocumentUpload(req.body, req.file);
  const result = await ingestPdf({
    userId: requireUserId(req.user?.id),
    courseId,
    academicTermId: input.academicTermId,
    title: input.title,
    originalFilename: input.file.originalname,
    bytes: input.file.buffer,
  });
  res.status(result.created ? 201 : 200).json(result.document);
});

export const documents = asyncHandler(async (req, res) => {
  const query = validateTermQuery(req.query);
  res.json({
    documents: await listCourseDocuments(requireUserId(req.user?.id), requireId(req.params.courseId, 'courseId'), query.academicTermId),
  });
});

export const document = asyncHandler(async (req, res) => {
  res.json(await getCourseDocument(requireUserId(req.user?.id), requireId(req.params.documentId, 'documentId')));
});

function requireUserId(userId: number | undefined): number {
  if (!userId) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
  }
  return userId;
}
