import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env';
import { sequelize } from '../database/connection';
import { CourseDocument, CourseDocumentChunk } from '../models';
import { chunkPages } from './chunk-text';
import { requireEligibleFaculty } from './course-access.service';
import { getGeminiClient } from './gemini.client';
import { readPdfPages } from './pdf-text';
import { l2Normalize } from './vectors';
import { AppError, notFound, unprocessable } from '../utils/errors';

const STORAGE_DIR = path.resolve(process.cwd(), 'storage', 'course-documents');
const BATCH_SIZE = 16;

export type DocumentDto = {
  id: number;
  courseId: number;
  academicTermId: number;
  title: string;
  originalFilename: string;
  status: string;
  errorMessage: string | null;
  pageCount: number | null;
  chunkCount: number;
  createdAt: string;
};

export async function ingestPdf(input: {
  userId: number;
  courseId: number;
  academicTermId: number;
  title: string;
  originalFilename: string;
  bytes: Buffer;
}): Promise<{ document: DocumentDto; created: boolean }> {
  const faculty = await requireEligibleFaculty(input.userId, input.courseId, input.academicTermId);
  assertPdf(input.bytes);
  const contentSha256 = createHash('sha256').update(input.bytes).digest('hex');
  const existing = await CourseDocument.findOne({
    where: { courseId: input.courseId, academicTermId: input.academicTermId, contentSha256 },
  });
  if (existing && existing.status !== 'FAILED') {
    return { document: toDocumentDto(existing), created: false };
  }

  const filename = sanitizeFilename(input.originalFilename);
  const storagePath = path.posix.join('storage', 'course-documents', `${contentSha256}.pdf`);
  const document =
    existing ??
    (await CourseDocument.create({
      courseId: input.courseId,
      academicTermId: input.academicTermId,
      uploadedByFacultyId: Number(faculty.id),
      title: input.title,
      originalFilename: filename,
      mimeType: 'application/pdf',
      byteSize: input.bytes.length,
      pageCount: null,
      contentSha256,
      storagePath,
      status: 'PROCESSING',
      errorMessage: null,
      embeddingModel: env.rag.embeddingModel,
      embeddingDimensions: env.rag.embeddingDimensions,
      chunkCount: 0,
    }));

  if (existing) {
    await document.update({
      title: input.title,
      originalFilename: filename,
      byteSize: input.bytes.length,
      status: 'PROCESSING',
      errorMessage: null,
      embeddingModel: env.rag.embeddingModel,
      embeddingDimensions: env.rag.embeddingDimensions,
      chunkCount: 0,
    });
  }

  try {
    await mkdir(STORAGE_DIR, { recursive: true });
    await writeFile(path.join(STORAGE_DIR, `${contentSha256}.pdf`), input.bytes);
    const pages = await readPdfPages(input.bytes);
    if (pages.length === 0 || pages.length > env.rag.maxPdfPages) {
      throw unprocessable(
        pages.length === 0 ? 'This PDF has no pages.' : `Use a PDF with at most ${env.rag.maxPdfPages} pages.`,
        'file',
      );
    }
    const chunks = chunkPages(pages, env.rag.chunkChars, env.rag.chunkOverlap);
    if (chunks.length === 0) {
      throw unprocessable('No text could be read from this PDF.', 'file');
    }
    const embeddings = await embedDocuments(chunks.map((chunk) => chunk.content));
    await sequelize.transaction(async (transaction) => {
      await CourseDocumentChunk.destroy({ where: { documentId: document.id }, transaction });
      await CourseDocumentChunk.bulkCreate(
        chunks.map((chunk, index) => ({
          documentId: Number(document.id),
          chunkIndex: index,
          pageNumber: chunk.pageNumber,
          content: chunk.content,
          embedding: embeddings[index] ?? [],
        })),
        { transaction },
      );
      await document.update(
        { status: 'READY', errorMessage: null, pageCount: pages.length, chunkCount: chunks.length },
        { transaction },
      );
    });
  } catch (error) {
    await CourseDocumentChunk.destroy({ where: { documentId: document.id } });
    const message = failureMessage(error);
    await document.update({ status: 'FAILED', errorMessage: message, chunkCount: 0, pageCount: document.pageCount });
    console.error(`document ${document.id} processing failed`);
  }

  await document.reload();
  return { document: toDocumentDto(document), created: !existing };
}

export async function listCourseDocuments(userId: number, courseId: number, academicTermId: number): Promise<DocumentDto[]> {
  await requireEligibleFaculty(userId, courseId, academicTermId);
  const rows = await CourseDocument.findAll({
    where: { courseId, academicTermId },
    order: [['createdAt', 'DESC']],
  });
  return rows.map(toDocumentDto);
}

export async function getCourseDocument(userId: number, documentId: number): Promise<DocumentDto> {
  const document = await CourseDocument.findByPk(documentId);
  if (!document) {
    throw notFound('Document not found.');
  }
  await requireEligibleFaculty(userId, Number(document.courseId), Number(document.academicTermId));
  return toDocumentDto(document);
}

async function embedDocuments(texts: string[]): Promise<number[][]> {
  const client = getGeminiClient();
  const vectors: number[][] = [];
  for (let index = 0; index < texts.length; index += BATCH_SIZE) {
    const batch = texts.slice(index, index + BATCH_SIZE);
    const embedded = await client.embed(batch, 'RETRIEVAL_DOCUMENT');
    if (embedded.length !== batch.length) {
      throw new Error('Embedding response did not match the chunk count.');
    }
    for (const vector of embedded) {
      if (vector.length !== env.rag.embeddingDimensions) {
        throw new Error('Embedding dimensions did not match the configuration.');
      }
      vectors.push(l2Normalize(vector));
    }
  }
  return vectors;
}

function assertPdf(bytes: Buffer): void {
  if (bytes.length === 0 || bytes.subarray(0, 5).toString('utf8') !== '%PDF-') {
    throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', [
      { field: 'file', message: 'Choose a PDF file.' },
    ]);
  }
}

function sanitizeFilename(name: string): string {
  const base = path.basename(name).replace(/[^\w.\- ()]+/g, '').trim();
  const limited = (base || 'document.pdf').slice(0, 255);
  return limited.toLowerCase().endsWith('.pdf') ? limited : `${limited}.pdf`;
}

function failureMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message.slice(0, 500);
  }
  const message = error instanceof Error ? error.message : '';
  if (message.includes('429') || message.toLowerCase().includes('resource exhausted')) {
    return 'Embedding service is busy. Try again.';
  }
  return 'Could not process this PDF.';
}

function toDocumentDto(document: CourseDocument): DocumentDto {
  return {
    id: Number(document.id),
    courseId: Number(document.courseId),
    academicTermId: Number(document.academicTermId),
    title: document.title,
    originalFilename: document.originalFilename,
    status: document.status,
    errorMessage: document.errorMessage,
    pageCount: document.pageCount === null ? null : Number(document.pageCount),
    chunkCount: Number(document.chunkCount),
    createdAt: document.createdAt.toISOString(),
  };
}
