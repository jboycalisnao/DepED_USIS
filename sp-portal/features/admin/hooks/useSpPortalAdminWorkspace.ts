import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  loadAdminApplications,
  loadAdminPortals,
  updateApplicationStatus,
  updatePortalStatus,
  type AdminApplicationRecord,
  type AdminPortalRecord,
  type AdminPortalStatus,
} from '../utils/adminWorkspace';
import type { SpPortalAdminAccess } from '../utils/spPortalAdminAccess';

export function useSpPortalAdminWorkspace(access: SpPortalAdminAccess | null) {
  const [applications, setApplications] = useState<AdminApplicationRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [portals, setPortals] = useState<AdminPortalRecord[]>([]);

  const loadWorkspace = useCallback(async () => {
    if (!access) {
      setIsLoading(false);
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const nextPortals = await loadAdminPortals(access);
      const nextApplications = await loadAdminApplications(nextPortals);
      setPortals(nextPortals);
      setApplications(nextApplications);
    } catch (workspaceError) {
      setError(workspaceError instanceof Error ? workspaceError.message : 'Unable to load admin workspace.');
    } finally {
      setIsLoading(false);
    }
  }, [access]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  const stats = useMemo(() => {
    const submitted = applications.filter((application) => application.status === 'submitted').length;
    const reviewed = applications.filter((application) => application.status === 'reviewed').length;
    const accepted = applications.filter((application) => application.status === 'accepted').length;

    return {
      accepted,
      closedPortals: portals.filter((portal) => portal.status !== 'open').length,
      openPortals: portals.filter((portal) => portal.status === 'open').length,
      reviewed,
      submitted,
      totalApplications: applications.length,
      totalPortals: portals.length,
    };
  }, [applications, portals]);

  const setPortalStatus = async (portalId: string, status: AdminPortalStatus) => {
    setIsSaving(true);
    setError(null);
    setNotice(null);

    try {
      await updatePortalStatus(portalId, status);
      setPortals((current) => current.map((portal) => (portal.id === portalId ? { ...portal, status } : portal)));
      setNotice(status === 'open' ? 'Sign-up page is now open.' : 'Sign-up page is now closed.');
    } catch (workspaceError) {
      setError(workspaceError instanceof Error ? workspaceError.message : 'Unable to update portal status.');
    } finally {
      setIsSaving(false);
    }
  };

  const setApplicationStatus = async (applicationId: string, status: string) => {
    setIsSaving(true);
    setError(null);
    setNotice(null);

    try {
      await updateApplicationStatus(applicationId, status);
      setApplications((current) =>
        current.map((application) => (application.id === applicationId ? { ...application, status } : application)),
      );
      setNotice('Application status updated.');
    } catch (workspaceError) {
      setError(workspaceError instanceof Error ? workspaceError.message : 'Unable to update application status.');
    } finally {
      setIsSaving(false);
    }
  };

  return {
    applications,
    error,
    isLoading,
    isSaving,
    notice,
    portals,
    refresh: loadWorkspace,
    setApplicationStatus,
    setPortalStatus,
    stats,
  };
}
