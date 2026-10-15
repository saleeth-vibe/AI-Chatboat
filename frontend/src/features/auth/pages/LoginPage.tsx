import { Navigate } from 'react-router-dom';
import { Alert } from '../../../components/common/Alert';
import { TextField } from '../../../components/forms/TextField';
import { homePath } from '../home-path';
import { useAuth } from '../useAuth';
import { useLogin } from '../hooks/useLogin';

export function LoginPage() {
  const { user, loading } = useAuth();
  const { submit, submitting, error, fieldErrors } = useLogin();

  if (loading) {
    return (
      <main className="login-screen">
        <p className="status">Checking session...</p>
      </main>
    );
  }

  if (user) {
    return <Navigate to={homePath(user)} replace />;
  }

  return (
    <main className="login-screen">
      <form className="card login-card" onSubmit={submit}>
        <p className="eyebrow">Campus Admin</p>
        <h1>Sign in</h1>
        <p className="muted">Use your campus account.</p>
        {error ? <Alert message={error} /> : null}
        <TextField label="Email" name="email" type="email" autoComplete="username" error={fieldErrors.email} />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          error={fieldErrors.password}
        />
        <button className="button" type="submit" disabled={submitting}>
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
