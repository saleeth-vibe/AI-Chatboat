import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { createBranch, getBranch, listBranches, listClasses, updateBranch, updateClass } from '../../api/admin';
import { fieldsOf, messageOf } from '../../api/errors';
import { Alert } from '../../components/common/Alert';
import { flashMessage } from '../../components/common/flash';
import { NumberInput, parseBoundedInt } from '../../components/forms/NumberInput';
import type { Branch, PageMeta, SchoolClass } from '../../types/admin';
import { Pager } from '../departments/DepartmentPages';

export function BranchListPage() {
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedStatus, setAppliedStatus] = useState(status);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Branch[]>([]);
  const [meta, setMeta] = useState<PageMeta>({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    listBranches({
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
          setError(messageOf(caught, 'Unable to load branches.'));
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

  return (
    <section className="page">
      <header className="page-header">
        <h1>Branches</h1>
        <Link className="button button-inline" to="/branches/new">
          New branch
        </Link>
      </header>
      {flashMessage(location.state) ? <Alert message={flashMessage(location.state) ?? ''} tone="success" /> : null}
      {error ? <Alert message={error} /> : null}
      <form
        className="toolbar"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setAppliedSearch(search.trim());
          setAppliedStatus(status);
        }}
      >
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
      {loading ? <p className="status">Loading branches...</p> : null}
      {!loading && !error && rows.length === 0 ? (
        <div className="card">
          <p>No branches match this view.</p>
          <p className="muted">A new branch creates a class for every year and section.</p>
        </div>
      ) : null}
      {!loading && rows.length > 0 ? (
        <div className="card table-card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Years</th>
                  <th>Sections</th>
                  <th>Cycles</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.code}</td>
                    <td>{row.name}</td>
                    <td>{row.durationYears}</td>
                    <td>{row.sectionsPerYear}</td>
                    <td>{row.supportsFirstYearCycles ? 'P / C' : 'Branch'}</td>
                    <td>{row.isActive ? 'Active' : 'Inactive'}</td>
                    <td>
                      <Link className="text-link" to={`/branches/${row.id}`}>
                        Open
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

export function BranchFormPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [durationYears, setDurationYears] = useState('4');
  const [sectionsPerYear, setSectionsPerYear] = useState('1');
  const [classCapacity, setClassCapacity] = useState('60');
  const [supportsFirstYearCycles, setSupportsFirstYearCycles] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFields({});
    const duration = parseBoundedInt(durationYears, 1, 6);
    const sections = parseBoundedInt(sectionsPerYear, 1, 26);
    const capacity = parseBoundedInt(classCapacity, 1, 500);
    if (duration === null || sections === null || capacity === null) {
      setSubmitting(false);
      return;
    }
    try {
      const branch = await createBranch({
        name: name.trim(),
        code: code.trim(),
        durationYears: duration,
        sectionsPerYear: sections,
        classCapacity: capacity,
        supportsFirstYearCycles,
        isActive,
      });
      navigate(`/branches/${branch.id}`, { state: { message: 'Branch created with its classes.' } });
    } catch (caught) {
      setError(messageOf(caught, 'Unable to create this branch.'));
      setFields(fieldsOf(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <h1>New branch</h1>
      </header>
      <form className="card form-card" onSubmit={onSubmit}>
        <p className="muted form-note">Duration, sections, the code, and the first-year cycle setting stay fixed after the classes are created.</p>
        {error ? <Alert message={error} /> : null}
        <label className="field">
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={150} />
          {fields.name ? <span className="field-error">{fields.name}</span> : null}
        </label>
        <label className="field">
          Code
          <input value={code} onChange={(event) => setCode(event.target.value)} required maxLength={20} />
          {fields.code ? <span className="field-error">{fields.code}</span> : null}
        </label>
        <label className="field">
          Duration in years
          <NumberInput min={1} max={6} value={durationYears} onChange={setDurationYears} required />
        </label>
        <label className="field">
          Sections per year
          <NumberInput min={1} max={26} value={sectionsPerYear} onChange={setSectionsPerYear} required />
        </label>
        <label className="field">
          Class capacity
          <NumberInput min={1} max={500} value={classCapacity} onChange={setClassCapacity} required />
        </label>
        <label className="checkbox-field">
          <input type="checkbox" checked={supportsFirstYearCycles} onChange={(event) => setSupportsFirstYearCycles(event.target.checked)} />
          First year uses P and C cycles
        </label>
        <label className="checkbox-field">
          <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
          Active
        </label>
        <div className="form-actions">
          <button className="button" type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create branch'}
          </button>
          <Link className="button button-secondary" to="/branches">
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}

export function BranchDetailPage() {
  const params = useParams();
  const location = useLocation();
  const branchId = Number(params.id);
  const valid = Number.isInteger(branchId) && branchId > 0;
  const [branch, setBranch] = useState<Branch | null>(null);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(flashMessage(location.state));
  const [name, setName] = useState('');
  const [classCapacity, setClassCapacity] = useState('60');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!valid) {
      setLoading(false);
      return;
    }
    let active = true;
    Promise.all([getBranch(branchId), listClasses(branchId)])
      .then(([loadedBranch, loadedClasses]) => {
        if (!active) {
          return;
        }
        setBranch(loadedBranch);
        setName(loadedBranch.name);
        setClassCapacity(String(loadedBranch.classCapacity));
        setIsActive(loadedBranch.isActive);
        setClasses(loadedClasses);
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(messageOf(caught, 'Unable to load this branch.'));
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
  }, [branchId, valid]);

  async function saveBranch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const capacity = parseBoundedInt(classCapacity, 1, 500);
    if (capacity === null) {
      setSaving(false);
      return;
    }
    try {
      const updated = await updateBranch(branchId, { name: name.trim(), classCapacity: capacity, isActive });
      setBranch(updated);
      setNotice('Branch updated. Existing class capacities are unchanged.');
    } catch (caught) {
      setError(messageOf(caught, 'Unable to update this branch.'));
    } finally {
      setSaving(false);
    }
  }

  async function saveClass(schoolClass: SchoolClass, capacity: number, active: boolean) {
    setError(null);
    try {
      const updated = await updateClass(schoolClass.id, { capacity, isActive: active });
      setClasses((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setNotice(`${updated.label} updated.`);
    } catch (caught) {
      setError(messageOf(caught, 'Unable to update that class.'));
    }
  }

  return (
    <section className="page page-wide">
      <header className="page-header">
        <h1>{branch ? branch.code : 'Branch'}</h1>
        <Link className="button button-inline button-secondary" to="/branches">
          All branches
        </Link>
      </header>
      {!valid ? <Alert message="This branch link is not valid." /> : null}
      {loading ? <p className="status">Loading branch...</p> : null}
      {notice ? <Alert message={notice} tone="success" /> : null}
      {error ? <Alert message={error} /> : null}
      {branch ? (
        <form className="card form-card" onSubmit={saveBranch}>
          <p className="muted form-note">
            {branch.durationYears} years, {branch.sectionsPerYear} section{branch.sectionsPerYear === 1 ? '' : 's'},{' '}
            {branch.supportsFirstYearCycles ? 'first year uses P and C cycles' : 'every semester uses a branch curriculum'}.
          </p>
          <label className="field">
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={150} />
          </label>
          <label className="field">
            Default capacity for future reference
            <NumberInput min={1} max={500} value={classCapacity} onChange={setClassCapacity} required />
          </label>
          <label className="checkbox-field">
            <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
            Active
          </label>
          <div className="form-actions">
            <button className="button" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save branch'}
            </button>
          </div>
        </form>
      ) : null}
      {classes.length > 0 ? (
        <div className="card table-card">
          <h2>Classes</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Active students</th>
                  <th>Capacity</th>
                  <th>Active</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {classes.map((schoolClass) => (
                  <ClassRow key={schoolClass.id} schoolClass={schoolClass} onSave={saveClass} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ClassRow({
  schoolClass,
  onSave,
}: {
  schoolClass: SchoolClass;
  onSave: (schoolClass: SchoolClass, capacity: number, active: boolean) => Promise<void>;
}) {
  const [capacity, setCapacity] = useState(String(schoolClass.capacity));
  const [active, setActive] = useState(schoolClass.isActive);
  const [saving, setSaving] = useState(false);
  const capacityRef = useRef<HTMLInputElement>(null);

  async function save() {
    if (!capacityRef.current?.reportValidity()) {
      return;
    }
    const parsed = parseBoundedInt(capacity, 1, 500);
    if (parsed === null) {
      return;
    }
    setSaving(true);
    await onSave(schoolClass, parsed, active);
    setSaving(false);
  }

  return (
    <tr>
      <td>{schoolClass.label}</td>
      <td>{schoolClass.activeStudents}</td>
      <td>
        <NumberInput ref={capacityRef} className="inline-input" min={1} max={500} value={capacity} onChange={setCapacity} required aria-label={`${schoolClass.label} capacity`} />
      </td>
      <td>
        <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} aria-label={`${schoolClass.label} active`} />
      </td>
      <td>
        <button className="button button-inline button-secondary" type="button" onClick={() => void save()} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </td>
    </tr>
  );
}
