import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './useAuth';

export function RequireStudent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="login-screen">
        <p className="status">Checking session...</p>
      </main>
    );
  }

  if (!user || user.role !== 'STUDENT') {
    return <Navigate to="/login" replace />;
  }

  if (user.mustChangePassword) {
    return <Navigate to="/account/password" replace />;
  }

  return <Outlet />;
}
