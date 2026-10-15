import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getAssignment, updateOffering } from '../../api/admin';
import { messageOf } from '../../api/errors';
import { Alert } from '../../components/common/Alert';
import type { AssignmentDetail, Offering } from '../../types/admin';

export function AssignmentDetailPage() {
  const params = useParams();
  const assignmentId = Number(params.id);
  const valid = Number.isInteger(assignmentId) && assignmentId > 0;
  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!valid) {
      setLoading(false);
      return;
    }
    let active = true;
    getAssignment(assignmentId)
      .then((loaded) => {
        if (active) {
          setAssignment(loaded);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(messageOf(caught, 'Unable to load this assignment.'));
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
  }, [assignmentId, valid]);

  async function save(offering: Offering, facultyId: string, status: Offering['status']) {
    setError(null);
    try {
      const updated = await updateOffering(offering.id, {
        assignedFacultyId: facultyId ? Number(facultyId) : null,
        status,
      });
      setAssignment(updated);
      setNotice('Offering updated.');
    } catch (caught) {
      setError(messageOf(caught, 'Unable to update this offering.'));
    }
  }

  return (
    <section className="page page-wide">
      <header className="page-header">
        <h1>{assignment ? `${assignment.classLabel} offerings` : 'Offerings'}</h1>
        <Link className="button button-inline button-secondary" to="/assignments">
          All assignments
        </Link>
      </header>
      {!valid ? <Alert message="This assignment link is not valid." /> : null}
      {loading ? <p className="status">Loading offerings...</p> : null}
      {notice ? <Alert message={notice} tone="success" /> : null}
      {error ? <Alert message={error} /> : null}
      {assignment ? (
        <div className="card table-card">
          <p className="muted">
            {assignment.academicYearName} {assignment.periodType} · semester {assignment.semesterLevel} · {assignment.curriculumName}
          </p>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Faculty</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {assignment.offerings.map((offering) => (
                  <OfferingRow key={offering.id} offering={offering} onSave={save} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function OfferingRow({
  offering,
  onSave,
}: {
  offering: Offering;
  onSave: (offering: Offering, facultyId: string, status: Offering['status']) => Promise<void>;
}) {
  const [facultyId, setFacultyId] = useState(offering.assignedFacultyId ? String(offering.assignedFacultyId) : '');
  const [status, setStatus] = useState(offering.status);
  const [saving, setSaving] = useState(false);
  const known = offering.eligibleFaculty.some((member) => String(member.id) === facultyId);

  return (
    <tr>
      <td>
        {offering.courseCode} — {offering.courseName}
      </td>
      <td>
        <select value={facultyId} onChange={(event) => setFacultyId(event.target.value)}>
          <option value="">Unassigned</option>
          {!known && offering.assignedFacultyId ? (
            <option value={offering.assignedFacultyId}>{offering.assignedFacultyName ?? 'Assigned faculty'}</option>
          ) : null}
          {offering.eligibleFaculty.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
        {offering.eligibleFaculty.length === 0 ? (
          <Link className="text-link" to="/faculty">
            Add eligibility
          </Link>
        ) : null}
      </td>
      <td>
        <select value={status} onChange={(event) => setStatus(event.target.value as Offering['status'])}>
          <option value="PLANNED" disabled={offering.status !== 'PLANNED'}>
            Planned
          </option>
          <option value="ONGOING" disabled={offering.status === 'COMPLETED'}>
            Ongoing
          </option>
          <option value="COMPLETED">Completed</option>
        </select>
      </td>
      <td>
        <button
          className="button button-inline button-secondary"
          type="button"
          disabled={saving}
          onClick={() => {
            setSaving(true);
            void onSave(offering, facultyId, status).finally(() => setSaving(false));
          }}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </td>
    </tr>
  );
}
