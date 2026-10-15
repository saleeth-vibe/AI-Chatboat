import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { generateAssignments, listAssignments, listTermChoices } from '../../api/admin';
import { messageOf } from '../../api/errors';
import { Alert } from '../../components/common/Alert';
import type { AssignmentSummary, GenerateResult, TermChoice } from '../../types/admin';

const REASONS: Record<string, string> = {
  MISSING_FIRST_YEAR_ALLOCATION: 'First-year cycle is not saved',
  MISSING_CURRICULUM: 'No curriculum for this semester',
  CURRICULUM_HAS_NO_COURSES: 'Curriculum has no courses',
  NOT_GENERATED: 'Not generated yet',
};

export function reasonLabel(reason: string) {
  return REASONS[reason] ?? reason;
}

export function AssignmentListPage() {
  const [terms, setTerms] = useState<TermChoice[]>([]);
  const [termId, setTermId] = useState('');
  const [rows, setRows] = useState<AssignmentSummary[]>([]);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTermChoices()
      .then((loaded) => {
        setTerms(loaded);
        setTermId(loaded[0] ? String(loaded[0].id) : '');
      })
      .catch((caught: unknown) => setError(messageOf(caught, 'Unable to load academic terms.')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!termId) {
      setRows([]);
      return;
    }
    let active = true;
    setWorking(true);
    listAssignments(Number(termId))
      .then((loaded) => {
        if (active) {
          setRows(loaded);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(messageOf(caught, 'Unable to load assignments.'));
        }
      })
      .finally(() => {
        if (active) {
          setWorking(false);
        }
      });
    return () => {
      active = false;
    };
  }, [termId]);

  async function generate() {
    setWorking(true);
    setError(null);
    try {
      const generated = await generateAssignments(Number(termId));
      setResult(generated);
      setRows(await listAssignments(Number(termId)));
    } catch (caught) {
      setError(messageOf(caught, 'Unable to generate assignments.'));
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="page page-wide">
      <header className="page-header">
        <h1>Class curricula</h1>
      </header>
      {error ? <Alert message={error} /> : null}
      {loading ? <p className="status">Loading terms...</p> : null}
      {!loading && terms.length === 0 ? (
        <div className="card">
          <p>Create an academic year and its Odd and Even terms before generating class curricula.</p>
        </div>
      ) : null}
      {terms.length > 0 ? (
        <div className="card table-card">
          <div className="toolbar">
            <label>
              Term
              <select value={termId} onChange={(event) => setTermId(event.target.value)}>
                {terms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.label}
                  </option>
                ))}
              </select>
            </label>
            <button className="button button-inline" type="button" onClick={() => void generate()} disabled={working || !termId}>
              {working ? 'Working...' : 'Generate'}
            </button>
          </div>
          {result ? (
            <Alert
              tone="success"
              message={`Created ${result.createdAssignments} assignments and ${result.createdOfferings} offerings. ${result.alreadyAssigned} classes were already assigned.`}
            />
          ) : null}
          {result && result.conflicts.length > 0 ? (
            <div>
              <p>These classes were skipped:</p>
              <ul className="preview-list">
                {result.conflicts.map((conflict) => (
                  <li key={conflict.classId}>
                    {conflict.classLabel}: {reasonLabel(conflict.reason)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {rows.length === 0 && !working ? <p>No class curricula for this term yet.</p> : null}
          {rows.length > 0 ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Class</th>
                    <th>Semester</th>
                    <th>Curriculum</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.classLabel}</td>
                      <td>{row.semesterLevel}</td>
                      <td>{row.curriculumName}</td>
                      <td>{row.status}</td>
                      <td>
                        <Link className="text-link" to={`/class-curriculum-assignments/${row.id}`}>
                          Offerings
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
