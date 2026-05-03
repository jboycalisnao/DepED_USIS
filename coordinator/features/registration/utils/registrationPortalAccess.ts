import type { RegistrationPortalAccessRecord } from '@/features/access/utils/credentialRegistry';

export const REGISTRATION_PORTAL_ACCESS_STORAGE_KEY = 'usis_registration_portal_access';

export const getStoredRegistrationPortalAccess = (): RegistrationPortalAccessRecord | null => {
  const raw = sessionStorage.getItem(REGISTRATION_PORTAL_ACCESS_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as RegistrationPortalAccessRecord;
  } catch {
    return null;
  }
};

export const storeRegistrationPortalAccess = (value: RegistrationPortalAccessRecord) => {
  sessionStorage.setItem(REGISTRATION_PORTAL_ACCESS_STORAGE_KEY, JSON.stringify(value));
};

export const clearStoredRegistrationPortalAccess = () => {
  sessionStorage.removeItem(REGISTRATION_PORTAL_ACCESS_STORAGE_KEY);
};
