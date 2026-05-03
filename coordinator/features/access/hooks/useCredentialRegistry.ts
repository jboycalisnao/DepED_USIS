import { useCallback, useMemo, useEffect, useState } from 'react';
import { getStoredCoordinatorAccess } from '@/features/auth/utils/coordinatorAccess';
import {
  createCoreCoordinatorCredential,
  createElectionCoordinatorCredential,
  createSpPortalCoordinatorCredential,
  loadCredentialRegistrySnapshot,
  updateCoreCoordinatorCredential,
  updateElectionCoordinatorCredential,
  type CredentialRegistrySnapshot,
} from '../utils/credentialRegistry';

export function useCredentialRegistry() {
  const access = useMemo(() => getStoredCoordinatorAccess(), []);
  const [snapshot, setSnapshot] = useState<CredentialRegistrySnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingCore, setIsSubmittingCore] = useState(false);
  const [isSubmittingElection, setIsSubmittingElection] = useState(false);
  const [isSubmittingSpPortal, setIsSubmittingSpPortal] = useState(false);
  const [isUpdatingCore, setIsUpdatingCore] = useState(false);
  const [isUpdatingElection, setIsUpdatingElection] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    if (!access?.schoolId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const nextSnapshot = await loadCredentialRegistrySnapshot(access);
      setSnapshot(nextSnapshot);
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load the credential registry.');
    } finally {
      setIsLoading(false);
    }
  }, [access]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createCore = useCallback(
    async (payload: Parameters<typeof createCoreCoordinatorCredential>[0]) => {
      setIsSubmittingCore(true);
      setNotice('');
      setError('');

      try {
        await createCoreCoordinatorCredential(payload);
        setNotice('Core USIS access created.');
        await refresh();
      } catch (submissionError) {
        setError(
          submissionError instanceof Error
            ? submissionError.message
            : 'Unable to create the USIS core coordinator credential.',
        );
      } finally {
        setIsSubmittingCore(false);
      }
    },
    [refresh],
  );

  const createElection = useCallback(
    async (payload: Parameters<typeof createElectionCoordinatorCredential>[0]) => {
      setIsSubmittingElection(true);
      setNotice('');
      setError('');

      try {
        await createElectionCoordinatorCredential(payload);
        setNotice('Election access created.');
        await refresh();
      } catch (submissionError) {
        setError(
          submissionError instanceof Error
            ? submissionError.message
            : 'Unable to create the election coordinator credential.',
        );
      } finally {
        setIsSubmittingElection(false);
      }
    },
    [refresh],
  );

  const createSpPortal = useCallback(
    async (payload: Parameters<typeof createSpPortalCoordinatorCredential>[0]) => {
      setIsSubmittingSpPortal(true);
      setNotice('');
      setError('');

      try {
        await createSpPortalCoordinatorCredential(payload);
        setNotice('SP Portal access created.');
        await refresh();
      } catch (submissionError) {
        setError(
          submissionError instanceof Error
            ? submissionError.message
            : 'Unable to create the SP Portal coordinator credential.',
        );
      } finally {
        setIsSubmittingSpPortal(false);
      }
    },
    [refresh],
  );

  const updateCore = useCallback(
    async (payload: Parameters<typeof updateCoreCoordinatorCredential>[0]) => {
      setIsUpdatingCore(true);
      setNotice('');
      setError('');

      try {
        await updateCoreCoordinatorCredential(payload);
        setNotice('Core USIS access updated.');
        await refresh();
      } catch (submissionError) {
        setError(
          submissionError instanceof Error
            ? submissionError.message
            : 'Unable to update the USIS core coordinator credential.',
        );
        throw submissionError;
      } finally {
        setIsUpdatingCore(false);
      }
    },
    [refresh],
  );

  const updateElection = useCallback(
    async (payload: Parameters<typeof updateElectionCoordinatorCredential>[0]) => {
      setIsUpdatingElection(true);
      setNotice('');
      setError('');

      try {
        await updateElectionCoordinatorCredential(payload);
        setNotice('Election access updated.');
        await refresh();
      } catch (submissionError) {
        setError(
          submissionError instanceof Error
            ? submissionError.message
            : 'Unable to update the election coordinator credential.',
        );
        throw submissionError;
      } finally {
        setIsUpdatingElection(false);
      }
    },
    [refresh],
  );

  return {
    access,
    createCore,
    createElection,
    createSpPortal,
    error,
    isLoading,
    isSubmittingCore,
    isSubmittingElection,
    isSubmittingSpPortal,
    isUpdatingCore,
    isUpdatingElection,
    notice,
    snapshot,
    updateCore,
    updateElection,
  };
}
