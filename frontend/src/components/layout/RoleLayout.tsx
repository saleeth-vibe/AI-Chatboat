import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Alert } from '../common/Alert';
import { useAuth } from '../../features/auth/useAuth';

export function RoleLayout({ title }: { title: string }) {
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
    <div className="faculty-shell">
      <aside className="faculty-sidebar">
        <div className="faculty-brand">
          <span className="brand-mark" aria-hidden="true">C</span>
          <span><strong>Campus AI</strong><small>Faculty workspace</small></span>
        </div>
        <div className="faculty-side-label">Workspace</div>
        <div className="faculty-nav-item active" aria-current="page">
          <span className="nav-glyph" aria-hidden="true">▤</span>
          Course materials
        </div>
        <div className="faculty-side-note">
          <span className="side-note-icon" aria-hidden="true">✦</span>
          <strong>Prepare your course library</strong>
          <span>Upload notes and PDFs so students can ask grounded questions.</span>
        </div>
        <div className="faculty-profile">
          <span className="profile-avatar">{user?.email?.slice(0, 1).toUpperCase() ?? 'F'}</span>
          <span className="profile-copy"><strong>{user?.email}</strong><small>Faculty</small></span>
        </div>
      </aside>
      <div className="faculty-workspace">
        <header className="faculty-topbar">
          <div className="topbar-context"><span className="topbar-dot" />{title}</div>
          <button className="faculty-logout" type="button" onClick={onLogout} disabled={loggingOut}>
            {loggingOut ? 'Signing out...' : 'Log out'}
          </button>
        </header>
        <main className="faculty-content">
          {logoutError ? <Alert message={logoutError} /> : null}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
