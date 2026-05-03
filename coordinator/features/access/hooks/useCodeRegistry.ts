import { useCallback, useEffect, useMemo, useState } from 'react';
import { getStoredCoordinatorAccess } from '@/features/auth/utils/coordinatorAccess';
import {
  codeRegistryPermissions,
  loadCodeRegistrySnapshot,
  type CodeRegistrySnapshot,
  updateDivisionCode,
  updateRegistrationCode,
  updateRegionCode,
} from '../utils/codeRegistry';

export function useCodeRegistry() {
  const access = useMemo(() => getStoredCoordinatorAccess(), []);
  const [snapshot, setSnapshot] = useState<CodeRegistrySnapshot | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingRegion, setIsSubmittingRegion] = useState(false);
  const [isSubmittingDivision, setIsSubmittingDivision] = useState(false);
  const [isSubmittingRegistration, setIsSubmittingRegistration] = useState(false);

  const refresh = useCallback(async () => {
    if (!access?.schoolId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const nextSnapshot = await loadCodeRegistrySnapshot(access);
      setSnapshot(nextSnapshot);
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load the code registry.');
    } finally {
      setIsLoading(false);
    }
  }, [access]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const submitRegionCode = useCallback(
    async (region: string, regionCode: string) => {
      if (!access) return;
      setIsSubmittingRegion(true);
      setNotice('');
      setError('');
      try {
        await updateRegionCode(access, region, regionCode);
        setNotice('Region code updated.');
        await refresh();
      } catch (submissionError) {
        setError(submissionError instanceof Error ? submissionError.message : 'Unable to update the region code.');
      } finally {
        setIsSubmittingRegion(false);
      }
    },
    [access, refresh],
  );

  const submitDivisionCode = useCallback(
    async (division: string, divisionCode: string, region?: string) => {
      if (!access) return;
      setIsSubmittingDivision(true);
      setNotice('');
      setError('');
      try {
        await updateDivisionCode(access, division, divisionCode, region);
        setNotice('Division code updated.');
        await refresh();
      } catch (submissionError) {
        setError(submissionError instanceof Error ? submissionError.message : 'Unable to update the division code.');
      } finally {
        setIsSubmittingDivision(false);
      }
    },
    [access, refresh],
  );

  const submitRegistrationCode = useCallback(
    async (registrationTargetId: string, registrationCode: string) => {
      if (!access) return;
      setIsSubmittingRegistration(true);
      setNotice('');
      setError('');
      try {
        await updateRegistrationCode(access, registrationTargetId, registrationCode);
        setNotice('Registration code updated.');
        await refresh();
      } catch (submissionError) {
        setError(submissionError instanceof Error ? submissionError.message : 'Unable to update the registration code.');
      } finally {
        setIsSubmittingRegistration(false);
      }
    },
    [access, refresh],
  );

  return {
    access,
    canManageDivisionCodes: access ? codeRegistryPermissions.canManageDivisionCodes(access) : false,
    canManageElectionCodes: access ? codeRegistryPermissions.canManageElectionCodes(access) : false,
    canManageRegionCodes: access ? codeRegistryPermissions.canManageRegionCodes(access) : false,
    error,
    isLoading,
    isSubmittingDivision,
    isSubmittingRegistration,
    isSubmittingRegion,
    notice,
    snapshot,
    submitDivisionCode,
    submitRegistrationCode,
    submitRegionCode,
  };
}
