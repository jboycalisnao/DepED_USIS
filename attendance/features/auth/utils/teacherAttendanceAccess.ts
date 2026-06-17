import { supabase } from '@deped-usis/shared-supabase';
import { hasCoordinatorModuleAccessInSupabase } from '../../../../common/auth/moduleAccess';

export interface TeacherAttendanceAccessRecord {
  accountSource: 'usis_core_coordinators';
  userId: string;
  schoolId: string;
  schoolName: string;
  schoolUuid: string;
  displayName: string;
  role: string;
  sectionId: string;
  sectionName: string;
  sectionGradeLevel: string;
  lastLoginAt: string | null;
}

const STORAGE_KEY = 'usis_attendance_teacher_access';

const normalizeIdentity = (value: string) => value.trim().toLowerCase();
const normalizeSectionAdviser = (value: string) =>
  normalizeIdentity(value)
    .replace(/\s*\([^)]*\)\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const matchesPassword = (record: any, password: string) => {
  const normalized = password.trim();
  return normalized === record?.password_plain || normalized === record?.password_hash;
};

export const getStoredTeacherAttendanceAccess = (): TeacherAttendanceAccessRecord | null => {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TeacherAttendanceAccessRecord;
  } catch {
    return null;
  }
};

export const storeTeacherAttendanceAccess = (value: TeacherAttendanceAccessRecord) => {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
};

export const clearStoredTeacherAttendanceAccess = () => {
  sessionStorage.removeItem(STORAGE_KEY);
};

export const resolveTeacherAttendanceAccess = async (
  username: string,
  password: string,
): Promise<{ error: string | null; record: TeacherAttendanceAccessRecord | null }> => {
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

  const response = await supabase
    .from('usis_core_coordinators')
    .select(schoolJoin)
    .eq('username', normalizedUsername)
    .eq('is_active', true)
    .in('role', ['school_usis_coordinator', 'system_admin'])
    .limit(1)
    .maybeSingle();

  if (response.error) {
    return { error: 'Unable to contact the attendance access registry.', record: null };
  }

  if (!response.data) {
    return {
      error: 'No active teacher coordinator account matches the supplied username and password.',
      record: null,
    };
  }

  if (!matchesPassword(response.data, normalizedPassword)) {
    return {
      error: 'No active teacher coordinator account matches the supplied username and password.',
      record: null,
    };
  }

  const hasAttendanceAccess = await hasCoordinatorModuleAccessInSupabase(String(response.data.id || ''), 'attendance');
  if (!hasAttendanceAccess) {
    return {
      error: 'This account is not granted Attendance module access in Coordinator Portal.',
      record: null,
    };
  }

  const displayName =
    [response.data.first_name, response.data.middle_name, response.data.last_name]
      .filter(Boolean)
      .join(' ')
      .trim() || normalizedUsername;
  const displayNameKey = normalizeSectionAdviser(displayName);
  const usernameKey = normalizeIdentity(normalizedUsername);

  const { data: assignment, error: assignmentError } = await supabase
    .from('attendance_teacher_sections')
    .select(`
      section_id,
      registrar_sections!inner (
        id,
        name,
        grade_level
      )
    `)
    .eq('teacher_account_id', response.data.id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (assignmentError) {
    return {
      error: assignmentError.message || 'Unable to resolve the teacher section assignment.',
      record: null,
    };
  }

  let sectionId = String(assignment?.section_id || '').trim();
  let section: any = Array.isArray((assignment as any)?.registrar_sections)
    ? (assignment as any).registrar_sections[0]
    : (assignment as any)?.registrar_sections;

  if (!sectionId) {
    const sectionLookup = await supabase
      .from('registrar_sections')
      .select('id,name,grade_level,adviser_name');

    if (sectionLookup.error) {
      return {
        error: sectionLookup.error.message || 'Unable to resolve the teacher section from registrar records.',
        record: null,
      };
    }

    const matchedSection = (sectionLookup.data || []).find((row: any) => {
      const adviserKey = normalizeSectionAdviser(String(row?.adviser_name || row?.adviserName || ''));
      if (!adviserKey) return false;
      return (
        adviserKey === displayNameKey ||
        adviserKey.includes(displayNameKey) ||
        displayNameKey.includes(adviserKey) ||
        adviserKey.includes(usernameKey) ||
        usernameKey.includes(adviserKey)
      );
    });

    if (matchedSection?.id) {
      sectionId = String(matchedSection.id);
      section = matchedSection;
    }
  }

  if (!sectionId) {
    return {
      error: 'This account does not have a designated section assigned for attendance viewing. Set the section adviser in Registrar or assign the teacher section in Attendance.',
      record: null,
    };
  }

  const school = Array.isArray(response.data.usis_schools)
    ? response.data.usis_schools[0]
    : response.data.usis_schools;

  return {
    error: null,
    record: {
      accountSource: 'usis_core_coordinators',
      userId: response.data.id,
      schoolId: school?.school_code || '',
      schoolName: school?.school_name || 'USIS School',
      schoolUuid: school?.id || '',
      displayName,
      role: response.data.role || 'school_usis_coordinator',
      sectionId,
      sectionName: String(section?.name || 'Unknown Section'),
      sectionGradeLevel: String(section?.grade_level || 'Unknown'),
      lastLoginAt: response.data.last_login_at || null,
    },
  };
};
