import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { createTerm, listTerms, updateTerm } from '../../../api/admin';
import { fieldsOf, messageOf } from '../../../api/errors';
import { Alert } from '../../../components/common/Alert';
import type { AcademicTerm } from '../../../types/admin';

export function TermSection({ academicYearId }: { academicYearId: number }) {
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listTerms(academicYearId)
      .then((loaded) => {
        if (active) {
          setTerms(loaded);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(messageOf(caught, 'Unable to load terms.'));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [academicYearId]);

  async function save(periodType: 'ODD' | 'EVEN', startDate: string, endDate: string) {
    setError(null);
    setNotice(null);
    const existing = terms.find((term) => term.periodType === periodType);
    try {
      const saved = existing
        ? await updateTerm(existing.id, { startDate, endDate })
        : await createTerm(academicYearId, { periodType, startDate, endDate });
      setTerms((current) => {
        const without = current.filter((term) => term.id !== saved.id && term.periodType !== saved.periodType);
        return [...without, saved].sort((left, right) => left.startDate.localeCompare(right.startDate));
      });
      setNotice(`${periodType === 'ODD' ? 'Odd' : 'Even'} term saved.`);
      return {};
    } catch (caught) {
      setError(messageOf(caught, 'Unable to save this term.'));
      return fieldsOf(caught);
    }
  }

  return (
    <section className="stack">
      <div className="page-header">
        <h2>Terms</h2>
        <Link className="text-link" to={`/academic-years/${academicYearId}/first-year-allocation`}>
          First-year cycles
        </Link>
      </div>
      <p className="muted">Odd and Even must sit inside this year and must not overlap. A gap between them is a break.</p>
      {loading ? <p className="status">Loading terms...</p> : null}
      {notice ? <Alert message={notice} tone="success" /> : null}
      {error ? <Alert message={error} /> : null}
      <div className="split">
        <TermForm label="Odd" term={terms.find((term) => term.periodType === 'ODD')} onSave={(start, end) => save('ODD', start, end)} />
        <TermForm label="Even" term={terms.find((term) => term.periodType === 'EVEN')} onSave={(start, end) => save('EVEN', start, end)} />
      </div>
    </section>
  );
}

function TermForm({
  label,
  term,
  onSave,
}: {
  label: string;
  term?: AcademicTerm;
  onSave: (startDate: string, endDate: string) => Promise<Record<string, string>>;
}) {
  const [startDate, setStartDate] = useState(term?.startDate ?? '');
  const [endDate, setEndDate] = useState(term?.endDate ?? '');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStartDate(term?.startDate ?? '');
    setEndDate(term?.endDate ?? '');
  }, [term?.startDate, term?.endDate]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFields(await onSave(startDate, endDate));
    setSaving(false);
  }

  return (
    <form className="card form-card" onSubmit={onSubmit}>
      <h2>{label}</h2>
      <label className="field">
        Start
        <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
        {fields.startDate ? <span className="field-error">{fields.startDate}</span> : null}
      </label>
      <label className="field">
        End
        <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} required />
        {fields.endDate ? <span className="field-error">{fields.endDate}</span> : null}
      </label>
      <div className="form-actions">
        <button className="button" type="submit" disabled={saving}>
          {saving ? 'Saving...' : term ? 'Update term' : 'Create term'}
        </button>
      </div>
    </form>
  );
}
