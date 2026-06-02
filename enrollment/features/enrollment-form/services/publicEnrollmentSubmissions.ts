import { supabase } from '../../../lib/supabase';
import type { EnrollmentDraft } from '../types';

const REGISTRAR_PUBLIC_ENROLLMENT_TABLE = 'registrar_public_enrollment_submissions';
const REGISTRAR_EMAIL_API_BASE = String((import.meta as any)?.env?.VITE_REGISTRAR_EMAIL_API_BASE_URL || '').trim();

export const buildDuplicateEnrollmentSubmissionMessage = (lrn: string, schoolYear: string) =>
  `A submission for LRN ${String(lrn || '').trim()} already exists for School Year ${String(schoolYear || '').trim()}. Please approach the enrollment help desk for assistance.`;

export async function findDuplicateEnrollmentSubmission(lrn: string, schoolYear: string) {
  const normalizedLrn = String(lrn || '').trim();
  const normalizedSchoolYear = String(schoolYear || '').trim();
  if (!normalizedLrn || !normalizedSchoolYear) return null;

  const { data: existingSubmission, error } = await supabase
    .from(REGISTRAR_PUBLIC_ENROLLMENT_TABLE)
    .select('id,submission_reference_id,created_at')
    .eq('lrn', normalizedLrn)
    .eq('school_year', normalizedSchoolYear)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return existingSubmission || null;
}

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
    const existingSubmission = await findDuplicateEnrollmentSubmission(normalizedLrn, normalizedSchoolYear);
    if (existingSubmission?.id) {
      throw new Error(buildDuplicateEnrollmentSubmissionMessage(normalizedLrn, normalizedSchoolYear));
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
  const createdId = String(data.id);

  const triggerConfirmationEmail = async (submissionId: string) => {
    const targets: string[] = [];
    if (REGISTRAR_EMAIL_API_BASE) {
      const base = REGISTRAR_EMAIL_API_BASE.replace(/\/+$/, '');
      targets.push(`${base}/api/enrollment-email-queue`);
    } else {
      targets.push('/api/enrollment-email-queue');
    }

    let lastError = '';
    for (const target of targets) {
      try {
        const response = await fetch(target, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ submissionId }),
          keepalive: true,
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          const err = String((payload as any)?.error || 'Unable to trigger enrollment confirmation email.');
          const details = String((payload as any)?.details || '').trim();
          lastError = details ? `${err} (${details})` : err;
          continue;
        }
        return payload as { queued?: boolean; sent_immediately?: boolean; reason?: string };
      } catch (error: any) {
        lastError = String(error?.message || error || 'Network request failed');
      }
    }
    throw new Error(lastError || `Unable to trigger enrollment confirmation email. Tried: ${targets.join(', ')}`);
  };

  try {
    await triggerConfirmationEmail(createdId);
  } catch (error) {
    // Do not block submission when email relay/queue is temporarily unavailable.
    // Log diagnostic for support triage (enrollment app can still submit successfully).
    console.warn('[Enrollment] Confirmation email trigger failed:', error);
  }
  return {
    id: createdId,
    submissionReferenceId: String((data as any).submission_reference_id || submissionReferenceId),
  };
}
