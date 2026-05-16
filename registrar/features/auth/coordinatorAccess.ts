import { supabase } from '../../lib/supabase';

export interface RegistrarCoordinatorAccess {
  coordinatorName: string;
  coordinatorRole: string;
  schoolId: string;
  schoolName: string;
  schoolUuid: string;
}

export const REGISTRAR_ACCESS_STORAGE_KEY = 'usis_registrar_access';

export const getStoredRegistrarAccess = (): RegistrarCoordinatorAccess | null => {
  const raw = sessionStorage.getItem(REGISTRAR_ACCESS_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as RegistrarCoordinatorAccess;
  } catch {
    return null;
  }
};

export const clearStoredRegistrarAccess = () => {
  sessionStorage.removeItem(REGISTRAR_ACCESS_STORAGE_KEY);
};

export const storeRegistrarAccess = (value: RegistrarCoordinatorAccess) => {
  sessionStorage.setItem(REGISTRAR_ACCESS_STORAGE_KEY, JSON.stringify(value));
};

const toTitleCase = (value: string) =>
  value
    .trim()
    .split(/[._\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');

export const resolveRegistrarCoordinatorAccess = async (
  username: string,
  password: string
) => {
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
      *,
      usis_schools!inner (
        id,
        school_code,
        school_name
      )
    `
    )
    .eq('username', normalizedUsername)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (error) {
    return { error: 'Unable to contact the coordinator registry in Supabase.', record: null };
  }

  if (!data) {
    return {
      error: 'No active coordinator account matches the supplied username and password.',
      record: null,
    };
  }

  const validPassword = password === data.password_plain || password === data.password_hash;
  if (!validPassword) {
    return {
      error: 'No active coordinator account matches the supplied username and password.',
      record: null,
    };
  }

  const school = Array.isArray(data.usis_schools) ? data.usis_schools[0] : data.usis_schools;

  return {
    error: null,
    record: {
      coordinatorName:
        [data.first_name, data.middle_name, data.last_name].filter(Boolean).join(' ') ||
        toTitleCase(normalizedUsername),
      coordinatorRole: data.role || 'School USIS Coordinator',
      schoolId: school?.school_code || '',
      schoolName: school?.school_name || 'USIS School',
      schoolUuid: school?.id || '',
    } satisfies RegistrarCoordinatorAccess,
  };
};
