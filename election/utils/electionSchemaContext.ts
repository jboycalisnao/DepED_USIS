import { supabase } from '../lib/supabase';
import { ElectionContext } from '../types';
import {
  getStoredElectionRegistration,
  getStoredElectionRegistrationAccess,
} from './electionRegistration';

const LEGACY_PASSWORD_HASH_PLACEHOLDER = 'LEGACY_MIGRATION_PENDING_RESET';

const toSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');

export const getLegacyCoordinatorSeed = () => {
  const access = getStoredElectionRegistrationAccess();
  const registration = getStoredElectionRegistration();

  const coordinatorName = access?.coordinatorName || registration?.coordinatorName || 'Election Coordinator';
  const schoolName = access?.schoolName || registration?.schoolName || 'USIS School';
  const schoolId = access?.schoolId || registration?.schoolId || 'LEGACY-SCHOOL';
  const role = access?.coordinatorRole || registration?.coordinatorRole || 'Election Coordinator';
  const username =
    access?.coordinatorName
      ? toSlug(access.coordinatorName)
      : 'election.coordinator';

  return {
    coordinatorName,
    schoolName,
    schoolId,
    role,
    username,
    email: `${username || 'election.coordinator'}@${toSlug(schoolId) || 'legacy-school'}.local`,
    passwordHash: LEGACY_PASSWORD_HASH_PLACEHOLDER,
  };
};

export const resolveElectionContext = async (schoolYearId: string): Promise<ElectionContext | null> => {
  const registration = getStoredElectionRegistration();
  if (!registration?.schoolId || !registration?.electionCode || !schoolYearId) {
    return null;
  }

  const { data: school, error: schoolError } = await supabase
    .from('usis_schools')
    .select('id, school_code, school_name')
    .eq('school_code', registration.schoolId)
    .maybeSingle();

  if (schoolError || !school?.id) {
    return null;
  }

  const { data: election, error: electionError } = await supabase
    .from('election_events')
    .select('id, election_code, school_year_id')
    .eq('school_id', school.id)
    .eq('election_code', registration.electionCode)
    .eq('school_year_id', schoolYearId)
    .maybeSingle();

  if (electionError || !election?.id) {
    return null;
  }

  return {
    schoolId: school.id,
    schoolCode: school.school_code,
    schoolName: school.school_name,
    electionId: election.id,
    electionCode: election.election_code,
    schoolYearId: election.school_year_id,
  };
};

export const getStoredElectionRegistrationContext = () => getStoredElectionRegistration();

