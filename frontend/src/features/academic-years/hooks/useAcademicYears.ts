import { useEffect, useState, type FormEvent } from 'react';
import { listAcademicYears } from '../../../api/academic-years';
import { ApiError } from '../../../api/client';
import type { AcademicYear, AcademicYearList } from '../../../types/academic-year';

type StatusFilter = 'all' | 'active' | 'inactive';

export function useAcademicYears() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedStatus, setAppliedStatus] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [meta, setMeta] = useState<AcademicYearList['meta']>({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    listAcademicYears({
      page,
      pageSize: 20,
      search: appliedSearch || undefined,
      isActive: appliedStatus === 'all' ? undefined : appliedStatus === 'active',
    })
      .then((result) => {
        if (!active) {
          return;
        }
        setYears(result.data);
        setMeta(result.meta);
      })
      .catch((caught: unknown) => {
        if (!active) {
          return;
        }
        setYears([]);
        setError(caught instanceof ApiError ? caught.message : 'Unable to load academic years.');
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [appliedSearch, appliedStatus, page]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setAppliedSearch(search.trim());
    setAppliedStatus(status);
  }

  return {
    search,
    setSearch,
    status,
    setStatus,
    page,
    setPage,
    years,
    meta,
    loading,
    error,
    applyFilters,
  };
}
