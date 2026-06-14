import { supabase } from '@deped-usis/shared-supabase';
import { hasCoordinatorModuleAccessInSupabase } from '../../../../common/auth/moduleAccess';

export interface AttendanceAccessRecord {
  accountSource: 'usis_core_users' | 'usis_core_coordinators';
  userId: string;
  schoolId: string;
  schoolName: string;
  schoolUuid: string;
  displayName: string;
  role: string;
  lastLoginAt: string | null;
}

const STORAGE_KEY = 'usis_attendance_access';

const normalizeIdentity = (value: string) => value.trim().toLowerCase();

const matchesPassword = (record: any, password: string) => {
  const normalized = password.trim();
  return normalized === record?.password_plain || normalized === record?.password_hash;
};

export const getStoredAttendanceAccess = (): AttendanceAccessRecord | null => {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AttendanceAccessRecord;
  } catch {
    return null;
  }
};

export const storeAttendanceAccess = (value: AttendanceAccessRecord) => {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
};

export const clearStoredAttendanceAccess = () => {
  sessionStorage.removeItem(STORAGE_KEY);
};

export const resolveAttendanceAccess = async (
  username: string,
  password: string,
): Promise<{ error: string | null; record: AttendanceAccessRecord | null }> => {
  const normalizedUsername = normalizeIdentity(username);
  const normalizedPassword = password.trim();

  if (!normalizedUsername || normalizedPassword.length < 6) {
    return {
      error: 'Provide a valid username and password with at least 6 characters.',
      record: null,
    };
  }

  const schoolJoin = `
    *,
    usis_schools!inner (
      id,
      school_code,
      school_name
    )
  `;

  const coordinatorsResponse = await supabase
    .from('usis_core_coordinators')
    .select(schoolJoin)
    .eq('username', normalizedUsername)
    .eq('is_active', true)
    .in('role', ['attendance_coordinator', 'school_usis_coordinator', 'system_admin'])
    .limit(1)
    .maybeSingle();

  if (coordinatorsResponse.error) {
    return { error: 'Unable to contact the USIS core users registry.', record: null };
  }

  const candidates: Array<{ source: AttendanceAccessRecord['accountSource']; data: any }> = [];
  if (coordinatorsResponse.data) {
    candidates.push({ source: 'usis_core_coordinators', data: coordinatorsResponse.data });
  }

  for (const candidate of candidates) {
    if (!matchesPassword(candidate.data, normalizedPassword)) {
      continue;
    }

    if (candidate.source === 'usis_core_coordinators') {
      const hasAttendanceAccess = await hasCoordinatorModuleAccessInSupabase(String(candidate.data.id || ''), 'attendance');
      if (!hasAttendanceAccess) {
        return {
          error: 'Access denied. This account is not granted Attendance module access in Coordinator Portal.',
          record: null,
        };
      }
    }

    const school = Array.isArray(candidate.data.usis_schools)
      ? candidate.data.usis_schools[0]
      : candidate.data.usis_schools;

    return {
      error: null,
      record: {
        accountSource: candidate.source,
        userId: candidate.data.id,
        schoolId: school?.school_code || '',
        schoolName: school?.school_name || 'USIS School',
        schoolUuid: school?.id || '',
        displayName:
          [candidate.data.first_name, candidate.data.middle_name, candidate.data.last_name]
            .filter(Boolean)
            .join(' ') || normalizedUsername,
        role: candidate.data.role || 'attendance_coordinator',
        lastLoginAt: candidate.data.last_login_at || null,
      },
    };
  }

  return {
    error: 'No active attendance account matches the supplied username and password.',
    record: null,
  };
};
