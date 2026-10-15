import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { listAcademicYears } from '../../api/academic-years';
import {
  classHistory,
  createStudent,
  getStudent,
  listBranches,
  listStudents,
  promoteStudents,
  updateStudent,
} from '../../api/admin';
import { fieldsOf, messageOf } from '../../api/errors';
import { Alert } from '../../components/common/Alert';
import { flashMessage } from '../../components/common/flash';
import { NumberInput, parseBoundedInt } from '../../components/forms/NumberInput';
import type { AcademicYear } from '../../types/academic-year';
import type { Branch, ClassHistoryRow, PageMeta, Student } from '../../types/admin';
import { Pager } from '../departments/DepartmentPages';

export function StudentListPage() {
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Student[]>([]);
  const [meta, setMeta] = useState<PageMeta>({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [branches, setBranches] = useState<Branch[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [academicYearId, setAcademicYearId] = useState('');
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(flashMessage(location.state));
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([
      listStudents({ page, pageSize: 20, search: appliedSearch || undefined }),
      listBranches({ page: 1, pageSize: 100 }),
      listAcademicYears({ page: 1, pageSize: 100, isActive: true }),
    ])
      .then(([studentPage, branchPage, yearPage]) => {
        if (!active) {
          return;
        }
        setRows(studentPage.data);
        setMeta(studentPage.meta);
        setBranches(branchPage.data);
        setYears(yearPage.data);
        setAcademicYearId((current) => current || (yearPage.data[0] ? String(yearPage.data[0].id) : ''));
        setSelected([]);
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(messageOf(caught, 'Unable to load students.'));
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
  }, [appliedSearch, page]);

  const preview = useMemo(() => buildPreview(rows.filter((row) => selected.includes(row.id)), branches), [rows, selected, branches]);

  async function confirmPromotion() {
    dialogRef.current?.close();
    setPromoting(true);
    setError(null);
    try {
      const result = await promoteStudents({ academicYearId: Number(academicYearId), studentIds: selected });
      const graduated = result.results.filter((item) => item.outcome === 'GRADUATED').length;
      const promoted = result.results.filter((item) => item.outcome === 'PROMOTED').length;
      setNotice(`${promoted} promoted, ${graduated} graduated.`);
      const refreshed = await listStudents({ page, pageSize: 20, search: appliedSearch || undefined });
      setRows(refreshed.data);
      setMeta(refreshed.meta);
      setSelected([]);
    } catch (caught) {
      setError(messageOf(caught, 'Unable to promote these students.'));
    } finally {
      setPromoting(false);
    }
  }

  return (
    <section className="page page-wide">
      <header className="page-header">
        <h1>Students</h1>
        <Link className="button button-inline" to="/students/new">
          New student
        </Link>
      </header>
      {notice ? <Alert message={notice} tone="success" /> : null}
      {error ? <Alert message={error} /> : null}
      <form
        className="toolbar"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setAppliedSearch(search.trim());
        }}
      >
        <label>
          Search
          <input value={search} onChange={(event) => setSearch(event.target.value)} maxLength={150} />
        </label>
        <button className="button button-inline button-secondary" type="submit">
          Search
        </button>
      </form>
      {loading ? <p className="status">Loading students...</p> : null}
      {!loading && !error && rows.length === 0 ? (
        <div className="card">
          <p>No students match this view.</p>
        </div>
      ) : null}
      {!loading && rows.length > 0 ? (
        <div className="card table-card">
          <div className="toolbar">
            <label>
              Promote into academic year
              <select value={academicYearId} onChange={(event) => setAcademicYearId(event.target.value)}>
                {years.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="button button-inline"
              type="button"
              disabled={selected.length === 0 || !academicYearId || promoting}
              onClick={() => dialogRef.current?.showModal()}
            >
              Review promotion
            </button>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th></th>
                  <th>University ID</th>
                  <th>Name</th>
                  <th>Class</th>
                  <th>Password</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.includes(row.id)}
                        aria-label={`Select ${row.name}`}
                        onChange={(event) => {
                          setSelected((current) => (event.target.checked ? [...current, row.id] : current.filter((id) => id !== row.id)));
                        }}
                      />
                    </td>
                    <td>{row.universityId}</td>
                    <td>{row.name}</td>
                    <td>{row.currentClass?.label ?? '—'}</td>
                    <td>{row.initialPassword ? <span className="initial-password">{row.initialPassword}</span> : '—'}</td>
                    <td>{row.isActive ? 'Active' : 'Inactive'}</td>
                    <td>
                      <Link className="text-link" to={`/students/${row.id}`}>
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
      <dialog className="confirm-dialog" ref={dialogRef}>
        <h2>Confirm promotion</h2>
        <p>Every selected student moves together. If one class is full, nobody is promoted.</p>
        <ul className="preview-list">
          {preview.map((item) => (
            <li key={item.id}>
              {item.name}: {item.fromClass} → {item.toClass}
            </li>
          ))}
        </ul>
        <div className="form-actions">
          <button className="button" type="button" onClick={() => void confirmPromotion()} disabled={promoting}>
            {promoting ? 'Promoting...' : 'Promote'}
          </button>
          <button className="button button-secondary" type="button" onClick={() => dialogRef.current?.close()}>
            Cancel
          </button>
        </div>
      </dialog>
    </section>
  );
}

export function StudentFormPage() {
  const navigate = useNavigate();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [branchId, setBranchId] = useState('');
  const [entryYearLevel, setEntryYearLevel] = useState('1');
  const [academicYearId, setAcademicYearId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([listBranches({ page: 1, pageSize: 100, isActive: true }), listAcademicYears({ page: 1, pageSize: 100, isActive: true })])
      .then(([branchPage, yearPage]) => {
        setBranches(branchPage.data);
        setYears(yearPage.data);
        setBranchId(branchPage.data[0] ? String(branchPage.data[0].id) : '');
        setAcademicYearId(yearPage.data[0] ? String(yearPage.data[0].id) : '');
      })
      .catch((caught: unknown) => setError(messageOf(caught, 'Unable to load admission choices.')));
  }, []);

  const branch = branches.find((item) => item.id === Number(branchId));

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFields({});
    const maxYear = branch?.durationYears ?? 6;
    const yearLevel = parseBoundedInt(entryYearLevel, 1, maxYear);
    if (yearLevel === null) {
      setSubmitting(false);
      return;
    }
    try {
      const created = await createStudent({
        name: name.trim(),
        email: email.trim(),
        branchId: Number(branchId),
        entryYearLevel: yearLevel,
        academicYearId: Number(academicYearId),
      });
      navigate(`/students/${created.id}`, { state: { message: `Admitted as ${created.universityId}.` } });
    } catch (caught) {
      setError(messageOf(caught, 'Unable to admit this student.'));
      setFields(fieldsOf(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <h1>New student</h1>
      </header>
      <form className="card form-card" onSubmit={onSubmit}>
        <p className="muted form-note">
          The university ID and section are assigned automatically. A sign-in password is generated and shown on the student list until the student changes it.
        </p>
        {error ? <Alert message={error} /> : null}
        <label className="field">
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={150} />
        </label>
        <label className="field">
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          {fields.email ? <span className="field-error">{fields.email}</span> : null}
        </label>
        <label className="field">
          Branch
          <select value={branchId} onChange={(event) => setBranchId(event.target.value)} required>
            <option value="">Choose a branch</option>
            {branches.map((item) => (
              <option key={item.id} value={item.id}>
                {item.code} — {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Entry year
          <NumberInput min={1} max={branch?.durationYears ?? 6} value={entryYearLevel} onChange={setEntryYearLevel} required />
        </label>
        <label className="field">
          Academic year
          <select value={academicYearId} onChange={(event) => setAcademicYearId(event.target.value)} required>
            <option value="">Choose a year</option>
            {years.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
          </select>
        </label>
        <div className="form-actions">
          <button className="button" type="submit" disabled={submitting}>
            {submitting ? 'Admitting...' : 'Admit student'}
          </button>
          <Link className="button button-secondary" to="/students">
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}

export function StudentDetailPage() {
  const params = useParams();
  const location = useLocation();
  const studentId = Number(params.id);
  const valid = Number.isInteger(studentId) && studentId > 0;
  const [student, setStudent] = useState<Student | null>(null);
  const [history, setHistory] = useState<ClassHistoryRow[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(flashMessage(location.state));

  useEffect(() => {
    if (!valid) {
      setLoading(false);
      return;
    }
    let active = true;
    Promise.all([getStudent(studentId), classHistory(studentId)])
      .then(([loaded, rows]) => {
        if (!active) {
          return;
        }
        setStudent(loaded);
        setName(loaded.name);
        setEmail(loaded.email);
        setIsActive(loaded.isActive);
        setHistory(rows);
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(messageOf(caught, 'Unable to load this student.'));
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
  }, [studentId, valid]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await updateStudent(studentId, {
        name: name.trim(),
        email: email.trim(),
        isActive,
      });
      setStudent(updated);
      setNotice('Student updated.');
    } catch (caught) {
      setError(messageOf(caught, 'Unable to update this student.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <h1>{student?.name ?? 'Student'}</h1>
        <Link className="button button-inline button-secondary" to="/students">
          All students
        </Link>
      </header>
      {!valid ? <Alert message="This student link is not valid." /> : null}
      {loading ? <p className="status">Loading student...</p> : null}
      {notice ? <Alert message={notice} tone="success" /> : null}
      {error ? <Alert message={error} /> : null}
      {student ? (
        <>
          <form className="card form-card" onSubmit={onSubmit}>
            <nav className="record-crumbs" aria-label="Student">
              <span className="record-crumb">
                <span className="record-crumb-label">University ID</span>
                <strong>{student.universityId}</strong>
              </span>
              <span className="crumb-sep" aria-hidden="true">
                /
              </span>
              <span className="record-crumb">
                <span className="record-crumb-label">Branch</span>
                <strong>{student.branchCode}</strong>
              </span>
              <span className="crumb-sep" aria-hidden="true">
                /
              </span>
              <span className="record-crumb">
                <span className="record-crumb-label">Entry year</span>
                <strong>Year {student.entryYearLevel}</strong>
              </span>
              <span className="crumb-sep" aria-hidden="true">
                /
              </span>
              <span className="record-crumb">
                <span className="record-crumb-label">Class</span>
                <strong>{student.currentClass?.label ?? 'No class'}</strong>
              </span>
              {student.initialPassword ? (
                <>
                  <span className="crumb-sep" aria-hidden="true">
                    /
                  </span>
                  <span className="record-crumb">
                    <span className="record-crumb-label">Password</span>
                    <strong className="initial-password">{student.initialPassword}</strong>
                  </span>
                </>
              ) : null}
            </nav>
            <label className="field">
              Name
              <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={150} />
            </label>
            <label className="field">
              Email
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
            <label className="checkbox-field">
              <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
              Active
            </label>
            <div className="form-actions">
              <button className="button" type="submit" disabled={saving}>
                Save student
              </button>
            </div>
          </form>
          <div className="card table-card">
            <h2>Class history</h2>
            {history.length === 0 ? <p>No class history yet.</p> : null}
            {history.length > 0 ? (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Class</th>
                      <th>Start year</th>
                      <th>End year</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((row) => (
                      <tr key={row.id}>
                        <td>{row.classLabel}</td>
                        <td>{row.startYear}</td>
                        <td>{row.endYear ?? '—'}</td>
                        <td>{row.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
}

function buildPreview(students: Student[], branches: Branch[]) {
  return students.map((student) => {
    const branch = branches.find((item) => item.id === student.branchId);
    const current = student.currentClass;
    if (!current) {
      return { id: student.id, name: student.name, fromClass: 'No active class', toClass: 'Cannot promote' };
    }
    if (branch && current.yearLevel >= branch.durationYears) {
      return { id: student.id, name: student.name, fromClass: current.label, toClass: 'Graduates' };
    }
    return {
      id: student.id,
      name: student.name,
      fromClass: current.label,
      toClass: `${student.branchCode} ${current.yearLevel + 1}${current.sectionCode}`,
    };
  });
}
