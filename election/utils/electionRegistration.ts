import { ElectionRegistrationRecord } from '../types';
import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'usis_active_election_registration';
const ACCESS_STORAGE_KEY = 'usis_election_registration_access';
const DEFAULT_SCHOOL_DIVISION = 'Schools Division of Iloilo';
const DEFAULT_SCHOOL_REGION = 'Region VI - Western Visayas';

export const TEMP_ELECTION_REGISTRATION_CREDENTIALS = {
  password: 'Usis2026!',
  username: 'election.coordinator',
};

const toTitleCase = (value: string) =>
  value
    .trim()
    .split(/[._\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');

export const getStoredElectionRegistration = (): ElectionRegistrationRecord | null => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as ElectionRegistrationRecord;
  } catch {
    return null;
  }
};

export const storeElectionRegistration = (record: ElectionRegistrationRecord) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
};

export const getStoredElectionRegistrationAccess = () => {
  const raw = sessionStorage.getItem(ACCESS_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as {
      coordinatorName: string;
      coordinatorRole: string;
      coordinatorSchoolAffiliation: string;
      schoolAddress: string;
      schoolDivision?: string;
      schoolId: string;
      schoolName: string;
      schoolRegion?: string;
    };
  } catch {
    return null;
  }
};

export const storeElectionRegistrationAccess = (value: {
  coordinatorName: string;
  coordinatorRole: string;
  coordinatorSchoolAffiliation: string;
  schoolAddress: string;
  schoolDivision?: string;
  schoolId: string;
  schoolName: string;
  schoolRegion?: string;
}) => {
  sessionStorage.setItem(ACCESS_STORAGE_KEY, JSON.stringify(value));
};

export const clearElectionRegistrationAccess = () => {
  sessionStorage.removeItem(ACCESS_STORAGE_KEY);
};

export const normalizeElectionCode = (value: string) => value.trim().toUpperCase();

export const resolveElectionRegistrationAccess = async (
  username: string,
  password: string,
  fallbackSchoolName: string,
) => {
  const normalizedUsername = username.trim().toLowerCase();

  if (!normalizedUsername || password.trim().length < 6) {
    return {
      error: 'Provide a valid username and password with at least 6 characters.',
      record: null,
    };
  }

  const { data, error } = await supabase
    .from('election_coordinators')
    .select(`
      *,
      usis_schools!inner (
        school_code,
        school_name,
        address_line,
        municipality_city,
        province,
        division,
        region
      )
    `)
    .eq('username', normalizedUsername)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (error) {
    return {
      error: 'Unable to contact the coordinator registry in Supabase.',
      record: null,
    };
  }

  const coordinatorRecord: any = data;
  const plainPassword = coordinatorRecord?.password_plain;
  const fallbackPassword = coordinatorRecord?.password_hash;

  if (!coordinatorRecord) {
    return {
      error: 'No active election coordinator account matches the supplied username.',
      record: null,
    };
  }

  if (password !== plainPassword && password !== fallbackPassword) {
    return {
      error: 'The Supabase coordinator credentials do not match the stored account.',
      record: null,
    };
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
    error: null,
    record: {
      coordinatorName: [coordinatorRecord.first_name, coordinatorRecord.middle_name, coordinatorRecord.last_name]
        .filter(Boolean)
        .join(' ') || toTitleCase(normalizedUsername),
      coordinatorRole: coordinatorRecord.role || 'Election Coordinator',
      coordinatorSchoolAffiliation: schoolRecord?.school_name || fallbackSchoolName,
      schoolAddress: schoolAddress || 'School address not yet configured in the coordinator registry.',
      schoolDivision:
        schoolRecord?.division ||
        DEFAULT_SCHOOL_DIVISION,
      schoolId: schoolRecord?.school_code || '',
      schoolName: schoolRecord?.school_name || fallbackSchoolName,
      schoolRegion:
        schoolRecord?.region ||
        DEFAULT_SCHOOL_REGION,
    },
  };
};

export const generateElectionCode = (schoolYearLabel: string) => {
  const yearSegment = (schoolYearLabel.match(/\d{4}/)?.[0] || new Date().getFullYear().toString()).slice(-2);
  const token = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ELEC-${yearSegment}-${token}`;
};
