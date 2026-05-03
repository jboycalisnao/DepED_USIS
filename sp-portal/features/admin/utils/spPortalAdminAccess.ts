export type SpPortalAdminAccess = {
  accountSource: 'sp_portal_coordinators' | 'usis_core_coordinators';
  coordinatorName: string;
  coordinatorRole: string;
  isSuperAdmin: boolean;
  schoolId: string;
  schoolName: string;
  schoolUuid: string;
};

export const SP_PORTAL_ADMIN_ACCESS_KEY = 'sp_portal_admin_access';

export function getStoredSpPortalAdminAccess() {
  const raw = sessionStorage.getItem(SP_PORTAL_ADMIN_ACCESS_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SpPortalAdminAccess;
  } catch {
    return null;
  }
}

export function storeSpPortalAdminAccess(access: SpPortalAdminAccess) {
  sessionStorage.setItem(SP_PORTAL_ADMIN_ACCESS_KEY, JSON.stringify(access));
}

export function clearSpPortalAdminAccess() {
  sessionStorage.removeItem(SP_PORTAL_ADMIN_ACCESS_KEY);
}
