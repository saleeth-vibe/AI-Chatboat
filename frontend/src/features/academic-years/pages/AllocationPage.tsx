import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { createAllocation, getAllocation, resetAllocation } from '../../../api/admin';
import { messageOf } from '../../../api/errors';
import { Alert } from '../../../components/common/Alert';
import type { Allocation } from '../../../types/admin';

export function AllocationPage() {
  const params = useParams();
  const yearId = Number(params.id);
  const valid = Number.isInteger(yearId) && yearId > 0;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [allocation, setAllocation] = useState<Allocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!valid) {
      setLoading(false);
      return;
    }
    let active = true;
    getAllocation(yearId)
      .then((loaded) => {
        if (active) {
          setAllocation(loaded);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(messageOf(caught, 'Unable to load first-year allocation.'));
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
  }, [valid, yearId]);

  async function generate() {
    setWorking(true);
    setError(null);
    try {
      setAllocation(await createAllocation(yearId));
      setNotice('First-year cycles saved.');
    } catch (caught) {
      setError(messageOf(caught, 'Unable to save first-year cycles.'));
    } finally {
      setWorking(false);
    }
  }

  async function reset() {
    dialogRef.current?.close();
    setWorking(true);
    setError(null);
    try {
      setAllocation(await resetAllocation(yearId));
      setNotice('First-year cycles cleared.');
    } catch (caught) {
      setError(messageOf(caught, 'Unable to reset first-year cycles.'));
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <h1>First-year cycles</h1>
        <Link className="button button-inline button-secondary" to={`/academic-years/${yearId}`}>
          Academic year
        </Link>
      </header>
      {!valid ? <Alert message="This academic year link is not valid." /> : null}
      {loading ? <p className="status">Loading allocation...</p> : null}
      {notice ? <Alert message={notice} tone="success" /> : null}
      {error ? <Alert message={error} /> : null}
      {allocation ? (
        <div className="card table-card">
          <p className="muted">
            Active first-year classes on cycle branches are sorted by branch and section, then assigned P, C, P, C. Semester 2 uses the opposite cycle.
          </p>
          <div className="form-actions">
            {!allocation.exists ? (
              <button className="button" type="button" onClick={() => void generate()} disabled={working}>
                {working ? 'Saving...' : 'Generate cycles'}
              </button>
            ) : null}
            {allocation.canReset ? (
              <button className="button button-secondary" type="button" onClick={() => dialogRef.current?.showModal()} disabled={working}>
                Reset
              </button>
            ) : null}
          </div>
          {allocation.exists && allocation.allocations.length === 0 ? <p>No classes were allocated.</p> : null}
          {allocation.allocations.length > 0 ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Class</th>
                    <th>Semester 1</th>
                    <th>Semester 2</th>
                  </tr>
                </thead>
                <tbody>
                  {allocation.allocations.map((row) => (
                    <tr key={row.classId}>
                      <td>{row.label}</td>
                      <td>{row.semester1CycleType}</td>
                      <td>{row.semester2CycleType}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
      <dialog className="confirm-dialog" ref={dialogRef}>
        <h2>Reset first-year cycles?</h2>
        <p>This is allowed only before class curricula are generated for this year.</p>
        <div className="form-actions">
          <button className="button" type="button" onClick={() => void reset()}>
            Reset
          </button>
          <button className="button button-secondary" type="button" onClick={() => dialogRef.current?.close()}>
            Cancel
          </button>
        </div>
      </dialog>
    </section>
  );
}
