import { useParams } from 'react-router-dom';
import { Alert } from '../../../components/common/Alert';
import { AcademicYearForm } from '../components/AcademicYearForm';
import { TermSection } from '../components/TermSection';
import { useAcademicYearForm } from '../hooks/useAcademicYearForm';

export function AcademicYearFormPage() {
  const params = useParams();
  const isEdit = params.id !== undefined;
  const yearId = Number(params.id);
  const validId = Number.isInteger(yearId) && yearId > 0;
  const { year, loading, submitting, error, fieldErrors, save } = useAcademicYearForm(isEdit && validId ? yearId : undefined);

  return (
    <section className="page">
      <header className="page-header">
        <h1>{isEdit ? 'Edit academic year' : 'New academic year'}</h1>
      </header>
      {isEdit && !validId ? <Alert message="This academic year link is not valid." /> : null}
      {isEdit && validId && loading ? <p className="status">Loading academic year...</p> : null}
      {isEdit && validId && !loading && !year ? <Alert message={error ?? 'Academic year not found.'} /> : null}
      {!isEdit || year ? (
        <AcademicYearForm year={year} submitting={submitting} error={error} fieldErrors={fieldErrors} onSubmit={save} />
      ) : null}
      {year ? <TermSection academicYearId={year.id} /> : null}
    </section>
  );
}
