import { supabase } from '../../lib/supabase';
import { getCoordinatorModuleAccessMap, hasCoordinatorModuleAccess } from '../../../common/auth/moduleAccess';
import { resolveCoordinatorDepartmentAccess } from '../../../common/auth/coordinatorDepartmentAccess';

export interface RegistrarCoordinatorAccess {
  accountSource: 'usis_core_coordinators';
  userId: string;
  coordinatorName: string;
  coordinatorRole: string;
  departmentName: string;
  schoolId: string;
  schoolName: string;
  schoolUuid: string;
}

export interface RegistrarAuthDebug {
  normalizedUsername: string;
  coordinatorsFound: boolean;
  checkedSources: Array<'usis_core_coordinators'>;
  matchedSource: 'usis_core_coordinators' | null;
  matchedRole: string | null;
  passwordMatched: boolean;
  explicitRegistrarDeny: boolean;
  outcome: 'invalid_input' | 'registry_error' | 'no_match' | 'access_denied' | 'success';
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

const toMiddleInitial = (value: unknown) => {
  const text = String(value || '').trim();
  return text ? `${text.charAt(0).toUpperCase()}.` : '';
};

const formatCoordinatorDisplayName = (firstName: unknown, middleName: unknown, lastName: unknown) => {
  const first = String(firstName || '').trim();
  const middleInitial = toMiddleInitial(middleName);
  const last = String(lastName || '').trim();
  return [first, middleInitial, last].filter(Boolean).join(' ').trim();
};

const hasExplicitRegistrarDeny = (accountId: string) => {
  const accessMap = getCoordinatorModuleAccessMap();
  if (!Object.prototype.hasOwnProperty.call(accessMap, accountId)) {
    return false;
  }
  return !hasCoordinatorModuleAccess(accountId, 'registrar');
};

const matchesPassword = (record: any, password: string) => {
  const normalized = password.trim();
  return normalized === record?.password_plain || normalized === record?.password_hash;
};

export const resolveRegistrarCoordinatorAccess = async (
  username: string,
  password: string
) => {
  const normalizedUsername = username.trim().toLowerCase();
  const debug: RegistrarAuthDebug = {
    normalizedUsername,
    coordinatorsFound: false,
    checkedSources: [],
    matchedSource: null,
    matchedRole: null,
    passwordMatched: false,
    explicitRegistrarDeny: false,
    outcome: 'no_match',
  };

  if (!normalizedUsername || password.trim().length < 6) {
    debug.outcome = 'invalid_input';
    return {
      error: 'Provide a valid username and password with at least 6 characters.',
      record: null,
      debug,
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
    .in('role', ['registrar_coordinator', 'school_usis_coordinator', 'system_admin'])
    .limit(1)
    .maybeSingle();

  if (coordinatorsResponse.error) {
    debug.outcome = 'registry_error';
    return { error: 'Unable to contact the coordinator registry in Supabase.', record: null, debug };
  }
  debug.coordinatorsFound = Boolean(coordinatorsResponse.data);

  const candidates: Array<{ source: RegistrarCoordinatorAccess['accountSource']; data: any }> = coordinatorsResponse.data
    ? [{ source: 'usis_core_coordinators', data: coordinatorsResponse.data }]
    : [];

  for (const candidate of candidates) {
    debug.checkedSources.push(candidate.source);
    if (!matchesPassword(candidate.data, password)) {
      continue;
    }
    debug.passwordMatched = true;
    debug.matchedSource = candidate.source;
    debug.matchedRole = candidate.data.role || null;

    const departmentAccess = await resolveCoordinatorDepartmentAccess(String(candidate.data.id || ''));
    if (!departmentAccess.allowed) {
      debug.outcome = 'access_denied';
      return {
        error: `This account is assigned to an inactive department (${departmentAccess.departmentName || 'Unknown'}). Contact Integrated Admin.`,
        record: null,
        debug,
      };
    }

    // Coordinator module map can be stale across deployments/domains.
    // Registrar role from DB is treated as authoritative for access.
    if (candidate.source === 'usis_core_coordinators' && hasExplicitRegistrarDeny(candidate.data.id)) {
      debug.explicitRegistrarDeny = true;
    }

    const school = Array.isArray(candidate.data.usis_schools)
      ? candidate.data.usis_schools[0]
      : candidate.data.usis_schools;

    return {
      error: null,
      record: {
        accountSource: candidate.source,
        userId: candidate.data.id,
        coordinatorName: formatCoordinatorDisplayName(
          candidate.data.first_name,
          candidate.data.middle_name,
          candidate.data.last_name,
        ) || toTitleCase(normalizedUsername),
        coordinatorRole: candidate.data.role || 'School USIS Coordinator',
        departmentName: String(departmentAccess.departmentName || '').trim(),
        schoolId: school?.school_code || '',
        schoolName: school?.school_name || 'USIS School',
        schoolUuid: school?.id || '',
      } satisfies RegistrarCoordinatorAccess,
      debug: { ...debug, outcome: 'success' },
    };
  }

  debug.outcome = 'no_match';
  return {
    error: 'No active coordinator account matches the supplied username and password.',
    record: null,
    debug,
  };
};
