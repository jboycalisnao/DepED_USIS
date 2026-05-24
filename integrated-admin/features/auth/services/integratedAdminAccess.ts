import { hasCoordinatorModuleAccess } from '../../../../common/auth/moduleAccess';
import { supabase } from '../../../../packages/shared-supabase/src';

export interface IntegratedAdminAccessRecord {
  coordinatorName: string;
  role: string;
  schoolName: string;
  userId: string;
}

const STORAGE_KEY = 'usis_integrated_admin_access';

const toTitleCase = (value: string) =>
  value
    .trim()
    .split(/[._\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');

export const getStoredIntegratedAdminAccess = (): IntegratedAdminAccessRecord | null => {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as IntegratedAdminAccessRecord;
  } catch {
    return null;
  }
};

export const storeIntegratedAdminAccess = (record: IntegratedAdminAccessRecord) => {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(record));
};

export const clearStoredIntegratedAdminAccess = () => {
  sessionStorage.removeItem(STORAGE_KEY);
};

export const resolveIntegratedAdminAccess = async (username: string, password: string) => {
  const normalizedUsername = username.trim().toLowerCase();

  if (!normalizedUsername || password.trim().length < 6) {
    return {
      error: 'Provide a valid username and password with at least 6 characters.',
      record: null,
    };
  }

  const { data, error } = await supabase
    .from('usis_core_coordinators')
    .select(
      `
        id,
        username,
        role,
        first_name,
        middle_name,
        last_name,
        password_hash,
        password_plain,
        is_active,
        usis_schools!inner (
          school_name
        )
      `,
    )
    .eq('username', normalizedUsername)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (error) {
    return {
      error: 'Unable to contact coordinator credentials database.',
      record: null,
    };
  }

  if (!data) {
    return {
      error: 'No active coordinator account matches the supplied username.',
      record: null,
    };
  }

  const validPassword = password === data.password_hash || password === data.password_plain;
  if (!validPassword) {
    return {
      error: 'No active coordinator account matches the supplied username and password.',
      record: null,
    };
  }

  const hasIaAccess = hasCoordinatorModuleAccess(data.id, 'ia');
  const isSystemAdmin = data.role === 'system_admin';
  if (!hasIaAccess && !isSystemAdmin) {
    return {
      error: 'This account is not allowed to access Integrated Admin. Request IA access in Coordinator Portal.',
      record: null,
    };
  }

  const school = Array.isArray(data.usis_schools) ? data.usis_schools[0] : data.usis_schools;
  const record: IntegratedAdminAccessRecord = {
    coordinatorName:
      [data.first_name, data.middle_name, data.last_name].filter(Boolean).join(' ') ||
      toTitleCase(normalizedUsername),
    role: data.role || 'school_usis_coordinator',
    schoolName: school?.school_name || 'USIS School',
    userId: data.id,
  };

  return {
    error: null,
    record,
  };
};
