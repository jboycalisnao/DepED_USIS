import { supabase } from '../../../lib/supabase';
import type { EnrollmentDraft } from '../types';

const REGISTRAR_PUBLIC_ENROLLMENT_TABLE = 'registrar_public_enrollment_submissions';

const buildSubmissionReferenceId = () => {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `USIS-ENR-${yyyy}${mm}${dd}-${rand}`;
};

export async function createPublicEnrollmentSubmission(draft: EnrollmentDraft): Promise<{ id: string; submissionReferenceId: string }> {
  const submissionReferenceId = buildSubmissionReferenceId();
  const normalizedLrn = String(draft.lrn || '').trim();
  const normalizedSchoolYear = String(draft.schoolYear || '').trim();

  if (normalizedLrn && normalizedSchoolYear) {
    const { data: existingSubmission, error: duplicateCheckError } = await supabase
      .from(REGISTRAR_PUBLIC_ENROLLMENT_TABLE)
      .select('id')
      .eq('lrn', normalizedLrn)
      .eq('school_year', normalizedSchoolYear)
      .limit(1)
      .maybeSingle();

    if (duplicateCheckError) throw duplicateCheckError;
    if (existingSubmission?.id) {
      throw new Error(
        `A submission for LRN ${normalizedLrn} already exists for School Year ${normalizedSchoolYear}. Please approach the enrollment help desk for assistance.`,
      );
    }
  }

  const payload = {
    submission_reference_id: submissionReferenceId,
    school_id: draft.schoolId || null,
    school_year: normalizedSchoolYear || null,
    lrn: normalizedLrn || null,
    last_name: draft.lastName?.trim() ? draft.lastName.trim() : null,
    first_name: draft.firstName?.trim() ? draft.firstName.trim() : null,
    middle_name: draft.middleName?.trim() ? draft.middleName.trim() : null,
    grade_to_enroll: draft.gradeToEnroll || null,
    guardian_contact: draft.guardianContact?.trim() ? draft.guardianContact.trim() : null,
    payload: draft,
  };

  const { data, error } = await supabase
    .from(REGISTRAR_PUBLIC_ENROLLMENT_TABLE)
    .insert(payload)
    .select('id,submission_reference_id')
    .single();
  if (error) throw error;
  return {
    id: String(data.id),
    submissionReferenceId: String((data as any).submission_reference_id || submissionReferenceId),
  };
}
