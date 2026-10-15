import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createAcademicYear, getAcademicYear, updateAcademicYear } from '../../../api/academic-years';
import { ApiError } from '../../../api/client';
import type { AcademicYear, AcademicYearInput } from '../../../types/academic-year';

export function useAcademicYearForm(yearId?: number) {
  const navigate = useNavigate();
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [loading, setLoading] = useState(Boolean(yearId));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!yearId) {
      return;
    }

    let active = true;
    getAcademicYear(yearId)
      .then((result) => {
        if (active) {
          setYear(result);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof ApiError ? caught.message : 'Unable to load this academic year.');
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
  }, [yearId]);

  async function save(input: AcademicYearInput) {
    setSubmitting(true);
    setError(null);
    setFieldErrors({});

    try {
      if (yearId) {
        await updateAcademicYear(yearId, input);
      } else {
        await createAcademicYear(input);
      }
      navigate('/academic-years', {
        state: { message: yearId ? 'Academic year updated.' : 'Academic year created.' },
      });
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
        const next: Record<string, string> = {};
        for (const detail of caught.details) {
          next[detail.field] = detail.message;
        }
        setFieldErrors(next);
      } else {
        setError('Unable to save this academic year.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return { year, loading, submitting, error, fieldErrors, save };
}
