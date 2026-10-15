import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './useAuth';

export function RequireAdmin() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="login-screen">
        <p className="status">Checking session...</p>
      </main>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
