import { Navigate, Outlet } from 'react-router-dom';
import { homePath } from './home-path';
import { useAuth } from './useAuth';

export function RequirePasswordChange() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="login-screen">
        <p className="status">Checking session...</p>
      </main>
    );
  }

  if (!user || (user.role !== 'STUDENT' && user.role !== 'FACULTY')) {
    return <Navigate to="/login" replace />;
  }

  if (!user.mustChangePassword) {
    return <Navigate to={homePath(user)} replace />;
  }

  return <Outlet />;
}
