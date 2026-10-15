import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { changePassword } from '../../../api/auth';
import { ApiError } from '../../../api/client';
import { Alert } from '../../../components/common/Alert';
import { homePath } from '../home-path';
import { useAuth } from '../useAuth';

export function ChangePasswordPage() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await changePassword(password);
      setUser(result.user);
      navigate(homePath(result.user), { replace: true });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to change this password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-screen">
      <form className="card login-card" onSubmit={onSubmit}>
        <p className="eyebrow">Campus</p>
        <h1>Choose a password</h1>
        <p className="muted">
          {user?.email ? `${user.email}. ` : ''}
          This replaces the password issued when your account was created. You will not see this again.
        </p>
        {error ? <Alert message={error} /> : null}
        <label className="field">
          New password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={72}
          />
        </label>
        <label className="field">
          Confirm password
          <input
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={72}
          />
        </label>
        <div className="form-actions">
          <button className="button" type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save password'}
          </button>
          <button
            className="button button-secondary"
            type="button"
            disabled={submitting}
            onClick={() => {
              void logout().then(() => navigate('/login', { replace: true }));
            }}
          >
            Sign out
          </button>
        </div>
      </form>
    </main>
  );
}
