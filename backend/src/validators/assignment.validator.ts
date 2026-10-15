import type { FieldError } from '../utils/errors';
import { expectObject, queryId, readId, rejectUnknown, throwDetails } from '../utils/request';
import type { OfferingStatus } from '../services/academic-rules';

export function validateTermQuery(query: unknown): number {
  const record = expectObject(query, 'query');
  const academicTermId = queryId(record, 'academicTermId', true);
  return academicTermId!;
}

export function validateOfferingPatch(body: unknown): { assignedFacultyId?: number | null; status?: OfferingStatus } {
  const record = expectObject(body);
  rejectUnknown(record, ['assignedFacultyId', 'status']);
  const details: FieldError[] = [];
  const patch: { assignedFacultyId?: number | null; status?: OfferingStatus } = {};
  if ('assignedFacultyId' in record) {
    const assignedFacultyId = readId(record.assignedFacultyId, 'assignedFacultyId', details, false);
    if (assignedFacultyId !== undefined) {
      patch.assignedFacultyId = assignedFacultyId;
    }
  }
  if ('status' in record) {
    if (record.status !== 'PLANNED' && record.status !== 'ONGOING' && record.status !== 'COMPLETED') {
      details.push({ field: 'status', message: 'Status must be planned, ongoing, or completed.' });
    } else {
      patch.status = record.status;
    }
  }
  throwDetails(details);
  if (Object.keys(patch).length === 0) {
    throwDetails([{ field: 'body', message: 'Provide a faculty member or a status.' }]);
  }
  return patch;
}
