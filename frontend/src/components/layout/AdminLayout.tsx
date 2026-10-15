import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Alert } from '../common/Alert';
import { useAuth } from '../../features/auth/useAuth';
import { CalendarStatus } from './CalendarStatus';
import { Sidebar } from './Sidebar';

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  async function onLogout() {
    setLoggingOut(true);
    setLogoutError(null);
    try {
      await logout();
      navigate('/login');
    } catch {
      setLogoutError('Could not log out. Try again.');
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="shell">
      <Sidebar />
      <div className="workspace">
        <header className="topbar">
          <CalendarStatus />
          <p className="topbar-user">{user?.email}</p>
          <button className="button button-secondary" type="button" onClick={onLogout} disabled={loggingOut}>
            {loggingOut ? 'Signing out...' : 'Log out'}
          </button>
        </header>
        <main className="content">
          {logoutError ? <Alert message={logoutError} /> : null}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
