import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PublicEnrollmentSubmission } from '../types';
import {
  fetchPublicEnrollmentSubmissions,
} from '../services/publicEnrollmentSubmissions';
import {
  normalizePublicEnrollmentSubmissionsCacheScopeKey,
  readPublicEnrollmentSubmissionsSnapshot,
  writePublicEnrollmentSubmissionsSnapshot,
} from '../utils/publicEnrollmentSubmissionsCache';

const sortByCreatedAtDesc = (left: PublicEnrollmentSubmission, right: PublicEnrollmentSubmission) =>
  new Date(right.created_at).getTime() - new Date(left.created_at).getTime();

const upsertSubmission = (
  rows: PublicEnrollmentSubmission[],
  nextRow: PublicEnrollmentSubmission
): PublicEnrollmentSubmission[] => {
  const filtered = rows.filter((row) => row.id !== nextRow.id);
  filtered.push(nextRow);
  return filtered.sort(sortByCreatedAtDesc);
};

export function usePublicEnrollmentSubmissions(scopeKey = 'default', schoolYearLabel = '') {
  const cacheScopeKey = useMemo(
    () => normalizePublicEnrollmentSubmissionsCacheScopeKey(scopeKey, schoolYearLabel),
    [scopeKey, schoolYearLabel]
  );
  const [submissions, setSubmissions] = useState<PublicEnrollmentSubmission[]>(
    () => []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hydratedCacheKeyRef = useRef<string | null>(null);

  const persistRows = useCallback(async (rows: PublicEnrollmentSubmission[]) => {
    await writePublicEnrollmentSubmissionsSnapshot(scopeKey, rows, schoolYearLabel);
  }, [scopeKey, schoolYearLabel]);

  const loadFromNetwork = useCallback(async (options?: { toggleLoading?: boolean }) => {
    const normalizedSchoolYear = String(schoolYearLabel || '').trim();
    if (!normalizedSchoolYear) {
      setSubmissions([]);
      if (options?.toggleLoading !== false) {
        setIsLoading(false);
      }
      return [];
    }

    const rows = await fetchPublicEnrollmentSubmissions(undefined, normalizedSchoolYear);
    setSubmissions(rows);
    await persistRows(rows);
    hydratedCacheKeyRef.current = cacheScopeKey;
    if (options?.toggleLoading !== false) {
      setIsLoading(false);
    }
    return rows;
  }, [cacheScopeKey, persistRows, schoolYearLabel]);

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setIsLoading(true);
    setErrorMessage(null);
    try {
      await loadFromNetwork({ toggleLoading: !options?.silent });
    } catch (error: any) {
      setErrorMessage(error?.message || 'Unable to load submissions.');
      if (!options?.silent) setIsLoading(false);
    } finally {
      if (!options?.silent) setIsLoading(false);
    }
  }, [loadFromNetwork]);

  const upsertSubmissionLocally = useCallback((nextRow: PublicEnrollmentSubmission) => {
    const trimmedId = String(nextRow?.id || '').trim();
    if (!trimmedId) return;

    setSubmissions((current) => {
      const nextRows = upsertSubmission(current, nextRow);
      if (hydratedCacheKeyRef.current === cacheScopeKey) {
        void persistRows(nextRows);
      }
      return nextRows;
    });
  }, [cacheScopeKey, persistRows]);

  const removeSubmissionById = useCallback((submissionId: string) => {
    const trimmedId = String(submissionId || '').trim();
    if (!trimmedId) return;

    setSubmissions((current) => {
      const nextRows = current.filter((row) => row.id !== trimmedId);
      if (hydratedCacheKeyRef.current === cacheScopeKey) {
        void persistRows(nextRows);
      }
      return nextRows;
    });
  }, [cacheScopeKey, persistRows]);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      setErrorMessage(null);

      const cached = await readPublicEnrollmentSubmissionsSnapshot(scopeKey, schoolYearLabel);
      if (cached) {
        if (cancelled) return;
        hydratedCacheKeyRef.current = cacheScopeKey;
        setSubmissions(cached.rows || []);
        setIsLoading(false);
        return;
      }

      const normalizedSchoolYear = String(schoolYearLabel || '').trim();
      if (!normalizedSchoolYear) {
        if (!cancelled) {
          setSubmissions([]);
          setIsLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setIsLoading(true);
      }

      try {
        const rows = await fetchPublicEnrollmentSubmissions(undefined, normalizedSchoolYear);
        if (cancelled) return;
        hydratedCacheKeyRef.current = cacheScopeKey;
        setSubmissions(rows);
        await persistRows(rows);
      } catch (error: any) {
        if (!cancelled) {
          setErrorMessage(error?.message || 'Unable to load submissions.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [cacheScopeKey, persistRows, schoolYearLabel]);

  useEffect(() => {
    if (hydratedCacheKeyRef.current !== cacheScopeKey) return;
    void persistRows(submissions);
  }, [cacheScopeKey, persistRows, submissions]);

  return useMemo(
    () => ({
      submissions,
      isLoading,
      errorMessage,
      refresh,
      upsertSubmissionLocally,
      removeSubmissionById,
    }),
    [submissions, isLoading, errorMessage, refresh, upsertSubmissionLocally, removeSubmissionById]
  );
}
