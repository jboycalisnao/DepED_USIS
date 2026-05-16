import { supabase } from '../../../../packages/shared-supabase/src';
import { fetchDepedSchools, fetchDepedSchoolById } from '../../schools/services/depedSchoolApi';
import { mapToLocalSchoolSchema } from '../../schools/utils/depedSchoolParser';
import type { CoordinatorAccessRecord } from '@/features/auth/utils/coordinatorAccess';
import type { UsisModuleKey } from '../../../../common/auth/moduleAccess';
import {
  canAssignCoreAccessLevel,
  getDefaultCoreAccessLevelForRole,
  getDefaultCoreRoleForAccessLevel,
} from './coreAccessRules';

export interface CredentialRegistrySnapshot {
  attendanceCoordinators: RegistryUserRecord[];
  accessibleSchools: RegistrySchoolContext[];
  coreCoordinators: RegistryUserRecord[];
  electionCoordinators: RegistryUserRecord[];
  electionEvents: RegistryElectionEvent[];
  spPortalCoordinators: RegistryUserRecord[];
  registrarCoordinators: RegistryUserRecord[];
  school: RegistrySchoolContext;
}

export interface RegistrationPortalAccessRecord {
  divisionCode: string;
  registrationCode: string;
  regionCode: string;
}

export interface RegistryElectionEvent {
  electionCode: string;
  electionName: string;
  id: string;
  registrationCode: string;
  schoolCode: string;
  schoolName: string;
  schoolYearId: string;
  status: string;
}

export interface RegistrySchoolContext {
  division: string;
  divisionCode: string;
  region: string;
  regionCode: string;
  schoolCode: string;
  schoolName: string;
  schoolUuid: string;
}

export interface RegistryUserRecord {
  accessLevel?: string;
  division: string;
  divisionCode: string;
  email: string;
  electionId?: string;
  employeeId?: string | null;
  firstName?: string;
  id: string;
  isActive: boolean;
  label: string;
  lastName?: string;
  lastLoginAt: string | null;
  middleName?: string | null;
  mobileNo?: string | null;
  permissions?: string;
  region: string;
  regionCode: string;
  role: string;
  schoolCode: string;
  schoolName: string;
  schoolUuid?: string;
  scope: string;
  username: string;
}

export interface CreateCoreCredentialInput {
  accessLevel: string;
  actorAccess: CoordinatorAccessRecord;
  credentialType:
    | 'school_usis_coordinator'
    | 'registrar_coordinator'
    | 'attendance_coordinator'
    | 'system_admin'
    | 'registrar'
    | 'attendance';
  email: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  middleName: string;
  mobileNo: string;
  password: string;
  role: string;
  schoolCode: string;
  username: string;
  allowedModules?: UsisModuleKey[];
}

export interface CreateElectionCredentialInput {
  actorAccess?: CoordinatorAccessRecord | null;
  allSchoolCodes?: string[];
  email: string;
  electionCode?: string;
  registrationCode?: string;
  electionId: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  middleName: string;
  mobileNo: string;
  password: string;
  permissions: string;
  role: string;
  schoolCode: string;
  username: string;
}

export interface CreateSpPortalCredentialInput {
  actorAccess?: CoordinatorAccessRecord | null;
  email: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  middleName: string;
  mobileNo: string;
  password: string;
  permissions: string;
  role: string;
  schoolCode: string;
  username: string;
}

export interface UpdateCoreCredentialInput extends Omit<CreateCoreCredentialInput, 'password'> {
  id: string;
  isActive: boolean;
  password?: string;
}

export interface UpdateElectionCredentialInput extends Omit<CreateElectionCredentialInput, 'password'> {
  id: string;
  isActive: boolean;
  password?: string;
}

const syncSchoolFromDepedApi = async (schoolCode: string) => {
  const record = await fetchDepedSchoolById(schoolCode);
  
  if (!record || !record.schoolId || !record.schoolName) {
    console.warn('Incomplete school record received from API:', record);
    throw new Error(`School ID ${schoolCode} returned incomplete data from the DepEd API masterlist.`);
  }

  console.log('Syncing school from DepEd API:', record);

  const { data, error } = await supabase
    .from('usis_schools')
    .insert([mapToLocalSchoolSchema(record)])
    .select('id, school_code, school_name, division, region, division_code, region_code')
    .single();

  if (error) {
    throw new Error(error.message || 'Unable to sync school record to the local database.');
  }

  return data;
};

const getSchoolContext = async (schoolCode: string) => {
  const { data, error } = await supabase
    .from('usis_schools')
    .select('id, school_code, school_name, division, region, division_code, region_code')
    .eq('school_code', schoolCode)
    .maybeSingle();

  if (error) {
    throw new Error('Unable to load the matching school from Supabase.');
  }

  if (data?.id) {
    return data;
  }

  return syncSchoolFromDepedApi(schoolCode);
};

const getScopedSchools = async (access: CoordinatorAccessRecord) => {
  let query = supabase
    .from('usis_schools')
    .select('id, school_code, school_name, division, region, division_code, region_code')
    .eq('is_active', true);

  if (!access.isSuperAdmin && access.schoolId) {
    query = query.eq('school_code', access.schoolId);
  } else if (!access.isSuperAdmin && access.regionCode && access.divisionCode) {
    // Legacy registration portal context still scopes by region/division when no school ID is available.
    query = query.eq('region_code', access.regionCode).eq('division_code', access.divisionCode);
  }

  const { data, error } = await query.order('region').order('division').order('school_name');

  if (error) {
    throw new Error('Unable to load the scoped school registry.');
  }

  return (data || []).map((school) => ({
    division: school.division || 'Schools Division of Iloilo',
    divisionCode: school.division_code || school.division || 'SDI',
    region: school.region || 'Region VI - Western Visayas',
    regionCode: school.region_code || school.region || 'R6',
    schoolCode: school.school_code,
    schoolName: school.school_name,
    schoolUuid: school.id,
  }));
};

const normalizeName = (value: string) => value.trim();
const normalizeIdentity = (value: string) => value.trim().toLowerCase();
const resolveCoreEmail = (username: string) => `${normalizeIdentity(username)}@usis.local`;
const resolvePersistedCoreRole = (role: string) =>
  role === 'attendance_coordinator' ? 'school_usis_coordinator' : role;

const parsePermissions = (value: string) =>
  value
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);

const formatPermissions = (value: unknown) => {
  if (!value) return '';
  if (Array.isArray(value)) {
    return value.filter((entry) => typeof entry === 'string').join(', ');
  }
  if (typeof value === 'object' && value !== null && 'permissions' in value) {
    const permissions = (value as { permissions?: unknown }).permissions;
    if (Array.isArray(permissions)) {
      return permissions.filter((entry) => typeof entry === 'string').join(', ');
    }
  }
  return '';
};

const isMissingSpPortalTable = (error: { code?: string; message?: string } | null) =>
  error?.code === '42P01' || error?.message?.includes('sp_portal_coordinators');

const formatDbError = (error: { message?: string; details?: string; hint?: string } | null, fallback: string) => {
  if (!error) return fallback;
  return [error.message, error.details, error.hint].filter(Boolean).join(' | ') || fallback;
};

export const loadCredentialRegistrySnapshot = async (
  access: CoordinatorAccessRecord,
): Promise<CredentialRegistrySnapshot> => {
  const accessibleSchools = await getScopedSchools(access);
  const school = accessibleSchools.find((entry) => entry.schoolCode === access.schoolId) || accessibleSchools[0];

  if (!school) {
    throw new Error('No school context is available for this account.');
  }

  const schoolIds = accessibleSchools.map((entry) => entry.schoolUuid);
  const schoolById = new Map(accessibleSchools.map((entry) => [entry.schoolUuid, entry]));

  const [coreResponse, electionResponse, eventsResponse] = await Promise.all([
    supabase
      .from('usis_core_coordinators')
      .select('id, school_id, username, email, role, access_level, is_active, last_login_at, first_name, last_name, middle_name, employee_id, mobile_no, region_code, division_code')
      .in('school_id', schoolIds)
      .order('created_at', { ascending: false }),
    supabase
      .from('election_coordinators')
      .select('id, school_id, election_id, username, email, role, election_code, is_active, last_login_at, first_name, last_name, middle_name, employee_id, mobile_no, permissions')
      .in('school_id', schoolIds)
      .order('created_at', { ascending: false }),
    supabase
      .from('election_events')
      .select('id, school_id, election_code, registration_code, election_name, school_year_id, status')
      .in('school_id', schoolIds)
      .order('created_at', { ascending: false }),
  ]);

  const spPortalResponse = await supabase
    .from('sp_portal_coordinators')
    .select('id, school_id, username, email, role, is_active, last_login_at, first_name, last_name, middle_name, employee_id, mobile_no, permissions')
    .in('school_id', schoolIds)
    .order('created_at', { ascending: false });

  if (coreResponse.error || electionResponse.error || eventsResponse.error || (spPortalResponse.error && !isMissingSpPortalTable(spPortalResponse.error))) {
    throw new Error('Unable to load the credential registry for this school.');
  }

  return {
    attendanceCoordinators: (coreResponse.data || [])
      .filter((record) => record.role === 'attendance_coordinator')
      .map((record) => ({
        division: schoolById.get(record.school_id)?.division || school.division,
        divisionCode: record.division_code || schoolById.get(record.school_id)?.divisionCode || school.divisionCode,
        email: record.email,
        employeeId: record.employee_id,
        firstName: record.first_name || '',
        id: record.id,
        isActive: record.is_active,
        label: [record.first_name, record.last_name].filter(Boolean).join(' ') || record.username,
        lastName: record.last_name || '',
        lastLoginAt: record.last_login_at,
        middleName: record.middle_name || '',
        mobileNo: record.mobile_no || '',
        region: schoolById.get(record.school_id)?.region || school.region,
        regionCode: record.region_code || schoolById.get(record.school_id)?.regionCode || school.regionCode,
        role: record.role,
        accessLevel: record.access_level,
        scope: 'attendance',
        schoolCode: schoolById.get(record.school_id)?.schoolCode || school.schoolCode,
        schoolName: schoolById.get(record.school_id)?.schoolName || school.schoolName,
        schoolUuid: record.school_id,
        username: record.username,
      })),
    accessibleSchools,
    school: {
      division: school.division,
      divisionCode: school.divisionCode,
      region: school.region,
      regionCode: school.regionCode,
      schoolCode: school.schoolCode,
      schoolName: school.schoolName,
      schoolUuid: school.schoolUuid,
    },
    coreCoordinators: (coreResponse.data || [])
      .filter((record) => record.role !== 'registrar_coordinator' && record.role !== 'attendance_coordinator')
      .map((record) => ({
        division: schoolById.get(record.school_id)?.division || school.division,
        divisionCode: record.division_code || schoolById.get(record.school_id)?.divisionCode || school.divisionCode,
        email: record.email,
        employeeId: record.employee_id,
        firstName: record.first_name || '',
        id: record.id,
        isActive: record.is_active,
        label: [record.first_name, record.last_name].filter(Boolean).join(' ') || record.username,
        lastName: record.last_name || '',
        lastLoginAt: record.last_login_at,
        middleName: record.middle_name || '',
        mobileNo: record.mobile_no || '',
        region: schoolById.get(record.school_id)?.region || school.region,
        regionCode: record.region_code || schoolById.get(record.school_id)?.regionCode || school.regionCode,
        role: record.role,
        accessLevel: record.access_level,
        scope: record.access_level,
        schoolCode: schoolById.get(record.school_id)?.schoolCode || school.schoolCode,
        schoolName: schoolById.get(record.school_id)?.schoolName || school.schoolName,
        schoolUuid: record.school_id,
        username: record.username,
      })),
    registrarCoordinators: (coreResponse.data || [])
      .filter((record) => record.role === 'registrar_coordinator')
      .map((record) => ({
        division: schoolById.get(record.school_id)?.division || school.division,
        divisionCode: record.division_code || schoolById.get(record.school_id)?.divisionCode || school.divisionCode,
        email: record.email,
        employeeId: record.employee_id,
        firstName: record.first_name || '',
        id: record.id,
        isActive: record.is_active,
        label: [record.first_name, record.last_name].filter(Boolean).join(' ') || record.username,
        lastName: record.last_name || '',
        lastLoginAt: record.last_login_at,
        middleName: record.middle_name || '',
        mobileNo: record.mobile_no || '',
        region: schoolById.get(record.school_id)?.region || school.region,
        regionCode: record.region_code || schoolById.get(record.school_id)?.regionCode || school.regionCode,
        role: record.role,
        accessLevel: record.access_level,
        scope: 'registrar',
        schoolCode: schoolById.get(record.school_id)?.schoolCode || school.schoolCode,
        schoolName: schoolById.get(record.school_id)?.schoolName || school.schoolName,
        schoolUuid: record.school_id,
        username: record.username,
      })),
    electionCoordinators: (electionResponse.data || []).map((record) => ({
      division: schoolById.get(record.school_id)?.division || school.division,
      divisionCode: schoolById.get(record.school_id)?.divisionCode || school.divisionCode,
      email: record.email,
      electionId: record.election_id,
      employeeId: record.employee_id,
      firstName: record.first_name || '',
      id: record.id,
      isActive: record.is_active,
      label: [record.first_name, record.last_name].filter(Boolean).join(' ') || record.username,
      lastName: record.last_name || '',
      lastLoginAt: record.last_login_at,
      middleName: record.middle_name || '',
      mobileNo: record.mobile_no || '',
      permissions: formatPermissions(record.permissions),
      region: schoolById.get(record.school_id)?.region || school.region,
      regionCode: schoolById.get(record.school_id)?.regionCode || school.regionCode,
      role: record.role,
      schoolCode: schoolById.get(record.school_id)?.schoolCode || school.schoolCode,
      schoolName: schoolById.get(record.school_id)?.schoolName || school.schoolName,
      schoolUuid: record.school_id,
      scope: record.election_code,
      username: record.username,
    })),
    spPortalCoordinators: (spPortalResponse.error ? [] : spPortalResponse.data || []).map((record) => ({
      division: schoolById.get(record.school_id)?.division || school.division,
      divisionCode: schoolById.get(record.school_id)?.divisionCode || school.divisionCode,
      email: record.email,
      employeeId: record.employee_id,
      firstName: record.first_name || '',
      id: record.id,
      isActive: record.is_active,
      label: [record.first_name, record.last_name].filter(Boolean).join(' ') || record.username,
      lastName: record.last_name || '',
      lastLoginAt: record.last_login_at,
      middleName: record.middle_name || '',
      mobileNo: record.mobile_no || '',
      permissions: formatPermissions(record.permissions),
      region: schoolById.get(record.school_id)?.region || school.region,
      regionCode: schoolById.get(record.school_id)?.regionCode || school.regionCode,
      role: record.role,
      schoolCode: schoolById.get(record.school_id)?.schoolCode || school.schoolCode,
      schoolName: schoolById.get(record.school_id)?.schoolName || school.schoolName,
      schoolUuid: record.school_id,
      scope: 'sp_portal',
      username: record.username,
    })),
    electionEvents: (eventsResponse.data || []).map((record) => ({
      electionCode: record.election_code,
      electionName: record.election_name,
      id: record.id,
      registrationCode: record.registration_code || '',
      schoolCode: schoolById.get(record.school_id)?.schoolCode || school.schoolCode,
      schoolName: schoolById.get(record.school_id)?.schoolName || school.schoolName,
      schoolYearId: record.school_year_id,
      status: record.status,
    })),
  };
};

export const resolveRegistrationPortalAccess = async (
  regionCode: string,
  divisionCode: string,
  registrationCode: string,
): Promise<RegistrationPortalAccessRecord> => {
  const normalizedRegionCode = regionCode.trim().toUpperCase();
  const normalizedDivisionCode = divisionCode.trim().toUpperCase();
  const normalizedRegistrationCode = registrationCode.trim().toUpperCase();

  const { data: schools, error: schoolsError } = await supabase
    .from('usis_schools')
    .select('id')
    .eq('region_code', normalizedRegionCode)
    .eq('division_code', normalizedDivisionCode)
    .eq('is_active', true);

  if (schoolsError) {
    throw new Error('Unable to validate the region and division codes.');
  }

  const schoolIds = (schools || []).map((entry) => entry.id);
  if (schoolIds.length === 0) {
    throw new Error('No active schools match the supplied region and division codes.');
  }

  const { data: events, error: eventsError } = await supabase
    .from('election_events')
    .select('id')
    .in('school_id', schoolIds)
    .eq('registration_code', normalizedRegistrationCode);

  if (eventsError) {
    throw new Error('Unable to validate the registration code.');
  }

  if (!(events || []).length) {
    throw new Error('No election event matches the supplied region, division, and registration code.');
  }

  return {
    divisionCode: normalizedDivisionCode,
    registrationCode: normalizedRegistrationCode,
    regionCode: normalizedRegionCode,
  };
};

export const loadRegistrationPortalSnapshot = async (
  access: RegistrationPortalAccessRecord,
): Promise<CredentialRegistrySnapshot> => {
  const scopedSchools = await getScopedSchools({
    accessLevel: 'school',
    accountSource: 'usis_core_coordinators',
    coordinatorName: 'Registration Portal',
    coordinatorRole: 'school_usis_coordinator',
    division: access.divisionCode,
    divisionCode: access.divisionCode,
    isSuperAdmin: false,
    region: access.regionCode,
    regionCode: access.regionCode,
    schoolAddress: '',
    schoolId: '',
    schoolName: '',
    schoolUuid: '',
    userId: '',
    lastLoginAt: null,
    mustResetPassword: false,
  });

  const schoolIds = scopedSchools.map((entry) => entry.schoolUuid);
  const schoolById = new Map(scopedSchools.map((entry) => [entry.schoolUuid, entry]));
  const primarySchool = scopedSchools[0];

  const { data: eventsData, error: eventsError } = await supabase
    .from('election_events')
    .select('id, school_id, election_code, registration_code, election_name, school_year_id, status')
    .in('school_id', schoolIds)
    .eq('registration_code', access.registrationCode)
    .order('created_at', { ascending: false });

  if (eventsError) {
    throw new Error('Unable to load the registration portal context.');
  }

  const scopedEventIds = (eventsData || []).map((entry) => entry.id);
  const { data: coordinatorData, error: coordinatorError } = await supabase
    .from('election_coordinators')
    .select('id, school_id, election_id, username, email, role, election_code, is_active, last_login_at, first_name, last_name, middle_name, employee_id, mobile_no, permissions')
    .in('school_id', schoolIds)
    .in('election_id', scopedEventIds.length ? scopedEventIds : ['00000000-0000-0000-0000-000000000000'])
    .order('created_at', { ascending: false });

  if (coordinatorError) {
    throw new Error('Unable to load the registration portal context.');
  }

  return {
    accessibleSchools: scopedSchools,
    attendanceCoordinators: [],
    coreCoordinators: [],
    electionCoordinators: (coordinatorData || []).map((record) => ({
      division: schoolById.get(record.school_id)?.division || primarySchool?.division || access.divisionCode,
      divisionCode: schoolById.get(record.school_id)?.divisionCode || access.divisionCode,
      email: record.email,
      electionId: record.election_id,
      employeeId: record.employee_id,
      firstName: record.first_name || '',
      id: record.id,
      isActive: record.is_active,
      label: [record.first_name, record.last_name].filter(Boolean).join(' ') || record.username,
      lastName: record.last_name || '',
      lastLoginAt: record.last_login_at,
      middleName: record.middle_name || '',
      mobileNo: record.mobile_no || '',
      permissions: formatPermissions(record.permissions),
      region: schoolById.get(record.school_id)?.region || primarySchool?.region || access.regionCode,
      regionCode: schoolById.get(record.school_id)?.regionCode || access.regionCode,
      role: record.role,
      schoolCode: schoolById.get(record.school_id)?.schoolCode || '',
      schoolName: schoolById.get(record.school_id)?.schoolName || '',
      schoolUuid: record.school_id,
      scope: record.election_code,
      username: record.username,
    })),
    spPortalCoordinators: [],
    electionEvents: (eventsData || []).map((record) => ({
      electionCode: record.election_code,
      electionName: record.election_name,
      id: record.id,
      registrationCode: record.registration_code || '',
      schoolCode: schoolById.get(record.school_id)?.schoolCode || '',
      schoolName: schoolById.get(record.school_id)?.schoolName || '',
      schoolYearId: record.school_year_id,
      status: record.status,
    })),
    school: primarySchool || {
      division: access.divisionCode,
      divisionCode: access.divisionCode,
      region: access.regionCode,
      regionCode: access.regionCode,
      schoolCode: '',
      schoolName: '',
      schoolUuid: '',
    },
  };
};

export const createSpPortalCoordinatorCredential = async (input: CreateSpPortalCredentialInput) => {
  const school = await getSchoolContext(input.schoolCode);

  const { error } = await supabase.from('sp_portal_coordinators').insert([
    {
      school_id: school.id,
      employee_id: input.employeeId.trim() || null,
      username: normalizeIdentity(input.username),
      email: normalizeIdentity(input.email),
      password_hash: input.password.trim(),
      password_plain: input.password.trim(),
      first_name: normalizeName(input.firstName),
      last_name: normalizeName(input.lastName),
      middle_name: normalizeName(input.middleName) || null,
      mobile_no: input.mobileNo.trim() || null,
      role: input.role,
      permissions: {
        permissions: parsePermissions(input.permissions),
        provisioned_by: 'coordinator_portal',
        subsystem: 'sp_portal',
      },
      is_active: true,
    },
  ]);

  if (error) {
    throw new Error(formatDbError(error, 'Unable to create the SP Portal coordinator credential.'));
  }
};

export const createCoreCoordinatorCredential = async (input: CreateCoreCredentialInput) => {
  const moduleScopedRole = input.role === 'registrar_coordinator' || input.role === 'attendance_coordinator';
  const nextAccessLevel = 'school';
  const nextRole = moduleScopedRole
    ? resolvePersistedCoreRole(input.role)
    : getDefaultCoreRoleForAccessLevel(nextAccessLevel, input.role);

  if (!canAssignCoreAccessLevel(input.actorAccess, nextAccessLevel)) {
    throw new Error('This coordinator account cannot assign the requested account scope.');
  }

  const school = await getSchoolContext(input.schoolCode);

  const { data, error } = await supabase
    .from('usis_core_coordinators')
    .insert([
      {
        division_code: school.division_code || school.division || null,
        school_id: school.id,
        employee_id: input.employeeId.trim() || null,
        region_code: school.region_code || school.region || null,
        username: normalizeIdentity(input.username),
        email: resolveCoreEmail(input.username),
        password_hash: input.password.trim(),
        first_name: normalizeName(input.firstName),
        last_name: normalizeName(input.lastName),
        middle_name: normalizeName(input.middleName) || null,
        mobile_no: input.mobileNo.trim() || null,
        role: nextRole,
        access_level: nextAccessLevel,
        is_super_admin: false,
        is_active: true,
      },
    ])
    .select('id')
    .single();

  if (error) {
    throw new Error(formatDbError(error, 'Unable to create the USIS core coordinator credential.'));
  }

  return data.id as string;
};

export const createElectionCoordinatorCredential = async (input: CreateElectionCredentialInput) => {
  if (input.allSchoolCodes?.length) {
    for (const schoolCode of input.allSchoolCodes) {
      await createElectionCoordinatorCredential({
        ...input,
        allSchoolCodes: undefined,
        electionId: '',
        schoolCode,
      });
    }
    return;
  }

  const school = await getSchoolContext(input.schoolCode);
  let electionQuery = supabase
    .from('election_events')
    .select('id, election_code')
    .eq('school_id', school.id);

  if (input.electionId) {
    electionQuery = electionQuery.eq('id', input.electionId);
  } else if (input.registrationCode) {
    electionQuery = electionQuery.eq('registration_code', input.registrationCode);
  } else if (input.electionCode) {
    electionQuery = electionQuery.eq('election_code', input.electionCode);
  }

  const { data: electionEvent, error: electionError } = await electionQuery.maybeSingle();

  if (electionError) {
    throw new Error('Unable to load the selected election event.');
  }

  if (!electionEvent?.id) {
    throw new Error('Select a valid election event before creating an election coordinator credential.');
  }

  const permissions = parsePermissions(input.permissions);

  const { error } = await supabase.from('election_coordinators').insert([
    {
      school_id: school.id,
      election_id: electionEvent.id,
      election_code: electionEvent.election_code,
      employee_id: input.employeeId.trim() || null,
      username: normalizeIdentity(input.username),
      email: normalizeIdentity(input.email),
      password_hash: input.password.trim(),
      password_plain: input.password.trim(),
      first_name: normalizeName(input.firstName),
      last_name: normalizeName(input.lastName),
      middle_name: normalizeName(input.middleName) || null,
      mobile_no: input.mobileNo.trim() || null,
      role: input.role,
      permissions: {
        permissions,
        provisioned_by: 'coordinator_portal',
        subsystem: 'election',
      },
      is_active: true,
    },
  ]);

  if (error) {
    throw new Error(formatDbError(error, 'Unable to create the election coordinator credential.'));
  }
};

export const updateCoreCoordinatorCredential = async (input: UpdateCoreCredentialInput) => {
  const school = await getSchoolContext(input.schoolCode);
  const moduleScopedRole = input.role === 'registrar_coordinator' || input.role === 'attendance_coordinator';
  const nextAccessLevel = 'school';
  const nextRole = moduleScopedRole
    ? resolvePersistedCoreRole(input.role)
    : getDefaultCoreRoleForAccessLevel(nextAccessLevel, input.role);

  if (!canAssignCoreAccessLevel(input.actorAccess, nextAccessLevel)) {
    throw new Error('This coordinator account cannot assign the requested account scope.');
  }

  const updatePayload: Record<string, unknown> = {
    division_code: school.division_code || school.division || null,
    school_id: school.id,
    employee_id: input.employeeId.trim() || null,
    region_code: school.region_code || school.region || null,
    username: normalizeIdentity(input.username),
    email: resolveCoreEmail(input.username),
    first_name: normalizeName(input.firstName),
    last_name: normalizeName(input.lastName),
    middle_name: normalizeName(input.middleName) || null,
    mobile_no: input.mobileNo.trim() || null,
    role: nextRole,
    access_level: nextAccessLevel,
    is_super_admin: false,
    is_active: input.isActive,
  };

  if (input.password?.trim()) {
    updatePayload.password_hash = input.password.trim();
  }

  const { error } = await supabase
    .from('usis_core_coordinators')
    .update(updatePayload)
    .eq('id', input.id);

  if (error) {
    throw new Error(formatDbError(error, 'Unable to update the USIS core coordinator credential.'));
  }
};

export const updateElectionCoordinatorCredential = async (input: UpdateElectionCredentialInput) => {
  const school = await getSchoolContext(input.schoolCode);
  let electionQuery = supabase
    .from('election_events')
    .select('id, election_code')
    .eq('school_id', school.id);

  if (input.electionId) {
    electionQuery = electionQuery.eq('id', input.electionId);
  } else if (input.registrationCode) {
    electionQuery = electionQuery.eq('registration_code', input.registrationCode);
  } else if (input.electionCode) {
    electionQuery = electionQuery.eq('election_code', input.electionCode);
  }

  const { data: electionEvent, error: electionError } = await electionQuery.maybeSingle();

  if (electionError) {
    throw new Error('Unable to load the selected election event.');
  }

  if (!electionEvent?.id) {
    throw new Error('Select a valid election event before updating an election coordinator credential.');
  }

  const updatePayload: Record<string, unknown> = {
    school_id: school.id,
    election_id: electionEvent.id,
    election_code: electionEvent.election_code,
    employee_id: input.employeeId.trim() || null,
    username: normalizeIdentity(input.username),
    email: normalizeIdentity(input.email),
    first_name: normalizeName(input.firstName),
    last_name: normalizeName(input.lastName),
    middle_name: normalizeName(input.middleName) || null,
    mobile_no: input.mobileNo.trim() || null,
    role: input.role,
    permissions: {
      permissions: parsePermissions(input.permissions),
      provisioned_by: 'coordinator_portal',
      subsystem: 'election',
    },
    is_active: input.isActive,
  };

  if (input.password?.trim()) {
    updatePayload.password_hash = input.password.trim();
    updatePayload.password_plain = input.password.trim();
  }

  const { error } = await supabase
    .from('election_coordinators')
    .update(updatePayload)
    .eq('id', input.id);

  if (error) {
    throw new Error(formatDbError(error, 'Unable to update the election coordinator credential.'));
  }
};

export const deleteCoreCoordinatorCredential = async (id: string) => {
  const { error } = await supabase.from('usis_core_coordinators').delete().eq('id', id);
  if (error) {
    throw new Error(formatDbError(error, 'Unable to delete the USIS core coordinator credential.'));
  }
};

export const deleteElectionCoordinatorCredential = async (id: string) => {
  const { error } = await supabase.from('election_coordinators').delete().eq('id', id);
  if (error) {
    throw new Error(formatDbError(error, 'Unable to delete the election coordinator credential.'));
  }
};

export const deleteSpPortalCoordinatorCredential = async (id: string) => {
  const { error } = await supabase.from('sp_portal_coordinators').delete().eq('id', id);
  if (error) {
    throw new Error(formatDbError(error, 'Unable to delete the SP Portal coordinator credential.'));
  }
};
