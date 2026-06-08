import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PublicEnrollmentSubmission } from '../types';
import {
  fetchPublicEnrollmentSubmissionById,
  fetchPublicEnrollmentSubmissions,
} from '../services/publicEnrollmentSubmissions';

const CACHE_PREFIX = 'registrar_public_enrollment_submissions_cache_v1';
const CACHE_MAX_ROWS = 250;

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
  const rowsToCache = rows.slice(0, CACHE_MAX_ROWS);
  const payload = JSON.stringify({ updatedAt: new Date().toISOString(), rows: rowsToCache });

  try {
    window.localStorage.setItem(`${CACHE_PREFIX}:${scopeKey}`, payload);
  } catch (error) {
    const isQuotaError =
      error instanceof DOMException &&
      (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED');

    if (!isQuotaError) {
      throw error;
    }

    try {
      window.localStorage.removeItem(`${CACHE_PREFIX}:${scopeKey}`);
      window.localStorage.setItem(`${CACHE_PREFIX}:${scopeKey}`, payload);
    } catch {
      // Swallow quota errors so refresh continues using in-memory state only.
    }
  }
};

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

  const refreshSubmissionById = useCallback(async (submissionId: string) => {
    const trimmedId = String(submissionId || '').trim();
    if (!trimmedId) return null;

    try {
      const row = await fetchPublicEnrollmentSubmissionById(trimmedId);
      if (!row) return null;

      setSubmissions((current) => upsertSubmission(current, row));
      return row;
    } catch (error: any) {
      setErrorMessage(error?.message || 'Unable to load submission.');
      return null;
    }
  }, []);

  const removeSubmissionById = useCallback((submissionId: string) => {
    const trimmedId = String(submissionId || '').trim();
    if (!trimmedId) return;
    setSubmissions((current) => current.filter((row) => row.id !== trimmedId));
  }, []);

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
      refreshSubmissionById,
      removeSubmissionById,
    }),
    [submissions, isLoading, errorMessage, refresh, refreshSubmissionById, removeSubmissionById]
  );
}
