import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PublicEnrollmentSubmission } from '../types';
import {
  fetchPublicEnrollmentSubmissions,
} from '../services/publicEnrollmentSubmissions';
import {
  normalizePublicEnrollmentSubmissionsCacheScopeKey,
  peekPublicEnrollmentSubmissionsSnapshot,
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
  const initialSnapshot = useMemo(
    () => peekPublicEnrollmentSubmissionsSnapshot(scopeKey, schoolYearLabel),
    [scopeKey, schoolYearLabel]
  );
  const [submissions, setSubmissions] = useState<PublicEnrollmentSubmission[]>(
    () => initialSnapshot?.rows || []
  );
  const [isLoading, setIsLoading] = useState(() => !initialSnapshot);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastLoadedFromDbAt, setLastLoadedFromDbAt] = useState(() => initialSnapshot?.lastLoadedFromDbAt || '');
  const [lastSavedToCacheAt, setLastSavedToCacheAt] = useState(() => initialSnapshot?.updatedAt || '');
  const lastLoadedFromDbAtRef = useRef(initialSnapshot?.lastLoadedFromDbAt || '');
  const hydratedCacheKeyRef = useRef<string | null>(null);
  const submissionsRef = useRef<PublicEnrollmentSubmission[]>([]);

  const persistRows = useCallback(async (rows: PublicEnrollmentSubmission[]) => {
    const payload = await writePublicEnrollmentSubmissionsSnapshot(scopeKey, rows, schoolYearLabel, lastLoadedFromDbAtRef.current);
    setLastSavedToCacheAt(payload.updatedAt || new Date().toISOString());
    return payload;
  }, [scopeKey, schoolYearLabel]);

  useEffect(() => {
    lastLoadedFromDbAtRef.current = lastLoadedFromDbAt;
  }, [lastLoadedFromDbAt]);

  useEffect(() => {
    submissionsRef.current = submissions;
  }, [submissions]);

  const loadFromNetwork = useCallback(async (options?: { toggleLoading?: boolean }) => {
    const normalizedSchoolYear = String(schoolYearLabel || '').trim();
    if (!normalizedSchoolYear) {
      console.info('[PublicEnrollmentSubmissions] Skipped network fetch: no active school year.', {
        scopeKey,
        schoolYearLabel,
      });
      setSubmissions([]);
      setLastLoadedFromDbAt('');
      if (options?.toggleLoading !== false) {
        setIsLoading(false);
      }
      return [];
    }

    console.info('[PublicEnrollmentSubmissions] Fetching submissions from database.', {
      scopeKey,
      schoolYearLabel: normalizedSchoolYear,
      source: options?.toggleLoading === false ? 'silent-refresh' : 'load-from-network',
    });
    const rows = await fetchPublicEnrollmentSubmissions(undefined, normalizedSchoolYear);
    console.info('[PublicEnrollmentSubmissions] Database fetch completed.', {
      scopeKey,
      schoolYearLabel: normalizedSchoolYear,
      rowCount: rows.length,
    });
    const loadedAt = new Date().toISOString();
    lastLoadedFromDbAtRef.current = loadedAt;
    startTransition(() => {
      setSubmissions(rows);
      setLastLoadedFromDbAt(loadedAt);
    });
    await writePublicEnrollmentSubmissionsSnapshot(scopeKey, rows, schoolYearLabel, loadedAt);
    startTransition(() => {
      setLastSavedToCacheAt(new Date().toISOString());
    });
    hydratedCacheKeyRef.current = cacheScopeKey;
    if (options?.toggleLoading !== false) {
      setIsLoading(false);
    }
    return rows;
  }, [cacheScopeKey, schoolYearLabel, scopeKey]);

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setIsLoading(true);
    setErrorMessage(null);
    try {
      console.info('[PublicEnrollmentSubmissions] Manual refresh requested.', {
        scopeKey,
        schoolYearLabel,
      });
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
      const normalizedSchoolYear = String(schoolYearLabel || '').trim();
      setErrorMessage(null);

      const cached = peekPublicEnrollmentSubmissionsSnapshot(scopeKey, schoolYearLabel) || await readPublicEnrollmentSubmissionsSnapshot(scopeKey, schoolYearLabel);
      if (cached) {
        console.info('[PublicEnrollmentSubmissions] Loaded submissions from local cache on boot.', {
          scopeKey,
          schoolYearLabel,
          rowCount: cached.rows?.length || 0,
        });
        if (cancelled) return;
        hydratedCacheKeyRef.current = cacheScopeKey;
        startTransition(() => {
          setSubmissions(cached.rows || []);
          lastLoadedFromDbAtRef.current = cached.lastLoadedFromDbAt || '';
          setLastLoadedFromDbAt(cached.lastLoadedFromDbAt || '');
          setLastSavedToCacheAt(cached.updatedAt || '');
        });
        setIsLoading(false);
        return;
      }

      if (!normalizedSchoolYear) {
        if (!cancelled) {
          hydratedCacheKeyRef.current = null;
          setIsLoading(false);
        }
        return;
      }

      console.info('[PublicEnrollmentSubmissions] No local cache found on boot; fetching from database.', {
        scopeKey,
        schoolYearLabel,
      });
      if (!cancelled) {
        setIsLoading(true);
      }

      try {
        const rows = await fetchPublicEnrollmentSubmissions(undefined, normalizedSchoolYear);
        if (cancelled) return;
        hydratedCacheKeyRef.current = cacheScopeKey;
        const loadedAt = new Date().toISOString();
        lastLoadedFromDbAtRef.current = loadedAt;
        startTransition(() => {
          setSubmissions(rows);
          setLastLoadedFromDbAt(loadedAt);
        });
        await writePublicEnrollmentSubmissionsSnapshot(scopeKey, rows, schoolYearLabel, loadedAt);
        startTransition(() => {
          setLastSavedToCacheAt(new Date().toISOString());
        });
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
  }, [cacheScopeKey, schoolYearLabel, scopeKey]);

  useEffect(() => {
    if (hydratedCacheKeyRef.current !== cacheScopeKey) return;
    void persistRows(submissions);
  }, [cacheScopeKey, persistRows, submissions]);

  useEffect(() => {
    const flushSnapshot = () => {
      if (hydratedCacheKeyRef.current !== cacheScopeKey) return;
      void writePublicEnrollmentSubmissionsSnapshot(scopeKey, submissionsRef.current, schoolYearLabel, lastLoadedFromDbAtRef.current).then((payload) => {
        setLastSavedToCacheAt(payload.updatedAt || new Date().toISOString());
      });
    };

    const onPageHide = () => {
      flushSnapshot();
    };

    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      flushSnapshot();
    };
  }, [cacheScopeKey, lastLoadedFromDbAt, scopeKey, schoolYearLabel]);

  return useMemo(
    () => ({
      submissions,
      isLoading,
      errorMessage,
      lastLoadedFromDbAt,
      lastSavedToCacheAt,
      refresh,
      upsertSubmissionLocally,
      removeSubmissionById,
    }),
    [submissions, isLoading, errorMessage, lastLoadedFromDbAt, lastSavedToCacheAt, refresh, upsertSubmissionLocally, removeSubmissionById]
  );
}
