import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as loginRequest } from '../../../api/auth';
import { homePath } from '../home-path';
import { ApiError } from '../../../api/client';
import { useAuth } from '../useAuth';

export function useLogin() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '');
    const password = String(form.get('password') ?? '');

    setSubmitting(true);
    setError(null);
    setFieldErrors({});

    try {
      const result = await loginRequest({ email, password });
      setUser(result.user);
      navigate(homePath(result.user));
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
        const next: Record<string, string> = {};
        for (const detail of caught.details) {
          next[detail.field] = detail.message;
        }
        setFieldErrors(next);
      } else {
        setError('Unable to sign in. Try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return { submit, submitting, error, fieldErrors };
}
