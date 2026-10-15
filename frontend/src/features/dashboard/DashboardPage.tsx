import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboard } from '../../api/admin';
import { messageOf } from '../../api/errors';
import { Alert } from '../../components/common/Alert';
import type { Dashboard } from '../../types/admin';
import { calendarLabel } from '../../components/layout/calendar-label';

const cards = [
  { key: 'departments', label: 'Departments', to: '/departments' },
  { key: 'branches', label: 'Branches', to: '/branches' },
  { key: 'courses', label: 'Courses', to: '/courses' },
  { key: 'curricula', label: 'Curricula', to: '/curricula' },
  { key: 'faculty', label: 'Faculty', to: '/faculty' },
  { key: 'students', label: 'Students', to: '/students' },
] as const;

export function DashboardPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboard()
      .then(setDashboard)
      .catch((caught: unknown) => setError(messageOf(caught, 'Unable to load the dashboard.')))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="page">
      <header className="page-header">
        <h1>Home</h1>
      </header>
      {loading ? <p className="status">Loading dashboard...</p> : null}
      {error ? <Alert message={error} /> : null}
      {dashboard ? (
        <>
          <div className="card">
            <p className="eyebrow">Current calendar</p>
            <p>{calendarLabel(dashboard.calendar)}</p>
            <p className="muted">Today is {dashboard.calendar.today}.</p>
          </div>
          <div className="stat-grid">
            {cards.map((card) => (
              <Link key={card.key} className="stat-card" to={card.to}>
                <span>{card.label}</span>
                <strong>{dashboard.counts[card.key]}</strong>
              </Link>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
