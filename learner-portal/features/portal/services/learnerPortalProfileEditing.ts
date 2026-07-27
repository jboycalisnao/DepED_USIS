const PROFILE_SETTINGS_TABLE = 'registrar_enrollment_form_schedule';

const toText = (value: unknown) => String(value || '').trim();

export type LearnerProfileEditableFields = {
  address: string;
  contactNumber: string;
  email: string;
  fatherName: string;
  guardianName: string;
  motherName: string;
};

export async function fetchLearnerPortalProfileEditingEnabled() {
  const { supabase } = await import('@deped-usis/shared-supabase');
  const { data, error } = await supabase
    .from(PROFILE_SETTINGS_TABLE)
    .select('learner_profile_editing_enabled')
    .eq('id', 1)
    .maybeSingle();

  if (error) throw new Error(error.message || 'Unable to load learner portal profile settings.');
  return Boolean((data as any)?.learner_profile_editing_enabled);
}

export async function updateLearnerPortalProfileFields(input: {
  learnerId?: string;
  lrn?: string;
  fields: LearnerProfileEditableFields;
}) {
  const learnerId = toText(input.learnerId);
  const lrn = toText(input.lrn);

  if (!learnerId && !lrn) {
    throw new Error('Learner profile update requires a learner ID or LRN.');
  }

  const response = await fetch('/api/learner-profile', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      learnerId,
      lrn,
      fields: input.fields,
    }),
  });

  const rawText = await response.text().catch(() => '');
  let data: any = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = null;
  }

  if (!response.ok || data?.ok === false) {
    throw new Error(data?.error || data?.message || `Unable to update learner profile (${response.status}).`);
  }

  if (!data) throw new Error('No learner profile record was updated.');

  return {
    id: String(data?.id || learnerId || lrn),
    updatedAt: toText(data?.updatedAt),
  };
}
