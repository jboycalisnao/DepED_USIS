import { useCallback, useMemo, useEffect, useState } from 'react';
import { getStoredCoordinatorAccess } from '@/features/auth/utils/coordinatorAccess';
import {
  createCoreCoordinatorCredential,
  createElectionCoordinatorCredential,
  createSpPortalCoordinatorCredential,
  deleteCoreCoordinatorCredential,
  deleteElectionCoordinatorCredential,
  deleteSpPortalCoordinatorCredential,
  loadCredentialRegistrySnapshot,
  updateCoreCoordinatorCredential,
  updateElectionCoordinatorCredential,
  type CredentialRegistrySnapshot,
} from '../utils/credentialRegistry';
import { saveCoordinatorAccountModuleAccessToSupabase } from '../../../../common/auth/moduleAccess';

const REGISTRY_CACHE_TTL_MS = 1000 * 60 * 5;
const buildRegistryCacheKey = (userId: string, schoolId: string) =>
  `usis_coordinator_registry_snapshot:${userId}:${schoolId}`;

type RegistryCachePayload = {
  cachedAt: number;
  snapshot: CredentialRegistrySnapshot;
};

const readRegistryCache = (cacheKey: string): RegistryCachePayload | null => {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(cacheKey);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as RegistryCachePayload;
    if (!parsed || typeof parsed !== 'object' || !parsed.snapshot || typeof parsed.cachedAt !== 'number') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const writeRegistryCache = (cacheKey: string, snapshot: CredentialRegistrySnapshot) => {
  if (typeof window === 'undefined') return;
  const payload: RegistryCachePayload = { cachedAt: Date.now(), snapshot };
  window.localStorage.setItem(cacheKey, JSON.stringify(payload));
};

export function useCredentialRegistry() {
  const access = useMemo(() => getStoredCoordinatorAccess(), []);
  const cacheKey = useMemo(
    () => (access?.userId && access?.schoolId ? buildRegistryCacheKey(access.userId, access.schoolId) : ''),
    [access],
  );
  const [snapshot, setSnapshot] = useState<CredentialRegistrySnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingCore, setIsSubmittingCore] = useState(false);
  const [isSubmittingElection, setIsSubmittingElection] = useState(false);
  const [isSubmittingSpPortal, setIsSubmittingSpPortal] = useState(false);
  const [isUpdatingCore, setIsUpdatingCore] = useState(false);
  const [isUpdatingElection, setIsUpdatingElection] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    if (!access?.schoolId) {
      setIsLoading(false);
      return;
    }

    if (!options?.silent) {
      setIsLoading(true);
    }
    try {
      const nextSnapshot = await loadCredentialRegistrySnapshot(access);
      setSnapshot(nextSnapshot);
      if (cacheKey) {
        writeRegistryCache(cacheKey, nextSnapshot);
      }
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load the credential registry.');
    } finally {
      if (!options?.silent) {
        setIsLoading(false);
      }
    }
  }, [access, cacheKey]);

  useEffect(() => {
    if (!access?.schoolId || !cacheKey) {
      setIsLoading(false);
      return;
    }

    const cached = readRegistryCache(cacheKey);
    if (cached?.snapshot) {
      setSnapshot(cached.snapshot);
      setIsLoading(false);

      const isStale = Date.now() - cached.cachedAt > REGISTRY_CACHE_TTL_MS;
      if (isStale) {
        void refresh({ silent: true });
      }
      return;
    }

    void refresh();
  }, [access, cacheKey, refresh]);

  const createCore = useCallback(
    async (payload: Parameters<typeof createCoreCoordinatorCredential>[0]) => {
      setIsSubmittingCore(true);
      setNotice('');
      setError('');

      try {
        const createdId = await createCoreCoordinatorCredential(payload);
        if (payload.allowedModules?.length) {
          await saveCoordinatorAccountModuleAccessToSupabase(createdId, payload.allowedModules);
        }
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

  const deleteCore = useCallback(
    async (id: string) => {
      setIsDeleting(true);
      setNotice('');
      setError('');
      try {
        await deleteCoreCoordinatorCredential(id);
        setNotice('Core account deleted.');
        await refresh();
      } catch (submissionError) {
        setError(
          submissionError instanceof Error
            ? submissionError.message
            : 'Unable to delete the core coordinator credential.',
        );
        throw submissionError;
      } finally {
        setIsDeleting(false);
      }
    },
    [refresh],
  );

  const deleteElection = useCallback(
    async (id: string) => {
      setIsDeleting(true);
      setNotice('');
      setError('');
      try {
        await deleteElectionCoordinatorCredential(id);
        setNotice('Election account deleted.');
        await refresh();
      } catch (submissionError) {
        setError(
          submissionError instanceof Error
            ? submissionError.message
            : 'Unable to delete the election coordinator credential.',
        );
        throw submissionError;
      } finally {
        setIsDeleting(false);
      }
    },
    [refresh],
  );

  const deleteSpPortal = useCallback(
    async (id: string) => {
      setIsDeleting(true);
      setNotice('');
      setError('');
      try {
        await deleteSpPortalCoordinatorCredential(id);
        setNotice('SP Portal account deleted.');
        await refresh();
      } catch (submissionError) {
        setError(
          submissionError instanceof Error
            ? submissionError.message
            : 'Unable to delete the SP Portal coordinator credential.',
        );
        throw submissionError;
      } finally {
        setIsDeleting(false);
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
    isDeleting,
    notice,
    snapshot,
    deleteCore,
    deleteElection,
    deleteSpPortal,
    updateCore,
    updateElection,
  };
}
