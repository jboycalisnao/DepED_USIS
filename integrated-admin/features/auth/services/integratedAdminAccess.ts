import { hasCoordinatorModuleAccess } from '../../../../common/auth/moduleAccess';
import { supabase } from '../../../../packages/shared-supabase/src';
import type { CoordinatorAccessRecord } from '../../../../coordinator/features/auth/utils/coordinatorAccess';

export interface IntegratedAdminAccessRecord {
  coordinatorAccess: CoordinatorAccessRecord;
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
    .select('*')
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

  const dataRecord = data as Record<string, unknown>;
  const passwordHash = typeof dataRecord.password_hash === 'string' ? dataRecord.password_hash : '';
  const passwordPlain = typeof dataRecord.password_plain === 'string' ? dataRecord.password_plain : '';
  const validPassword = password === passwordHash || (passwordPlain ? password === passwordPlain : false);
  if (!validPassword) {
    return {
      error: 'No active coordinator account matches the supplied username and password.',
      record: null,
    };
  }

  const hasIaAccess = hasCoordinatorModuleAccess(String(dataRecord.id || ''), 'ia');
  const roleValue = typeof dataRecord.role === 'string' ? dataRecord.role : '';
  const isSystemAdmin = roleValue === 'system_admin';
  if (!hasIaAccess && !isSystemAdmin) {
    return {
      error: 'This account is not allowed to access Integrated Admin. Request IA access in Coordinator Portal.',
      record: null,
    };
  }

  let schoolName = 'USIS School';
  let division = 'Schools Division';
  let divisionCode = '';
  let region = 'Region';
  let regionCode = '';
  let schoolCode = '';
  let schoolAddress = '';
  let schoolUuid = '';
  const schoolId = typeof dataRecord.school_id === 'string' ? dataRecord.school_id : '';
  if (schoolId) {
    const schoolResponse = await supabase
      .from('usis_schools')
      .select('id, school_code, school_name, address_line, municipality_city, province, division, region, division_code, region_code')
      .eq('id', schoolId)
      .limit(1)
      .maybeSingle();
    const school = schoolResponse.data;
    if (school?.school_name) {
      schoolName = school.school_name;
      division = school.division || division;
      divisionCode = school.division_code || school.division || '';
      region = school.region || region;
      regionCode = school.region_code || school.region || '';
      schoolCode = school.school_code || '';
      schoolUuid = school.id || '';
      schoolAddress = [school.address_line, school.municipality_city, school.province].filter(Boolean).join(', ');
    }
  }

  const coordinatorName =
    [dataRecord.first_name, dataRecord.middle_name, dataRecord.last_name]
      .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
      .join(' ') ||
    toTitleCase(normalizedUsername);
  const userId = String(dataRecord.id || '');
  const coordinatorAccess: CoordinatorAccessRecord = {
    accountSource: 'usis_core_coordinators',
    accessLevel: 'school',
    coordinatorName,
    coordinatorRole: roleValue || 'school_usis_coordinator',
    division,
    divisionCode: divisionCode || 'SDI',
    isSuperAdmin: isSystemAdmin,
    region,
    regionCode: regionCode || 'R6',
    schoolAddress: schoolAddress || 'School address not yet configured in coordinator registry.',
    schoolId: schoolCode,
    schoolName,
    schoolUuid,
    userId,
    lastLoginAt: typeof dataRecord.last_login_at === 'string' ? dataRecord.last_login_at : null,
    mustResetPassword: !dataRecord.last_login_at,
  };

  const record: IntegratedAdminAccessRecord = {
    coordinatorAccess,
    coordinatorName,
    role: roleValue || 'school_usis_coordinator',
    schoolName,
    userId,
  };

  return {
    error: null,
    record,
  };
};
