import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { createDepartment, getDepartment, listDepartments, updateDepartment } from '../../api/admin';
import { fieldsOf, messageOf } from '../../api/errors';
import { Alert } from '../../components/common/Alert';
import { flashMessage } from '../../components/common/flash';
import type { Department, PageMeta } from '../../types/admin';

export function DepartmentListPage() {
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedStatus, setAppliedStatus] = useState(status);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Department[]>([]);
  const [meta, setMeta] = useState<PageMeta>({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    listDepartments({
      page,
      pageSize: 20,
      search: appliedSearch || undefined,
      isActive: appliedStatus === 'all' ? undefined : appliedStatus === 'active',
    })
      .then((result) => {
        if (active) {
          setRows(result.data);
          setMeta(result.meta);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setRows([]);
          setError(messageOf(caught, 'Unable to load departments.'));
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
  }, [appliedSearch, appliedStatus, page]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setAppliedSearch(search.trim());
    setAppliedStatus(status);
  }

  return (
    <section className="page">
      <header className="page-header">
        <h1>Departments</h1>
        <Link className="button button-inline" to="/departments/new">
          New department
        </Link>
      </header>
      {flashMessage(location.state) ? <Alert message={flashMessage(location.state) ?? ''} tone="success" /> : null}
      {error ? <Alert message={error} /> : null}
      <form className="toolbar" onSubmit={applyFilters}>
        <label>
          Search
          <input value={search} onChange={(event) => setSearch(event.target.value)} maxLength={150} />
        </label>
        <label>
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <button className="button button-inline button-secondary" type="submit">
          Search
        </button>
      </form>
      {loading ? <p className="status">Loading departments...</p> : null}
      {!loading && !error && rows.length === 0 ? (
        <div className="card">
          <p>No departments match this view.</p>
          <p className="muted">Create a department with a name and a short code.</p>
        </div>
      ) : null}
      {!loading && rows.length > 0 ? (
        <div className="card table-card">
          <p className="muted table-count">{meta.total} departments</p>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.code}</td>
                    <td>{row.name}</td>
                    <td>{row.isActive ? 'Active' : 'Inactive'}</td>
                    <td>
                      <Link className="text-link" to={`/departments/${row.id}`}>
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} totalPages={meta.totalPages} onPage={setPage} />
        </div>
      ) : null}
    </section>
  );
}

export function DepartmentFormPage() {
  const params = useParams();
  const navigate = useNavigate();
  const departmentId = Number(params.id);
  const editing = params.id !== undefined;
  const validId = Number.isInteger(departmentId) && departmentId > 0;
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(editing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!editing || !validId) {
      setLoading(false);
      return;
    }
    let active = true;
    getDepartment(departmentId)
      .then((department) => {
        if (!active) {
          return;
        }
        setName(department.name);
        setCode(department.code);
        setIsActive(department.isActive);
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(messageOf(caught, 'Unable to load this department.'));
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
  }, [departmentId, editing, validId]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFields({});
    const input = { name: name.trim(), code: code.trim(), isActive };
    try {
      if (editing) {
        await updateDepartment(departmentId, input);
      } else {
        await createDepartment(input);
      }
      navigate('/departments', { state: { message: editing ? 'Department updated.' : 'Department created.' } });
    } catch (caught) {
      setError(messageOf(caught, 'Unable to save this department.'));
      setFields(fieldsOf(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <h1>{editing ? 'Edit department' : 'New department'}</h1>
      </header>
      {editing && !validId ? <Alert message="This department link is not valid." /> : null}
      {loading ? <p className="status">Loading department...</p> : null}
      {editing && !loading && error && !name ? <Alert message={error} /> : null}
      {!editing || name || !error ? (
        <form className="card form-card" onSubmit={onSubmit}>
          {error && name ? <Alert message={error} /> : null}
          {!editing && error ? <Alert message={error} /> : null}
          <label className="field">
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={150} required />
            {fields.name ? <span className="field-error">{fields.name}</span> : null}
          </label>
          <label className="field">
            Code
            <input value={code} onChange={(event) => setCode(event.target.value)} maxLength={20} required />
            {fields.code ? <span className="field-error">{fields.code}</span> : null}
          </label>
          <label className="checkbox-field">
            <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
            Active
          </label>
          <div className="form-actions">
            <button className="button" type="submit" disabled={submitting || loading}>
              {submitting ? 'Saving...' : 'Save department'}
            </button>
            <Link className="button button-secondary" to="/departments">
              Cancel
            </Link>
          </div>
        </form>
      ) : null}
    </section>
  );
}

export function Pager({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (page: number) => void }) {
  if (totalPages <= 1) {
    return null;
  }
  return (
    <div className="pager">
      <button className="button button-inline button-secondary" type="button" onClick={() => onPage(page - 1)} disabled={page <= 1}>
        Previous
      </button>
      <span>
        Page {page} of {totalPages}
      </span>
      <button className="button button-inline button-secondary" type="button" onClick={() => onPage(page + 1)} disabled={page >= totalPages}>
        Next
      </button>
    </div>
  );
}
