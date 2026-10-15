import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { configurationStatus, listTermChoices } from '../../api/admin';
import { messageOf } from '../../api/errors';
import { Alert } from '../../components/common/Alert';
import { reasonLabel } from '../assignments/AssignmentListPage';
import type { ConfigurationStatus, TermChoice } from '../../types/admin';

export function ConfigurationPage() {
  const [terms, setTerms] = useState<TermChoice[]>([]);
  const [termId, setTermId] = useState('');
  const [status, setStatus] = useState<ConfigurationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const selected = terms.find((term) => String(term.id) === termId);

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
      setStatus(null);
      return;
    }
    let active = true;
    configurationStatus(Number(termId))
      .then((loaded) => {
        if (active) {
          setStatus(loaded);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(messageOf(caught, 'Unable to load configuration status.'));
        }
      });
    return () => {
      active = false;
    };
  }, [termId]);

  return (
    <section className="page page-wide">
      <header className="page-header">
        <h1>Configuration</h1>
      </header>
      {error ? <Alert message={error} /> : null}
      {loading ? <p className="status">Loading terms...</p> : null}
      {terms.length === 0 && !loading ? <div className="card"><p>Add academic terms before checking configuration.</p></div> : null}
      {terms.length > 0 ? (
        <>
          <form className="toolbar">
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
          </form>
          {status ? (
            <div className="stack">
              <article className="card">
                <h2>First-year cycles</h2>
                {status.missingFirstYearAllocation ? (
                  <>
                    <p>First-year P and C cycles are missing for this year.</p>
                    {selected ? (
                      <Link className="text-link" to={`/academic-years/${selected.academicYearId}/first-year-allocation`}>
                        Open allocation
                      </Link>
                    ) : null}
                  </>
                ) : (
                  <p>First-year cycles are saved, or this term has no cycle branches.</p>
                )}
              </article>
              <article className="card">
                <h2>Classes without a curriculum</h2>
                {status.classesMissingCurriculum.length === 0 ? <p>Every active class has a curriculum for this term.</p> : null}
                {status.classesMissingCurriculum.length > 0 ? (
                  <>
                    <ul className="preview-list">
                      {status.classesMissingCurriculum.map((item) => (
                        <li key={item.classId}>
                          {item.classLabel}: {reasonLabel(item.reason)}
                        </li>
                      ))}
                    </ul>
                    <Link className="text-link" to="/assignments">
                      Generate assignments
                    </Link>
                  </>
                ) : null}
              </article>
              <article className="card">
                <h2>Offerings without faculty</h2>
                {status.offeringsMissingFaculty.length === 0 ? <p>Every generated offering has a faculty member.</p> : null}
                {status.offeringsMissingFaculty.length > 0 ? (
                  <ul className="preview-list">
                    {status.offeringsMissingFaculty.map((item) => (
                      <li key={item.offeringId}>
                        <Link className="text-link" to={`/class-curriculum-assignments/${item.assignmentId}`}>
                          {item.classLabel} · {item.courseCode}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
