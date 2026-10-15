import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  addEligibility,
  createFaculty,
  getFaculty,
  listBranches,
  listCourses,
  listDepartments,
  listEligibility,
  listFaculty,
  listTermChoices,
  removeEligibility,
  updateFaculty,
} from '../../api/admin';
import { fieldsOf, messageOf } from '../../api/errors';
import { Alert } from '../../components/common/Alert';
import { flashMessage } from '../../components/common/flash';
import type { Branch, Course, Department, Eligibility, FacultyMember, PageMeta, TermChoice } from '../../types/admin';
import { Pager } from '../departments/DepartmentPages';

export function FacultyListPage() {
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<FacultyMember[]>([]);
  const [meta, setMeta] = useState<PageMeta>({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    listFaculty({ page, pageSize: 20, search: appliedSearch || undefined })
      .then((result) => {
        if (active) {
          setRows(result.data);
          setMeta(result.meta);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(messageOf(caught, 'Unable to load faculty.'));
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
        <h1>Faculty</h1>
        <Link className="button button-inline" to="/faculty/new">
          New faculty member
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
      {loading ? <p className="status">Loading faculty...</p> : null}
      {!loading && !error && rows.length === 0 ? (
        <div className="card">
          <p>No faculty members match this view.</p>
        </div>
      ) : null}
      {!loading && rows.length > 0 ? (
        <div className="card table-card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee number</th>
                  <th>Name</th>
                  <th>Affiliation</th>
                  <th>Password</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.employeeNumber}</td>
                    <td>{row.name}</td>
                    <td>{row.affiliationType === 'BRANCH' ? row.branchCode : row.departmentCode}</td>
                    <td>{row.initialPassword ? <span className="initial-password">{row.initialPassword}</span> : '—'}</td>
                    <td>{row.isActive ? 'Active' : 'Inactive'}</td>
                    <td>
                      <Link className="text-link" to={`/faculty/${row.id}`}>
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

export function FacultyFormPage() {
  const navigate = useNavigate();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [affiliationType, setAffiliationType] = useState<'BRANCH' | 'DEPARTMENT'>('BRANCH');
  const [branchId, setBranchId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([listBranches({ page: 1, pageSize: 100, isActive: true }), listDepartments({ page: 1, pageSize: 100, isActive: true })])
      .then(([branchPage, departmentPage]) => {
        setBranches(branchPage.data);
        setDepartments(departmentPage.data);
        setBranchId(branchPage.data[0] ? String(branchPage.data[0].id) : '');
        setDepartmentId(departmentPage.data[0] ? String(departmentPage.data[0].id) : '');
      })
      .catch((caught: unknown) => setError(messageOf(caught, 'Unable to load affiliations.')));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFields({});
    try {
      const created = await createFaculty({
        name: name.trim(),
        email: email.trim(),
        employeeNumber: employeeNumber.trim(),
        affiliationType,
        branchId: affiliationType === 'BRANCH' ? Number(branchId) : null,
        departmentId: affiliationType === 'DEPARTMENT' ? Number(departmentId) : null,
        isActive: true,
      });
      navigate(`/faculty/${created.id}`, { state: { message: 'Faculty account created.' } });
    } catch (caught) {
      setError(messageOf(caught, 'Unable to create this faculty member.'));
      setFields(fieldsOf(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <h1>New faculty member</h1>
      </header>
      <form className="card form-card" onSubmit={onSubmit}>
        <p className="muted form-note">A sign-in password is generated and shown on the faculty list until the faculty member changes it.</p>
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
          Employee number
          <input value={employeeNumber} onChange={(event) => setEmployeeNumber(event.target.value)} required maxLength={50} />
          {fields.employeeNumber ? <span className="field-error">{fields.employeeNumber}</span> : null}
        </label>
        <AffiliationFields
          affiliationType={affiliationType}
          branchId={branchId}
          departmentId={departmentId}
          branches={branches}
          departments={departments}
          onType={setAffiliationType}
          onBranch={setBranchId}
          onDepartment={setDepartmentId}
        />
        <div className="form-actions">
          <button className="button" type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create faculty member'}
          </button>
          <Link className="button button-secondary" to="/faculty">
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}

export function FacultyDetailPage() {
  const params = useParams();
  const location = useLocation();
  const facultyId = Number(params.id);
  const valid = Number.isInteger(facultyId) && facultyId > 0;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [faculty, setFaculty] = useState<FacultyMember | null>(null);
  const [eligibility, setEligibility] = useState<Eligibility[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [terms, setTerms] = useState<TermChoice[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [affiliationType, setAffiliationType] = useState<'BRANCH' | 'DEPARTMENT'>('BRANCH');
  const [branchId, setBranchId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [termId, setTermId] = useState('');
  const [pendingRemoval, setPendingRemoval] = useState<Eligibility | null>(null);
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
    Promise.all([
      getFaculty(facultyId),
      listEligibility(facultyId),
      listBranches({ page: 1, pageSize: 100 }),
      listDepartments({ page: 1, pageSize: 100 }),
      listCourses({ page: 1, pageSize: 100, isActive: true }),
      listTermChoices(),
    ])
      .then(([loaded, rows, branchPage, departmentPage, coursePage, termRows]) => {
        if (!active) {
          return;
        }
        applyFaculty(loaded);
        setEligibility(rows);
        setBranches(branchPage.data);
        setDepartments(departmentPage.data);
        setCourses(coursePage.data);
        setTerms(termRows);
        setCourseId(coursePage.data[0] ? String(coursePage.data[0].id) : '');
        setTermId(termRows[0] ? String(termRows[0].id) : '');
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(messageOf(caught, 'Unable to load this faculty member.'));
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

    function applyFaculty(loaded: FacultyMember) {
      setFaculty(loaded);
      setName(loaded.name);
      setEmail(loaded.email);
      setIsActive(loaded.isActive);
      setAffiliationType(loaded.affiliationType);
      setBranchId(loaded.branchId ? String(loaded.branchId) : '');
      setDepartmentId(loaded.departmentId ? String(loaded.departmentId) : '');
    }
  }, [facultyId, valid]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await updateFaculty(facultyId, {
        name: name.trim(),
        email: email.trim(),
        isActive,
        affiliationType,
        branchId: affiliationType === 'BRANCH' ? Number(branchId) : null,
        departmentId: affiliationType === 'DEPARTMENT' ? Number(departmentId) : null,
      });
      setFaculty(updated);
      setNotice('Faculty profile updated.');
    } catch (caught) {
      setError(messageOf(caught, 'Unable to update this faculty member.'));
    } finally {
      setSaving(false);
    }
  }

  async function addCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await addEligibility(facultyId, { courseId: Number(courseId), academicTermId: Number(termId) });
      setEligibility(await listEligibility(facultyId));
      setNotice('Course eligibility added.');
    } catch (caught) {
      setError(messageOf(caught, 'Unable to add this course.'));
    } finally {
      setSaving(false);
    }
  }

  async function confirmRemove() {
    if (!pendingRemoval) {
      return;
    }
    dialogRef.current?.close();
    setSaving(true);
    setError(null);
    try {
      await removeEligibility(facultyId, pendingRemoval.id);
      setEligibility(await listEligibility(facultyId));
      setNotice('Course eligibility removed.');
    } catch (caught) {
      setError(messageOf(caught, 'Unable to remove this eligibility.'));
    } finally {
      setPendingRemoval(null);
      setSaving(false);
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <h1>{faculty?.name ?? 'Faculty'}</h1>
        <Link className="button button-inline button-secondary" to="/faculty">
          All faculty
        </Link>
      </header>
      {!valid ? <Alert message="This faculty link is not valid." /> : null}
      {loading ? <p className="status">Loading faculty member...</p> : null}
      {notice ? <Alert message={notice} tone="success" /> : null}
      {error ? <Alert message={error} /> : null}
      {faculty ? (
        <>
          <form className="card form-card" onSubmit={saveProfile}>
            <nav className="record-crumbs" aria-label="Faculty member">
              <span className="record-crumb">
                <span className="record-crumb-label">Employee number</span>
                <strong>{faculty.employeeNumber}</strong>
              </span>
              <span className="crumb-sep" aria-hidden="true">
                /
              </span>
              <span className="record-crumb">
                <span className="record-crumb-label">{faculty.affiliationType === 'BRANCH' ? 'Branch' : 'Department'}</span>
                <strong>{faculty.affiliationType === 'BRANCH' ? faculty.branchCode : faculty.departmentCode}</strong>
              </span>
              {faculty.initialPassword ? (
                <>
                  <span className="crumb-sep" aria-hidden="true">
                    /
                  </span>
                  <span className="record-crumb">
                    <span className="record-crumb-label">Password</span>
                    <strong className="initial-password">{faculty.initialPassword}</strong>
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
            <AffiliationFields
              affiliationType={affiliationType}
              branchId={branchId}
              departmentId={departmentId}
              branches={branches}
              departments={departments}
              onType={setAffiliationType}
              onBranch={setBranchId}
              onDepartment={setDepartmentId}
            />
            <label className="checkbox-field">
              <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
              Active
            </label>
            <div className="form-actions">
              <button className="button" type="submit" disabled={saving}>
                Save profile
              </button>
            </div>
          </form>
          <form className="card form-card" onSubmit={addCourse}>
            <h2>Course eligibility</h2>
            <p className="muted">This allows the faculty member to teach a course in a term. It does not assign a class.</p>
            <label className="field">
              Term
              <select value={termId} onChange={(event) => setTermId(event.target.value)} required>
                <option value="">Choose a term</option>
                {terms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Course
              <select value={courseId} onChange={(event) => setCourseId(event.target.value)} required>
                <option value="">Choose a course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} — {course.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-actions">
              <button className="button" type="submit" disabled={saving || !courseId || !termId}>
                Add eligibility
              </button>
            </div>
            {eligibility.length === 0 ? <p>No courses are eligible yet.</p> : null}
            {eligibility.length > 0 ? (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Term</th>
                      <th>Course</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {eligibility.map((row) => (
                      <tr key={row.id}>
                        <td>{row.termLabel}</td>
                        <td>
                          {row.courseCode} — {row.courseName}
                        </td>
                        <td>
                          <button
                            className="button button-inline button-secondary"
                            type="button"
                            onClick={() => {
                              setPendingRemoval(row);
                              dialogRef.current?.showModal();
                            }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </form>
        </>
      ) : null}
      <dialog className="confirm-dialog" ref={dialogRef}>
        <h2>Remove eligibility?</h2>
        <p>
          {pendingRemoval ? `${pendingRemoval.courseCode} in ${pendingRemoval.termLabel}` : 'This row'} will no longer be available for class assignment.
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

function AffiliationFields({
  affiliationType,
  branchId,
  departmentId,
  branches,
  departments,
  onType,
  onBranch,
  onDepartment,
}: {
  affiliationType: 'BRANCH' | 'DEPARTMENT';
  branchId: string;
  departmentId: string;
  branches: Branch[];
  departments: Department[];
  onType: (value: 'BRANCH' | 'DEPARTMENT') => void;
  onBranch: (value: string) => void;
  onDepartment: (value: string) => void;
}) {
  return (
    <>
      <label className="field">
        Affiliation
        <select value={affiliationType} onChange={(event) => onType(event.target.value as 'BRANCH' | 'DEPARTMENT')}>
          <option value="BRANCH">Branch</option>
          <option value="DEPARTMENT">Department</option>
        </select>
      </label>
      {affiliationType === 'BRANCH' ? (
        <label className="field">
          Branch
          <select value={branchId} onChange={(event) => onBranch(event.target.value)} required>
            <option value="">Choose a branch</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.code} — {branch.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <label className="field">
          Department
          <select value={departmentId} onChange={(event) => onDepartment(event.target.value)} required>
            <option value="">Choose a department</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.code} — {department.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </>
  );
}
