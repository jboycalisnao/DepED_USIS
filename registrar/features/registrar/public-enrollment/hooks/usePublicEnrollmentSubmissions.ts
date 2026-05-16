import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PublicEnrollmentSubmission } from '../types';
import { fetchPublicEnrollmentSubmissions } from '../services/publicEnrollmentSubmissions';

export function usePublicEnrollmentSubmissions() {
  const [submissions, setSubmissions] = useState<PublicEnrollmentSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const rows = await fetchPublicEnrollmentSubmissions();
      setSubmissions(rows);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Unable to load submissions.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

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

