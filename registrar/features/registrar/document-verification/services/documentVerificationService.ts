import { supabase } from '../../../../lib/supabase';
import type { Student, Section } from '../../../../types';

export type DocumentVerificationRecord = {
  learner: Student;
  section: Section | null;
};

const toText = (value: unknown) => String(value || '').trim();

const mapLearner = (row: any): Student => ({
  id: toText(row.id),
  lrn: toText(row.lrn),
  loginUsername: toText(row.login_username || row.portal_username || row.username || row.lrn || ''),
  loginPassword: toText(row.login_password_plain || row.portal_password_plain || row.login_password || row.portal_password || row.password_plain || row.password || ''),
  loginStatus: toText(row.login_status || (row.is_login_active === false ? 'Disabled' : 'Active')),
  lastLoginAt: toText(row.last_login_at || ''),
  microsoftUserId: toText(row.microsoft_user_id || ''),
  microsoftUpn: toText(row.microsoft_upn || ''),
  microsoftMailNickname: toText(row.microsoft_mail_nickname || ''),
  microsoftAccountStatus: toText(row.microsoft_account_status || ''),
  microsoftLicenseSkuId: toText(row.microsoft_license_sku_id || ''),
  microsoftCreatedAt: toText(row.microsoft_created_at || ''),
  microsoftLastSyncedAt: toText(row.microsoft_last_synced_at || ''),
  firstName: toText(row.first_name || row.firstName || ''),
  lastName: toText(row.last_name || row.lastName || ''),
  middleName: toText(row.middle_name || row.middleName || ''),
  birthDate: toText(row.birth_date || row.birthDate || ''),
  gender: toText(row.gender || ''),
  address: toText(row.address || ''),
  contactNumber: toText(row.contact_number || ''),
  guardian_name: toText(row.guardian_name || ''),
  father_name: toText(row.father_name || ''),
  mother_name: toText(row.mother_name || ''),
  status: toText(row.status || 'Enrolled') as Student['status'],
  sectionId: toText(row.section_id || ''),
  schoolYear: toText(row.school_year || ''),
  isSSLG: Boolean(row.is_sslg),
  isClubOfficer: Boolean(row.is_club_officer),
  isAthlete: Boolean(row.is_athlete),
  isArtist: Boolean(row.is_artist),
  is4Ps: Boolean(row.is_4ps),
  isIndigent: Boolean(row.is_indigent),
  orgAffiliations: Array.isArray(row.org_affiliations) ? row.org_affiliations : [],
  enrollments: [],
});

const mapSection = (row: any): Section => ({
  id: toText(row.id),
  name: toText(row.name),
  gradeLevel: toText(row.grade_level) as Section['gradeLevel'],
  adviserName: toText(row.adviser_name || ''),
  strand: toText(row.strand || ''),
  schoolYearId: toText(row.school_year_id || ''),
});

export const loadDocumentVerificationRecord = async (params: { learnerId?: string; lrn?: string }) => {
  const learnerId = toText(params.learnerId);
  const lrn = toText(params.lrn);

  const learnerQueries = [
    learnerId ? supabase.from('registrar_learners').select('*').eq('id', learnerId).maybeSingle() : null,
    lrn ? supabase.from('registrar_learners').select('*').eq('lrn', lrn).maybeSingle() : null,
  ].filter(Boolean) as any[];

  let learnerRow: any = null;
  for (const query of learnerQueries) {
    const { data, error } = await query;
    if (error) {
      throw new Error(error.message || 'Unable to load document verification data.');
    }
    if (data?.id) {
      learnerRow = data;
      break;
    }
  }

  if (!learnerRow?.id) {
    return null;
  }

  const sectionId = toText(learnerRow.section_id);
  const sectionResult: { data: any; error: { message?: string } | null } = sectionId
    ? await supabase.from('registrar_sections').select('*').eq('id', sectionId).maybeSingle()
    : { data: null, error: null };
  if (sectionResult.error) {
    throw new Error(sectionResult.error.message || 'Unable to load section details.');
  }

  return {
    learner: mapLearner(learnerRow),
    section: sectionResult.data ? mapSection(sectionResult.data) : null,
  } satisfies DocumentVerificationRecord;
};
