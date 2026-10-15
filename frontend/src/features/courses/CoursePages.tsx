import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { getCourse, listCourses, listDepartments, saveCourse } from '../../api/admin';
import { fieldsOf, messageOf } from '../../api/errors';
import { Alert } from '../../components/common/Alert';
import { flashMessage } from '../../components/common/flash';
import type { Course, Department, PageMeta } from '../../types/admin';
import { Pager } from '../departments/DepartmentPages';

export function CourseListPage() {
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Course[]>([]);
  const [meta, setMeta] = useState<PageMeta>({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    listCourses({ page, pageSize: 20, search: appliedSearch || undefined })
      .then((result) => {
        if (active) {
          setRows(result.data);
          setMeta(result.meta);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(messageOf(caught, 'Unable to load courses.'));
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

  return (
    <section className="page">
      <header className="page-header">
        <h1>Courses</h1>
        <Link className="button button-inline" to="/courses/new">
          New course
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
      {loading ? <p className="status">Loading courses...</p> : null}
      {!loading && !error && rows.length === 0 ? (
        <div className="card">
          <p>No courses match this view.</p>
          <p className="muted">A course is created once and reused by curricula.</p>
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
                  <th>Department</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.code}</td>
                    <td>{row.name}</td>
                    <td>{row.departmentName ?? '—'}</td>
                    <td>{row.isActive ? 'Active' : 'Inactive'}</td>
                    <td>
                      <Link className="text-link" to={`/courses/${row.id}`}>
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

export function CourseFormPage() {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const courseId = Number(params.id);
  const editing = params.id !== undefined;
  const valid = !editing || (Number.isInteger(courseId) && courseId > 0);
  const [course, setCourse] = useState<Course | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(editing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    listDepartments({ page: 1, pageSize: 100, isActive: true })
      .then((result) => {
        if (active) {
          setDepartments(result.data);
        }
      })
      .catch(() => {
        if (active) {
          setError('Unable to load departments.');
        }
      });
    if (!editing || !valid) {
      setLoading(false);
      return () => {
        active = false;
      };
    }
    getCourse(courseId)
      .then((loaded) => {
        if (!active) {
          return;
        }
        setCourse(loaded);
        setCode(loaded.code);
        setName(loaded.name);
        setDepartmentId(loaded.departmentId ? String(loaded.departmentId) : '');
        setDescription(loaded.description ?? '');
        setIsActive(loaded.isActive);
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(messageOf(caught, 'Unable to load this course.'));
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
  }, [courseId, editing, valid]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFields({});
    try {
      const saved = await saveCourse(editing ? courseId : undefined, {
        code: code.trim(),
        name: name.trim(),
        departmentId: departmentId ? Number(departmentId) : null,
        description: description.trim() || null,
        isActive,
      });
      navigate(`/courses/${saved.id}`, { state: { message: editing ? 'Course updated.' : 'Course created.' } });
      if (editing) {
        setCourse(saved);
      }
    } catch (caught) {
      setError(messageOf(caught, 'Unable to save this course.'));
      setFields(fieldsOf(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <h1>{editing ? code || 'Course' : 'New course'}</h1>
      </header>
      {!valid ? <Alert message="This course link is not valid." /> : null}
      {loading ? <p className="status">Loading course...</p> : null}
      {flashMessage(location.state) && course ? <Alert message={flashMessage(location.state) ?? ''} tone="success" /> : null}
      {error ? <Alert message={error} /> : null}
      {valid && !loading && (!editing || course) ? (
        <form className="card form-card" onSubmit={onSubmit}>
          <label className="field">
            Code
            <input value={code} onChange={(event) => setCode(event.target.value)} required maxLength={30} />
            {fields.code ? <span className="field-error">{fields.code}</span> : null}
          </label>
          <label className="field">
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={150} />
            {fields.name ? <span className="field-error">{fields.name}</span> : null}
          </label>
          <label className="field">
            Department
            <select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
              <option value="">None</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.code} — {department.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Description
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} rows={4} />
          </label>
          <label className="checkbox-field">
            <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
            Active
          </label>
          <div className="form-actions">
            <button className="button" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save course'}
            </button>
            <Link className="button button-secondary" to="/courses">
              All courses
            </Link>
          </div>
        </form>
      ) : null}
    </section>
  );
}
