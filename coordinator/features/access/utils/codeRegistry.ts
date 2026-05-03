import { supabase } from '../../../../packages/shared-supabase/src';
import type { CoordinatorAccessRecord } from '@/features/auth/utils/coordinatorAccess';
import { loadCredentialRegistrySnapshot, type RegistrySchoolContext } from './credentialRegistry';

export interface RegionCodeEntry {
  region: string;
  regionCode: string;
  schoolCount: number;
}

export interface DivisionCodeEntry {
  division: string;
  divisionCode: string;
  region: string;
  regionCode: string;
  schoolCount: number;
}

export interface RegistrationCodeEntry {
  registrationCode: string;
  registrationTargetId: string;
  registrationTargetLabel: string;
  schoolCode: string;
  schoolName: string;
  status: string;
}

export interface CodeRegistrySnapshot {
  accessibleSchools: RegistrySchoolContext[];
  divisionEntries: DivisionCodeEntry[];
  registrationEntries: RegistrationCodeEntry[];
  regionEntries: RegionCodeEntry[];
}

const normalizeCode = (value: string) => value.trim().toUpperCase();

const ensureCoreAccess = (access: CoordinatorAccessRecord) => {
  if (access.accountSource !== 'usis_core_coordinators' && !access.isSuperAdmin) {
    throw new Error('Only core coordinator accounts can manage registry codes.');
  }
};

const canManageRegionCodes = (access: CoordinatorAccessRecord) =>
  access.isSuperAdmin || access.coordinatorRole === 'system_admin';

const canManageDivisionCodes = (access: CoordinatorAccessRecord) =>
  canManageRegionCodes(access) || access.accessLevel === 'region';

const canManageElectionCodes = (access: CoordinatorAccessRecord) =>
  access.isSuperAdmin || access.accountSource === 'usis_core_coordinators';

const getScopedSchoolIds = async (access: CoordinatorAccessRecord) => {
  const snapshot = await loadCredentialRegistrySnapshot(access);
  return snapshot.accessibleSchools.map((school) => school.schoolUuid);
};

export const loadCodeRegistrySnapshot = async (
  access: CoordinatorAccessRecord,
): Promise<CodeRegistrySnapshot> => {
  const snapshot = await loadCredentialRegistrySnapshot(access);
  const regionMap = new Map<string, RegionCodeEntry>();
  const divisionMap = new Map<string, DivisionCodeEntry>();

  snapshot.accessibleSchools.forEach((school) => {
    const regionKey = `${school.region}::${school.regionCode}`;
    const divisionKey = `${school.region}::${school.division}::${school.divisionCode}`;

    const currentRegion = regionMap.get(regionKey);
    regionMap.set(regionKey, {
      region: school.region,
      regionCode: school.regionCode,
      schoolCount: (currentRegion?.schoolCount || 0) + 1,
    });

    const currentDivision = divisionMap.get(divisionKey);
    divisionMap.set(divisionKey, {
      division: school.division,
      divisionCode: school.divisionCode,
      region: school.region,
      regionCode: school.regionCode,
      schoolCount: (currentDivision?.schoolCount || 0) + 1,
    });
  });

  return {
    accessibleSchools: snapshot.accessibleSchools,
    divisionEntries: Array.from(divisionMap.values()).sort((left, right) =>
      `${left.region} ${left.division}`.localeCompare(`${right.region} ${right.division}`),
    ),
    registrationEntries: snapshot.electionEvents
      .map((event) => ({
        registrationCode: (event as typeof event & { registrationCode?: string }).registrationCode || '',
        registrationTargetId: event.id,
        registrationTargetLabel: event.electionName,
        schoolCode: event.schoolCode,
        schoolName: event.schoolName,
        status: event.status,
      }))
      .sort((left, right) =>
        `${left.schoolCode} ${left.registrationTargetLabel}`.localeCompare(
          `${right.schoolCode} ${right.registrationTargetLabel}`,
        ),
      ),
    regionEntries: Array.from(regionMap.values()).sort((left, right) => left.region.localeCompare(right.region)),
  };
};

export const updateRegionCode = async (
  access: CoordinatorAccessRecord,
  region: string,
  regionCode: string,
) => {
  ensureCoreAccess(access);
  if (!canManageRegionCodes(access)) {
    throw new Error('Only superadmin can update region codes.');
  }

  const scopedSchoolIds = await getScopedSchoolIds(access);
  const nextRegionCode = normalizeCode(regionCode);

  if (!nextRegionCode) {
    throw new Error('Provide a valid region code.');
  }

  const { error: schoolError } = await supabase
    .from('usis_schools')
    .update({ region_code: nextRegionCode })
    .in('id', scopedSchoolIds)
    .eq('region', region);

  if (schoolError) {
    throw new Error(schoolError.message || 'Unable to update the region code.');
  }

  const regionSchoolLookup = await supabase
    .from('usis_schools')
    .select('id')
    .in('id', scopedSchoolIds)
    .eq('region', region);

  if (regionSchoolLookup.error) {
    throw new Error(regionSchoolLookup.error.message || 'Unable to locate the updated region scope.');
  }

  const regionSchoolIds = (regionSchoolLookup.data || []).map((entry) => entry.id);

  if (regionSchoolIds.length === 0) {
    throw new Error('No schools matched the selected region.');
  }

  const { error: coordinatorError } = await supabase
    .from('usis_core_coordinators')
    .update({ region_code: nextRegionCode })
    .in('school_id', regionSchoolIds);

  if (coordinatorError) {
    throw new Error(coordinatorError.message || 'Unable to synchronize the region code.');
  }
};

export const updateDivisionCode = async (
  access: CoordinatorAccessRecord,
  division: string,
  divisionCode: string,
  region?: string,
) => {
  ensureCoreAccess(access);
  if (!canManageDivisionCodes(access)) {
    throw new Error('Only superadmin and regional accounts can update division codes.');
  }

  const scopedSchoolIds = await getScopedSchoolIds(access);
  const nextDivisionCode = normalizeCode(divisionCode);

  if (!nextDivisionCode) {
    throw new Error('Provide a valid division code.');
  }

  let schoolUpdate = supabase
    .from('usis_schools')
    .update({ division_code: nextDivisionCode })
    .in('id', scopedSchoolIds)
    .eq('division', division);

  if (region) {
    schoolUpdate = schoolUpdate.eq('region', region);
  }

  const { error: schoolError } = await schoolUpdate;

  if (schoolError) {
    throw new Error(schoolError.message || 'Unable to update the division code.');
  }

  const schoolLookup = await supabase
    .from('usis_schools')
    .select('id')
    .in('id', scopedSchoolIds)
    .eq('division', division);

  if (schoolLookup.error) {
    throw new Error(schoolLookup.error.message || 'Unable to locate the updated division scope.');
  }

  const divisionSchoolIds = (schoolLookup.data || []).map((entry) => entry.id);

  if (divisionSchoolIds.length === 0) {
    throw new Error('No schools matched the selected division.');
  }

  const { error: coordinatorError } = await supabase
    .from('usis_core_coordinators')
    .update({ division_code: nextDivisionCode })
    .in('school_id', divisionSchoolIds);

  if (coordinatorError) {
    throw new Error(coordinatorError.message || 'Unable to synchronize the division code.');
  }
};

export const updateRegistrationCode = async (
  access: CoordinatorAccessRecord,
  registrationTargetId: string,
  registrationCode: string,
) => {
  ensureCoreAccess(access);
  if (!canManageElectionCodes(access)) {
    throw new Error('This account cannot update registration codes.');
  }

  const nextRegistrationCode = normalizeCode(registrationCode);
  if (!nextRegistrationCode) {
    throw new Error('Provide a valid registration code.');
  }

  const scopedSchoolIds = await getScopedSchoolIds(access);
  const { data: event, error: eventError } = await supabase
    .from('election_events')
    .select('id, school_id')
    .eq('id', registrationTargetId)
    .in('school_id', scopedSchoolIds)
    .maybeSingle();

  if (eventError) {
    throw new Error(eventError.message || 'Unable to load the selected election event.');
  }

  if (!event?.id) {
    throw new Error('The selected election event is outside your current scope.');
  }

  const updates = await Promise.all([
    supabase.from('election_events').update({ registration_code: nextRegistrationCode }).eq('id', event.id),
  ]);

  const failedUpdate = updates.find((response) => response.error);
  if (failedUpdate?.error) {
    throw new Error(failedUpdate.error.message || 'Unable to update the registration code.');
  }
};

export const codeRegistryPermissions = {
  canManageDivisionCodes,
  canManageElectionCodes,
  canManageRegionCodes,
};
