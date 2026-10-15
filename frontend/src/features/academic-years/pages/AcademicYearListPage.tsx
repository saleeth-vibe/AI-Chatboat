import { Link, useLocation } from 'react-router-dom';
import { Alert } from '../../../components/common/Alert';
import { useAcademicYears } from '../hooks/useAcademicYears';

export function AcademicYearListPage() {
  const location = useLocation();
  const message = readMessage(location.state);
  const { search, setSearch, status, setStatus, page, setPage, years, meta, loading, error, applyFilters } = useAcademicYears();

  return (
    <section className="page">
      <header className="page-header">
        <h1>Academic years</h1>
        <Link className="button button-inline" to="/academic-years/new">
          New academic year
        </Link>
      </header>
      {message ? <Alert message={message} tone="success" /> : null}
      {error ? <Alert message={error} /> : null}
      <form className="toolbar" onSubmit={applyFilters}>
        <label>
          Search
          <input value={search} onChange={(event) => setSearch(event.target.value)} maxLength={20} />
        </label>
        <label>
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value as 'all' | 'active' | 'inactive')}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <button className="button button-inline button-secondary" type="submit">
          Search
        </button>
      </form>
      {loading ? <p className="status">Loading academic years...</p> : null}
      {!loading && !error && years.length === 0 ? (
        <div className="card">
          <p>No academic years match this view.</p>
          <p className="muted">Create a year with a name, a start date, and an end date.</p>
        </div>
      ) : null}
      {!loading && years.length > 0 ? (
        <div className="card table-card">
          <p className="muted table-count">
            {meta.total} {meta.total === 1 ? 'academic year' : 'academic years'}
          </p>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {years.map((year) => (
                  <tr key={year.id}>
                    <td>{year.name}</td>
                    <td>{year.startDate}</td>
                    <td>{year.endDate}</td>
                    <td>
                      <span className={year.isActive ? 'badge badge-active' : 'badge badge-inactive'}>
                        {year.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <Link className="text-link" to={`/academic-years/${year.id}`}>
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {meta.totalPages > 1 ? (
            <div className="pager">
              <button className="button button-inline button-secondary" type="button" onClick={() => setPage(page - 1)} disabled={page <= 1}>
                Previous
              </button>
              <span>
                Page {meta.page} of {meta.totalPages}
              </span>
              <button
                className="button button-inline button-secondary"
                type="button"
                onClick={() => setPage(page + 1)}
                disabled={page >= meta.totalPages}
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function readMessage(state: unknown): string | null {
  if (typeof state !== 'object' || state === null || !('message' in state)) {
    return null;
  }
  const message = state.message;
  return typeof message === 'string' ? message : null;
}
