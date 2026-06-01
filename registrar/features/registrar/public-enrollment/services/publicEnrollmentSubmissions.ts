import { supabase } from '../../../../lib/supabase';
import type { EnrollmentDraft, PublicEnrollmentSubmission } from '../types';

export const REGISTRAR_PUBLIC_ENROLLMENT_TABLE = 'registrar_public_enrollment_submissions';

type CreateSubmissionResult = {
  id: string;
  submissionReferenceId?: string;
};

export type PublicEnrollmentSubmissionMutation = {
  submission_reference_id?: string | null;
  school_id: string | null;
  school_year: string | null;
  lrn: string | null;
  last_name: string | null;
  first_name: string | null;
  middle_name: string | null;
  grade_to_enroll: string | null;
  guardian_contact: string | null;
  payload: EnrollmentDraft;
};

const buildSubmissionReferenceId = () => {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `USIS-ENR-${yyyy}${mm}${dd}-${rand}`;
};

export async function createPublicEnrollmentSubmission(draft: EnrollmentDraft): Promise<CreateSubmissionResult> {
  const submissionReferenceId = buildSubmissionReferenceId();
  const payload = {
    submission_reference_id: submissionReferenceId,
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

  const { data, error } = await supabase
    .from(REGISTRAR_PUBLIC_ENROLLMENT_TABLE)
    .insert(payload)
    .select('id,submission_reference_id')
    .single();

  if (error) {
    throw error;
  }

  const createdId = String(data.id);
  try {
    await fetch('/api/enrollment-email-queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionId: createdId }),
    });
  } catch {
    // Keep submission flow non-blocking if email queue endpoint is unavailable.
  }

  return { id: createdId, submissionReferenceId: String((data as any).submission_reference_id || submissionReferenceId) };
}

export async function fetchPublicEnrollmentSubmissions(limit = 500): Promise<PublicEnrollmentSubmission[]> {
  const { data, error } = await supabase
    .from(REGISTRAR_PUBLIC_ENROLLMENT_TABLE)
    .select('id,submission_reference_id,created_at,school_id,school_year,lrn,last_name,first_name,middle_name,grade_to_enroll,guardian_contact,payload')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data || []) as PublicEnrollmentSubmission[];
}

export async function fetchPublicEnrollmentSubmissionById(id: string): Promise<PublicEnrollmentSubmission | null> {
  const { data, error } = await supabase
    .from(REGISTRAR_PUBLIC_ENROLLMENT_TABLE)
    .select('id,submission_reference_id,created_at,school_id,school_year,lrn,last_name,first_name,middle_name,grade_to_enroll,guardian_contact,payload')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data || null) as PublicEnrollmentSubmission | null;
}

export async function createPublicEnrollmentSubmissionRecord(input: PublicEnrollmentSubmissionMutation): Promise<CreateSubmissionResult> {
  const { data, error } = await supabase
    .from(REGISTRAR_PUBLIC_ENROLLMENT_TABLE)
    .insert(input)
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  const createdId = String(data.id);
  try {
    await fetch('/api/enrollment-email-queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionId: createdId }),
    });
  } catch {
    // Keep submission creation non-blocking if queue endpoint is unavailable.
  }

  return { id: createdId };
}

export async function updatePublicEnrollmentSubmissionRecord(
  id: string,
  input: PublicEnrollmentSubmissionMutation
): Promise<void> {
  const { error } = await supabase
    .from(REGISTRAR_PUBLIC_ENROLLMENT_TABLE)
    .update(input)
    .eq('id', id);

  if (error) {
    throw error;
  }
}

export async function deletePublicEnrollmentSubmissionRecord(id: string): Promise<void> {
  const { data, error } = await supabase
    .from(REGISTRAR_PUBLIC_ENROLLMENT_TABLE)
    .delete()
    .eq('id', id)
    .select('id,school_id');

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    const mismatchError = new Error(`Delete blocked: no matching submission found for id "${id}".`);
    (mismatchError as any).code = 'NO_ROWS_DELETED';
    throw mismatchError;
  }
}
