import { supabase } from '@deped-usis/shared-supabase';
import { getCachedLearnerData, resolveLearnerCacheKey, setCachedLearnerData } from './learnerPortalCache';

export type LearnerProfileRecord = {
  id: string;
  lrn: string;
  firstName: string;
  middleName: string;
  lastName: string;
  gender: string;
  birthDate: string;
  address: string;
  contactNumber: string;
  guardianName: string;
  fatherName: string;
  motherName: string;
  email: string;
  loginUsername: string;
  loginStatus: string;
  profilePhotoDriveFileId: string;
  profilePhotoMimeType: string;
  profilePhotoUpdatedAt: string;
  sectionName: string;
  gradeLevel: string;
  program: string;
  updatedAt: string;
};

const toText = (value: unknown) => String(value || '').trim();
const isMissingUpdatedAtError = (error: unknown) => {
  const message = toText((error as any)?.message || error).toLowerCase();
  return message.includes('registrar_learners.updated_at') || (message.includes('updated_at') && message.includes('does not exist'));
};

const PROFILE_SELECT_WITH_UPDATED_AT = `
  id,
  lrn,
  first_name,
  middle_name,
  last_name,
  gender,
  birth_date,
  address,
  contact_number,
  guardian_name,
  father_name,
  mother_name,
  email,
  login_username,
  login_status,
  profile_photo_drive_file_id,
  profile_photo_mime_type,
  profile_photo_updated_at,
  created_at,
  updated_at,
  section_id,
  enrollment_history,
  registrar_sections (
    id,
    name,
    grade_level,
    strand
  )
`;

const PROFILE_SELECT_LEGACY = `
  id,
  lrn,
  first_name,
  middle_name,
  last_name,
  gender,
  birth_date,
  address,
  contact_number,
  guardian_name,
  father_name,
  mother_name,
  email,
  login_username,
  login_status,
  profile_photo_drive_file_id,
  profile_photo_mime_type,
  profile_photo_updated_at,
  created_at,
  section_id,
  enrollment_history,
  registrar_sections (
    id,
    name,
    grade_level,
    strand
  )
`;

const firstNonEmpty = (values: unknown[]) => {
  for (const value of values) {
    const text = toText(value);
    if (text) return text;
  }
  return '';
};

const mapProfile = (row: any): LearnerProfileRecord => ({
  id: toText(row?.id),
  lrn: toText(row?.lrn),
  firstName: toText(row?.first_name),
  middleName: toText(row?.middle_name),
  lastName: toText(row?.last_name),
  gender: toText(row?.gender),
  birthDate: toText(row?.birth_date),
  address: toText(row?.address),
  contactNumber: toText(row?.contact_number),
  guardianName: toText(row?.guardian_name),
  fatherName: toText(row?.father_name),
  motherName: toText(row?.mother_name),
  email: toText(row?.email),
  loginUsername: toText(row?.login_username),
  loginStatus: toText(row?.login_status || 'Active'),
  profilePhotoDriveFileId: toText(row?.profile_photo_drive_file_id),
  profilePhotoMimeType: toText(row?.profile_photo_mime_type),
  profilePhotoUpdatedAt: toText(row?.profile_photo_updated_at),
  sectionName: '',
  gradeLevel: '',
  program: '',
  updatedAt: toText(row?.updated_at || row?.created_at),
});

export async function fetchLearnerProfile(input: { learnerId?: string; lrn?: string; forceRefresh?: boolean }) {
  const learnerId = toText(input.learnerId);
  const lrn = toText(input.lrn);
  const cacheKey = resolveLearnerCacheKey({ learnerId, lrn });
  const cached = getCachedLearnerData<LearnerProfileRecord>('profile', cacheKey);
  if (cached && !input.forceRefresh) return cached;

  const buildProfileQuery = (selectColumns: string) => {
    let query = supabase
      .from('registrar_learners')
      .select(selectColumns)
      .limit(1);

    if (learnerId) {
      query = query.eq('id', learnerId);
    } else if (lrn) {
      query = query.eq('lrn', lrn);
    }

    return query;
  };

  if (!learnerId && !lrn) {
    throw new Error('Learner profile lookup requires learner ID or LRN.');
  }

  let { data, error } = await buildProfileQuery(PROFILE_SELECT_WITH_UPDATED_AT).maybeSingle();
  if (error && isMissingUpdatedAtError(error)) {
    const legacyResult = await buildProfileQuery(PROFILE_SELECT_LEGACY).maybeSingle();
    data = legacyResult.data;
    error = legacyResult.error;
  }
  if (error) throw new Error(error.message || 'Unable to load learner profile right now.');
  if (!data) throw new Error('No learner profile record was found.');

  const profile = mapProfile(data);

  const sectionData = (data as any)?.registrar_sections;
  profile.sectionName = toText(sectionData?.name);
  profile.gradeLevel = toText(sectionData?.grade_level);
  profile.program = toText(sectionData?.strand);

  if (!profile.sectionName || !profile.gradeLevel || !profile.program) {
    const enrollmentHistory = Array.isArray((data as any)?.enrollment_history) ? (data as any).enrollment_history : [];
    const sortedHistory = [...enrollmentHistory].sort((a: any, b: any) =>
      toText(b?.enrollmentDate || b?.enrollment_date).localeCompare(toText(a?.enrollmentDate || a?.enrollment_date))
    );
    const latestHistory = sortedHistory.length > 0 ? sortedHistory[0] : null;
    if (latestHistory && typeof latestHistory === 'object') {
      if (!profile.sectionName) {
        profile.sectionName = firstNonEmpty([latestHistory?.section, latestHistory?.section_name, latestHistory?.sectionName]);
      }
      if (!profile.gradeLevel) {
        profile.gradeLevel = firstNonEmpty([latestHistory?.gradeLevel, latestHistory?.grade_level]);
      }
      if (!profile.program) {
        profile.program = firstNonEmpty([latestHistory?.strand, latestHistory?.program, latestHistory?.track]);
      }
    }
  }

  setCachedLearnerData('profile', cacheKey, profile);
  return profile;
}
