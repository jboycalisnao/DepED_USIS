import { supabase } from '../../../../packages/shared-supabase/src';

export interface CoordinatorAccessRecord {
  accountSource: 'election_coordinators' | 'sp_portal_coordinators' | 'usis_core_coordinators';
  accessLevel: string;
  coordinatorName: string;
  coordinatorRole: string;
  division: string;
  divisionCode: string;
  isSuperAdmin: boolean;
  region: string;
  regionCode: string;
  schoolAddress: string;
  schoolId: string;
  schoolName: string;
  schoolUuid: string;
  userId: string;
  lastLoginAt: string | null;
  mustResetPassword: boolean;
}

export const COORDINATOR_ACCESS_STORAGE_KEY = 'usis_coordinator_portal_access';

export const getStoredCoordinatorAccess = (): CoordinatorAccessRecord | null => {
  const raw = sessionStorage.getItem(COORDINATOR_ACCESS_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as CoordinatorAccessRecord;
  } catch {
    return null;
  }
};

export const storeCoordinatorAccess = (value: CoordinatorAccessRecord) => {
  sessionStorage.setItem(COORDINATOR_ACCESS_STORAGE_KEY, JSON.stringify(value));
};

export const clearStoredCoordinatorAccess = () => {
  sessionStorage.removeItem(COORDINATOR_ACCESS_STORAGE_KEY);
};

const toTitleCase = (value: string) =>
  value
    .trim()
    .split(/[._\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');

const isMissingRelationError = (error: { code?: string; message?: string } | null) =>
  error?.code === '42P01' || error?.message?.includes('sp_portal_coordinators');

export const resolveCoordinatorAccess = async (
  username: string,
  password: string,
) => {
  const normalizedUsername = username.trim().toLowerCase();

  if (!normalizedUsername || password.trim().length < 6) {
    return {
      error: 'Provide a valid username and password with at least 6 characters.',
      record: null,
    };
  }

  const sharedSelect = `
    *,
    usis_schools!inner (
      id,
      school_code,
      school_name,
      address_line,
      municipality_city,
      province,
      division,
      region,
      division_code,
      region_code
    )
  `;

  const [coreResponse, electionResponse, spPortalResponse] = await Promise.all([
    supabase
      .from('usis_core_coordinators')
      .select(sharedSelect)
      .eq('username', normalizedUsername)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('election_coordinators')
      .select(sharedSelect)
      .eq('username', normalizedUsername)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('sp_portal_coordinators')
      .select(sharedSelect)
      .eq('username', normalizedUsername)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle(),
  ]);

  if (coreResponse.error || electionResponse.error || (spPortalResponse.error && !isMissingRelationError(spPortalResponse.error))) {
    return {
      error: 'Unable to contact the coordinator registry in Supabase.',
      record: null,
    };
  }

  const resolveRecord = (
    coordinatorRecord: any,
    accountSource: CoordinatorAccessRecord['accountSource'],
  ): CoordinatorAccessRecord | null => {
    if (!coordinatorRecord) {
      return null;
    }

    const validPassword =
      password === coordinatorRecord?.password_plain || password === coordinatorRecord?.password_hash;

    if (!validPassword) {
      return null;
    }

    const schoolRecord = Array.isArray(coordinatorRecord.usis_schools)
      ? coordinatorRecord.usis_schools[0]
      : coordinatorRecord.usis_schools;

    const schoolAddress = [
      schoolRecord?.address_line,
      schoolRecord?.municipality_city,
      schoolRecord?.province,
    ]
      .filter(Boolean)
      .join(', ');

    return {
      accountSource,
      coordinatorName:
        [coordinatorRecord.first_name, coordinatorRecord.middle_name, coordinatorRecord.last_name]
          .filter(Boolean)
          .join(' ') || toTitleCase(normalizedUsername),
      coordinatorRole:
        coordinatorRecord.role ||
        (accountSource === 'usis_core_coordinators'
          ? 'School USIS Coordinator'
          : accountSource === 'sp_portal_coordinators'
            ? 'SP Portal Coordinator'
            : 'Election Coordinator'),
      accessLevel: 'school',
      division: schoolRecord?.division || 'Schools Division of Iloilo',
      divisionCode: schoolRecord?.division_code || schoolRecord?.division || 'SDI',
      isSuperAdmin: Boolean(coordinatorRecord.is_super_admin) || coordinatorRecord.role === 'system_admin',
      region: schoolRecord?.region || 'Region VI - Western Visayas',
      regionCode: schoolRecord?.region_code || schoolRecord?.region || 'R6',
      schoolAddress: schoolAddress || 'School address not yet configured in the coordinator registry.',
      schoolId: schoolRecord?.school_code || '',
      schoolName: schoolRecord?.school_name || 'USIS School',
      schoolUuid: schoolRecord?.id || '',
      userId: coordinatorRecord.id,
      lastLoginAt: coordinatorRecord.last_login_at || null,
      mustResetPassword: !coordinatorRecord.last_login_at,
    } satisfies CoordinatorAccessRecord;
  };

  const resolvedRecord =
    resolveRecord(coreResponse.data, 'usis_core_coordinators') ||
    resolveRecord(spPortalResponse.data, 'sp_portal_coordinators') ||
    resolveRecord(electionResponse.data, 'election_coordinators');

  if (!resolvedRecord) {
    return {
      error: 'No active coordinator account matches the supplied username and password.',
      record: null,
    };
  }

  return {
    error: null,
    record: resolvedRecord,
  };
};

export const finalizeCoordinatorLogin = async (
  access: CoordinatorAccessRecord,
  nextPassword?: string,
) => {
  const tableBySource: Record<CoordinatorAccessRecord['accountSource'], string> = {
    election_coordinators: 'election_coordinators',
    sp_portal_coordinators: 'sp_portal_coordinators',
    usis_core_coordinators: 'usis_core_coordinators',
  };

  const updatePayload: Record<string, unknown> = {
    last_login_at: new Date().toISOString(),
  };

  if (nextPassword?.trim()) {
    updatePayload.password_hash = nextPassword.trim();
    if (access.accountSource !== 'usis_core_coordinators') {
      updatePayload.password_plain = nextPassword.trim();
    }
  }

  const { error } = await supabase
    .from(tableBySource[access.accountSource])
    .update(updatePayload)
    .eq('id', access.userId);

  if (!error) {
    return;
  }

  // Fallback path for environments that block PATCH preflight: use upsert (POST) for the same mutation.
  const upsertPayload = {
    id: access.userId,
    ...updatePayload,
  };

  const { error: upsertError } = await supabase
    .from(tableBySource[access.accountSource])
    .upsert(upsertPayload, { onConflict: 'id' });

  if (upsertError) {
    throw new Error('Unable to finalize coordinator login. Please try again.');
  }
};
