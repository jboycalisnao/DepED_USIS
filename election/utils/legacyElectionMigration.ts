import { supabase } from '../lib/supabase';
import { ElectionConfig, LegacyMigrationResult } from '../types';
import {
  getLegacyCoordinatorSeed,
  getStoredElectionRegistrationContext,
  resolveElectionContext,
} from './electionSchemaContext';

type MigrationArgs = {
  config: ElectionConfig;
  schoolYearId: string;
};

const DEFAULT_SCHOOL_DIVISION = 'Schools Division of Iloilo';
const DEFAULT_SCHOOL_REGION = 'Region VI - Western Visayas';

const ensureSchool = async (
  schoolCode: string,
  schoolName: string,
  division: string,
  region: string,
) => {
  const normalizedDivision = division.trim() || DEFAULT_SCHOOL_DIVISION;
  const normalizedRegion = region.trim() || DEFAULT_SCHOOL_REGION;

  const { data: existing, error: existingError } = await supabase
    .from('usis_schools')
    .select('id, school_code, school_name, division, region')
    .eq('school_code', schoolCode)
    .maybeSingle();

  if (existingError) throw existingError;

  const { data, error } = await supabase
    .from('usis_schools')
    .upsert([{
      school_code: schoolCode,
      school_name: schoolName,
      division: normalizedDivision,
      region: normalizedRegion,
      is_active: true,
    }], { onConflict: 'school_code' })
    .select('id, school_code, school_name, division, region')
    .single();

  if (error) throw error;
  return { record: data, created: !existing?.id };
};

const ensureCoreCoordinator = async (schoolId: string) => {
  const seed = getLegacyCoordinatorSeed();
  const { data: existing, error: existingError } = await supabase
    .from('usis_core_coordinators')
    .select('id')
    .eq('school_id', schoolId)
    .eq('username', seed.username)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing?.id) {
    return { id: existing.id, created: false };
  }

  const nameParts = seed.coordinatorName.split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || 'Election';
  const lastName = nameParts.slice(1).join(' ') || 'Coordinator';

  const { data, error } = await supabase
    .from('usis_core_coordinators')
    .insert([{
      school_id: schoolId,
      username: seed.username,
      email: seed.email,
      password_hash: seed.passwordHash,
      first_name: firstName,
      last_name: lastName,
      role: 'school_usis_coordinator',
      access_level: 'school',
      is_super_admin: false,
      is_active: true,
    }])
    .select('id')
    .single();

  if (error) throw error;
  return { id: data.id, created: true };
};

const ensureElectionEvent = async (schoolId: string, schoolYearId: string, config: ElectionConfig) => {
  const registration = getStoredElectionRegistrationContext();
  if (!registration?.electionCode) {
    throw new Error('No active election registration code found.');
  }

  const { data: existing, error: existingError } = await supabase
    .from('election_events')
    .select('id, election_code')
    .eq('school_id', schoolId)
    .eq('election_code', registration.electionCode)
    .eq('school_year_id', schoolYearId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing?.id) {
    return { id: existing.id, code: existing.election_code, created: false };
  }

  const { data, error } = await supabase
    .from('election_events')
    .insert([{
      school_id: schoolId,
      election_code: registration.electionCode,
      election_name: config.electionName || registration.electionName || 'Learner Government Election',
      election_type: registration.electionType || 'Learner Government',
      school_year_id: schoolYearId,
      status: config.status || 'OPEN',
      start_time: config.startTime,
      end_time: config.endTime,
      public_results_enabled: config.publicResultsEnabled ?? false,
      public_turnout_enabled: config.publicTurnoutEnabled ?? false,
      allowed_grade_level: config.allowedGradeLevel ?? null,
      allow_schedule_enforcement: config.status === 'SCHEDULED',
      school_display_name: config.schoolName || registration.schoolName,
      instructions: registration.notes || null,
    }])
    .select('id, election_code')
    .single();

  if (error) throw error;
  return { id: data.id, code: data.election_code, created: true };
};

const ensureElectionCoordinator = async (schoolId: string, electionId: string, electionCode: string) => {
  const seed = getLegacyCoordinatorSeed();
  const { data: existing, error: existingError } = await supabase
    .from('election_coordinators')
    .select('id')
    .eq('school_id', schoolId)
    .eq('election_id', electionId)
    .eq('username', seed.username)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing?.id) {
    return { id: existing.id, created: false };
  }

  const nameParts = seed.coordinatorName.split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || 'Election';
  const lastName = nameParts.slice(1).join(' ') || 'Coordinator';

  const { data, error } = await supabase
    .from('election_coordinators')
    .insert([{
      school_id: schoolId,
      election_id: electionId,
      election_code: electionCode,
      username: seed.username,
      email: seed.email,
      password_hash: seed.passwordHash,
      first_name: firstName,
      last_name: lastName,
      role: 'election_admin',
      permissions: ['candidate.manage', 'ballot.audit', 'settings.manage'],
      is_active: true,
    }])
    .select('id')
    .single();

  if (error) throw error;
  return { id: data.id, created: true };
};

const countAndPatchRows = async ({
  table,
  schoolYearId,
  schoolId,
  electionId,
  electionCode,
  extraPatch,
}: {
  table: 'election_candidates' | 'election_ballot_entries' | 'election_voter_participation' | 'election_partylists';
  schoolYearId: string;
  schoolId: string;
  electionId: string;
  electionCode: string;
  extraPatch?: Record<string, unknown>;
}) => {
  const { data, error } = await supabase
    .from(table)
    .select('id')
    .eq('school_year_id', schoolYearId)
    .or(`school_id.is.null,election_code.is.null,election_id.is.null`);

  if (error) throw error;
  const rows = data || [];

  if (rows.length === 0) {
    return 0;
  }

  for (const row of rows) {
    const { error: updateError } = await supabase
      .from(table)
      .update({
        school_id: schoolId,
        election_id: electionId,
        election_code: electionCode,
        ...(extraPatch || {}),
      })
      .eq('id', row.id);

    if (updateError) throw updateError;
  }

  return rows.length;
};

export const migrateLegacyElectionData = async ({
  config,
  schoolYearId,
}: MigrationArgs): Promise<LegacyMigrationResult> => {
  const registration = getStoredElectionRegistrationContext();
  if (!registration?.schoolId || !registration?.electionCode) {
    throw new Error('Complete Election Registration first before running legacy migration.');
  }

  const school = await ensureSchool(
    registration.schoolId,
    config.schoolName || registration.schoolName || 'USIS School',
    registration.schoolDivision || DEFAULT_SCHOOL_DIVISION,
    registration.schoolRegion || DEFAULT_SCHOOL_REGION,
  );
  const coreCoordinator = await ensureCoreCoordinator(school.record.id);
  const election = await ensureElectionEvent(school.record.id, schoolYearId, config);
  const electionCoordinator = await ensureElectionCoordinator(
    school.record.id,
    election.id,
    election.code,
  );

  const candidatesMigrated = await countAndPatchRows({
    table: 'election_candidates',
    schoolYearId,
    schoolId: school.record.id,
    electionId: election.id,
    electionCode: election.code,
  });

  const partylistsMigrated = await countAndPatchRows({
    table: 'election_partylists',
    schoolYearId,
    schoolId: school.record.id,
    electionId: election.id,
    electionCode: election.code,
  });

  const participationMigrated = await countAndPatchRows({
    table: 'election_voter_participation',
    schoolYearId,
    schoolId: school.record.id,
    electionId: election.id,
    electionCode: election.code,
  });

  const ballotsMigrated = await countAndPatchRows({
    table: 'election_ballot_entries',
    schoolYearId,
    schoolId: school.record.id,
    electionId: election.id,
    electionCode: election.code,
  });

  await resolveElectionContext(schoolYearId);

  return {
    schoolCreated: school.created,
    electionCreated: election.created,
    coreCoordinatorCreated: coreCoordinator.created,
    electionCoordinatorCreated: electionCoordinator.created,
    candidatesMigrated,
    ballotsMigrated,
    participationMigrated,
    partylistsMigrated,
  };
};
