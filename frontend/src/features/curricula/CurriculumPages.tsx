import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  createCurriculum,
  getCurriculum,
  listBranches,
  listCourses,
  listCurricula,
  replaceCurriculumCourses,
  updateCurriculum,
} from '../../api/admin';
import { fieldsOf, messageOf } from '../../api/errors';
import { Alert } from '../../components/common/Alert';
import { flashMessage } from '../../components/common/flash';
import { NumberInput, parseBoundedInt } from '../../components/forms/NumberInput';
import type { Branch, Course, Curriculum, CurriculumCourse, PageMeta } from '../../types/admin';
import { Pager } from '../departments/DepartmentPages';

export function CurriculumListPage() {
  const location = useLocation();
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Curriculum[]>([]);
  const [meta, setMeta] = useState<PageMeta>({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listCurricula({ page, pageSize: 20 })
      .then((result) => {
        if (active) {
          setRows(result.data);
          setMeta(result.meta);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(messageOf(caught, 'Unable to load curricula.'));
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
  }, [page]);

  return (
    <section className="page">
      <header className="page-header">
        <h1>Curricula</h1>
        <Link className="button button-inline" to="/curricula/new">
          New curriculum
        </Link>
      </header>
      {flashMessage(location.state) ? <Alert message={flashMessage(location.state) ?? ''} tone="success" /> : null}
      {error ? <Alert message={error} /> : null}
      {loading ? <p className="status">Loading curricula...</p> : null}
      {!loading && !error && rows.length === 0 ? (
        <div className="card">
          <p>No curricula yet.</p>
          <p className="muted">Create a P or C cycle, or a curriculum for one branch semester.</p>
        </div>
      ) : null}
      {!loading && rows.length > 0 ? (
        <div className="card table-card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Scope</th>
                  <th>Courses</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>{scopeLabel(row)}</td>
                    <td>{row.courseCount}</td>
                    <td>{row.isActive ? 'Active' : 'Inactive'}</td>
                    <td>
                      <Link className="text-link" to={`/curricula/${row.id}`}>
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

export function CurriculumFormPage() {
  const navigate = useNavigate();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [name, setName] = useState('');
  const [scopeType, setScopeType] = useState<'GLOBAL_CYCLE' | 'BRANCH'>('GLOBAL_CYCLE');
  const [cycleType, setCycleType] = useState<'P' | 'C'>('P');
  const [branchId, setBranchId] = useState('');
  const [semesterLevel, setSemesterLevel] = useState('1');
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listBranches({ page: 1, pageSize: 100, isActive: true })
      .then((result) => {
        setBranches(result.data);
        setBranchId(result.data[0] ? String(result.data[0].id) : '');
      })
      .catch((caught: unknown) => setError(messageOf(caught, 'Unable to load branches.')));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFields({});
    const semester = scopeType === 'BRANCH' ? parseBoundedInt(semesterLevel, 1, 12) : null;
    if (scopeType === 'BRANCH' && semester === null) {
      setSubmitting(false);
      return;
    }
    try {
      const created = await createCurriculum({
        name: name.trim(),
        scopeType,
        branchId: scopeType === 'BRANCH' ? Number(branchId) : null,
        semesterLevel: semester,
        cycleType: scopeType === 'GLOBAL_CYCLE' ? cycleType : null,
        isActive: true,
      });
      navigate(`/curricula/${created.id}`, { state: { message: 'Curriculum created. Add its courses next.' } });
    } catch (caught) {
      setError(messageOf(caught, 'Unable to create this curriculum.'));
      setFields(fieldsOf(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <h1>New curriculum</h1>
      </header>
      <form className="card form-card" onSubmit={onSubmit}>
        {error ? <Alert message={error} /> : null}
        <label className="field">
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={150} />
          {fields.name ? <span className="field-error">{fields.name}</span> : null}
        </label>
        <label className="field">
          Scope
          <select value={scopeType} onChange={(event) => setScopeType(event.target.value as typeof scopeType)}>
            <option value="GLOBAL_CYCLE">Global P or C cycle</option>
            <option value="BRANCH">One branch semester</option>
          </select>
        </label>
        {scopeType === 'GLOBAL_CYCLE' ? (
          <label className="field">
            Cycle
            <select value={cycleType} onChange={(event) => setCycleType(event.target.value as 'P' | 'C')}>
              <option value="P">P</option>
              <option value="C">C</option>
            </select>
          </label>
        ) : (
          <>
            <label className="field">
              Branch
              <select value={branchId} onChange={(event) => setBranchId(event.target.value)} required>
                <option value="">Choose a branch</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.code} — {branch.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Semester
              <NumberInput min={1} max={12} value={semesterLevel} onChange={setSemesterLevel} required />
            </label>
          </>
        )}
        <div className="form-actions">
          <button className="button" type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create curriculum'}
          </button>
          <Link className="button button-secondary" to="/curricula">
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}

export function CurriculumDetailPage() {
  const params = useParams();
  const location = useLocation();
  const curriculumId = Number(params.id);
  const valid = Number.isInteger(curriculumId) && curriculumId > 0;
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [pending, setPending] = useState<number[]>([]);
  const [pendingRemoval, setPendingRemoval] = useState<CurriculumCourse | null>(null);
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<null | 'details' | 'courses' | 'remove'>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(flashMessage(location.state));
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!valid) {
      setLoading(false);
      return;
    }
    let active = true;
    Promise.all([getCurriculum(curriculumId), listCourses({ page: 1, pageSize: 100, isActive: true })])
      .then(([loaded, coursePage]) => {
        if (!active) {
          return;
        }
        setCurriculum(loaded);
        setName(loaded.name);
        setIsActive(loaded.isActive);
        setCourses(coursePage.data);
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(messageOf(caught, 'Unable to load this curriculum.'));
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
  }, [curriculumId, valid]);

  async function saveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy('details');
    setError(null);
    try {
      const updated = await updateCurriculum(curriculumId, { name: name.trim(), isActive });
      setCurriculum(updated);
      setNotice('Curriculum updated.');
    } catch (caught) {
      setError(messageOf(caught, 'Unable to update this curriculum.'));
    } finally {
      setBusy(null);
    }
  }

  async function addCourses(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!curriculum || pending.length === 0) {
      return;
    }
    setBusy('courses');
    setError(null);
    const adding = pending.length;
    try {
      const updated = await replaceCurriculumCourses(curriculumId, [
        ...curriculum.courses.map((course) => course.id),
        ...pending,
      ]);
      setCurriculum(updated);
      setPending([]);
      setNotice(adding === 1 ? 'Course added.' : 'Courses added.');
    } catch (caught) {
      setError(messageOf(caught, 'Unable to add these courses.'));
    } finally {
      setBusy(null);
    }
  }

  async function confirmRemove() {
    const course = pendingRemoval;
    if (!course || !curriculum) {
      return;
    }
    dialogRef.current?.close();
    setBusy('remove');
    setError(null);
    try {
      const updated = await replaceCurriculumCourses(
        curriculumId,
        curriculum.courses.filter((item) => item.id !== course.id).map((item) => item.id),
      );
      setCurriculum(updated);
      setPending((current) => current.filter((id) => id !== course.id));
      setNotice('Course removed.');
    } catch (caught) {
      setError(messageOf(caught, 'Unable to remove this course.'));
    } finally {
      setPendingRemoval(null);
      setBusy(null);
    }
  }

  const assigned = curriculum?.courses ?? [];
  const assignedIds = new Set(assigned.map((course) => course.id));
  const query = search.trim().toLowerCase();
  const available = courses.filter((course) => {
    if (assignedIds.has(course.id)) {
      return false;
    }
    return `${course.code} ${course.name}`.toLowerCase().includes(query);
  });
  const courseById = new Map(courses.map((course) => [course.id, course]));
  const pendingCourses = pending.flatMap((id) => {
    const course = courseById.get(id);
    return course ? [course] : [];
  });
  const working = busy !== null;
  const catalogExhausted = courses.length === 0 || courses.every((course) => assignedIds.has(course.id));

  return (
    <section className="page">
      <header className="page-header">
        <h1>{curriculum?.name ?? 'Curriculum'}</h1>
        <Link className="button button-inline button-secondary" to="/curricula">
          All curricula
        </Link>
      </header>
      {!valid ? <Alert message="This curriculum link is not valid." /> : null}
      {loading ? <p className="status">Loading curriculum...</p> : null}
      {notice ? <Alert message={notice} tone="success" /> : null}
      {error ? <Alert message={error} /> : null}
      {curriculum ? (
        <>
          <form className="card form-card" onSubmit={saveDetails}>
            <p className="muted form-note">{scopeLabel(curriculum)}. Scope cannot be changed after creation.</p>
            <label className="field">
              Name
              <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={150} />
            </label>
            <label className="checkbox-field">
              <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
              Active
            </label>
            <div className="form-actions">
              <button className="button" type="submit" disabled={working}>
                {busy === 'details' ? 'Saving...' : 'Save details'}
              </button>
            </div>
          </form>
          <div className="card form-card">
            <h2>Courses</h2>
            <p className="muted form-note">Course changes are locked after this curriculum is assigned to a class.</p>
            <section className="course-panel" aria-labelledby="curriculum-courses-heading">
              <div className="course-panel-head">
                <h3 id="curriculum-courses-heading">In this curriculum</h3>
                <span className="badge badge-active">{assigned.length}</span>
              </div>
              {assigned.length === 0 ? <p className="muted">No courses in this curriculum yet.</p> : null}
              {assigned.length > 0 ? (
                <ul className="course-list">
                  {assigned.map((course) => (
                    <li key={course.id}>
                      <span>
                        {course.code} — {course.name}
                      </span>
                      <button
                        className="button button-inline button-secondary"
                        type="button"
                        disabled={working}
                        onClick={() => {
                          setPendingRemoval(course);
                          dialogRef.current?.showModal();
                        }}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
            <form className="course-panel add-panel" onSubmit={addCourses}>
              <div className="course-panel-head">
                <h3>Add courses</h3>
              </div>
              <p className="muted">Courses already in this curriculum stay out of this list.</p>
              <div className="selected-courses">
                <p>Selected</p>
                {pendingCourses.length === 0 ? <p className="muted">Nothing selected yet.</p> : null}
                {pendingCourses.length > 0 ? (
                  <ul className="pill-list">
                    {pendingCourses.map((course) => (
                      <li key={course.id} className="pill">
                        <span>
                          {course.code} — {course.name}
                        </span>
                        <button
                          type="button"
                          aria-label={`Deselect ${course.code}`}
                          onClick={() => setPending((current) => current.filter((id) => id !== course.id))}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <label className="field">
                Search
                <input
                  value={search}
                  placeholder="Code or name"
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                    }
                  }}
                />
              </label>
              {available.length === 0 ? <p className="muted">{addEmptyMessage(courses.length, catalogExhausted)}</p> : (
                <div className="check-list">
                  {available.map((course) => (
                    <label key={course.id}>
                      <input
                        type="checkbox"
                        checked={pending.includes(course.id)}
                        onChange={(event) => {
                          setPending((current) =>
                            event.target.checked ? [...current, course.id] : current.filter((id) => id !== course.id),
                          );
                        }}
                      />
                      {course.code} — {course.name}
                    </label>
                  ))}
                </div>
              )}
              <div className="form-actions">
                <button className="button" type="submit" disabled={working || pending.length === 0}>
                  {busy === 'courses' ? 'Adding...' : 'Add courses'}
                </button>
              </div>
            </form>
          </div>
        </>
      ) : null}
      <dialog className="confirm-dialog" ref={dialogRef} onClose={() => setPendingRemoval(null)}>
        <h2>Remove course?</h2>
        <p>
          {pendingRemoval ? `${pendingRemoval.code} — ${pendingRemoval.name}` : 'This course'} will be removed from this curriculum.
        </p>
        <div className="form-actions">
          <button className="button" type="button" onClick={() => void confirmRemove()}>
            Remove
          </button>
          <button className="button button-secondary" type="button" onClick={() => dialogRef.current?.close()}>
            Cancel
          </button>
        </div>
      </dialog>
    </section>
  );
}

function addEmptyMessage(courseCount: number, catalogExhausted: boolean) {
  if (!catalogExhausted) {
    return 'No courses match this search.';
  }
  if (courseCount === 0) {
    return 'No active courses to add.';
  }
  return 'Every active course is already in this curriculum.';
}

function scopeLabel(curriculum: Curriculum) {
  if (curriculum.scopeType === 'GLOBAL_CYCLE') {
    return `Global cycle ${curriculum.cycleType ?? ''}`;
  }
  return `${curriculum.branchCode ?? 'Branch'} semester ${curriculum.semesterLevel ?? ''}`;
}
