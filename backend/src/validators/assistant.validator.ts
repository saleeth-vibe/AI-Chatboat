import type { FieldError } from '../utils/errors';
import { expectObject, queryId, readRequiredString, rejectUnknown, throwDetails } from '../utils/request';

export function validateTermQuery(query: unknown): { academicTermId: number } {
  const record = expectObject(query, 'query');
  rejectUnknown(record, ['academicTermId']);
  const academicTermId = queryId(record, 'academicTermId', true);
  return { academicTermId: academicTermId! };
}

export function validateDocumentUpload(
  body: unknown,
  file: Express.Multer.File | undefined,
): { title: string; academicTermId: number; file: Express.Multer.File } {
  const record = expectObject(body);
  rejectUnknown(record, ['title', 'academicTermId']);
  const details: FieldError[] = [];
  const title = readRequiredString(record.title, 'title', 200, details);
  const academicTermId = readTermId(record.academicTermId, details);
  if (!file || file.size === 0) {
    details.push({ field: 'file', message: 'Choose a PDF file.' });
  }
  throwDetails(details);
  return { title: title!, academicTermId: academicTermId!, file: file! };
}

export function validateCreateChat(body: unknown): { courseId: number; academicTermId: number } {
  const record = expectObject(body);
  rejectUnknown(record, ['courseId', 'academicTermId']);
  const details: FieldError[] = [];
  const courseId = readBodyId(record.courseId, 'courseId', details);
  const academicTermId = readBodyId(record.academicTermId, 'academicTermId', details);
  throwDetails(details);
  return { courseId: courseId!, academicTermId: academicTermId! };
}

export function validateChatMessage(body: unknown): { question: string } {
  const record = expectObject(body);
  rejectUnknown(record, ['question']);
  const details: FieldError[] = [];
  const question = readRequiredString(record.question, 'question', 2000, details);
  throwDetails(details);
  return { question: question! };
}

function readTermId(value: unknown, details: FieldError[]): number | undefined {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    details.push({ field: 'academicTermId', message: 'Choose a term.' });
    return undefined;
  }
  return Number(value);
}

function readBodyId(value: unknown, field: string, details: FieldError[]): number | undefined {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    details.push({ field, message: 'Choose a valid record.' });
    return undefined;
  }
  return value;
}
