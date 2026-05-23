import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PublicEnrollmentSubmission } from '../types';
import { fetchPublicEnrollmentSubmissions } from '../services/publicEnrollmentSubmissions';

const CACHE_PREFIX = 'registrar_public_enrollment_submissions_cache_v1';

const readCache = (scopeKey: string): PublicEnrollmentSubmission[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(`${CACHE_PREFIX}:${scopeKey}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.rows) ? (parsed.rows as PublicEnrollmentSubmission[]) : [];
  } catch {
    return [];
  }
};

const writeCache = (scopeKey: string, rows: PublicEnrollmentSubmission[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    `${CACHE_PREFIX}:${scopeKey}`,
    JSON.stringify({ updatedAt: new Date().toISOString(), rows }),
  );
};

export function usePublicEnrollmentSubmissions(scopeKey = 'default') {
  const [submissions, setSubmissions] = useState<PublicEnrollmentSubmission[]>(() => readCache(scopeKey));
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setIsLoading(true);
    setErrorMessage(null);
    try {
      const rows = await fetchPublicEnrollmentSubmissions();
      setSubmissions(rows);
      writeCache(scopeKey, rows);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Unable to load submissions.');
    } finally {
      if (!options?.silent) setIsLoading(false);
    }
  }, [scopeKey]);

  useEffect(() => {
    const cachedRows = readCache(scopeKey);
    setSubmissions(cachedRows);
    setIsLoading(true);
  }, [scopeKey]);

  useEffect(() => {
    void refresh();
  }, [scopeKey, refresh]);

  useEffect(() => {
    writeCache(scopeKey, submissions);
  }, [scopeKey, submissions]);

  return useMemo(
    () => ({
      submissions,
      isLoading,
      errorMessage,
      refresh,
    }),
    [submissions, isLoading, errorMessage, refresh]
  );
}
