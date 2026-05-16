import { supabase } from '../../../lib/supabase';
import type { EnrollmentDraft } from '../types';

const REGISTRAR_PUBLIC_ENROLLMENT_TABLE = 'registrar_public_enrollment_submissions';

export async function createPublicEnrollmentSubmission(draft: EnrollmentDraft): Promise<{ id: string }> {
  const payload = {
    school_id: draft.schoolId || null,
    school_year: draft.schoolYear || null,
    lrn: draft.lrn?.trim() ? draft.lrn.trim() : null,
    last_name: draft.lastName?.trim() ? draft.lastName.trim() : null,
    first_name: draft.firstName?.trim() ? draft.firstName.trim() : null,
    middle_name: draft.middleName?.trim() ? draft.middleName.trim() : null,
    grade_to_enroll: draft.gradeToEnroll || null,
    guardian_contact: draft.guardianContact?.trim() ? draft.guardianContact.trim() : null,
    payload: draft,
  };

  const { data, error } = await supabase.from(REGISTRAR_PUBLIC_ENROLLMENT_TABLE).insert(payload).select('id').single();
  if (error) throw error;
  return { id: String(data.id) };
}
