import { supabase } from '@deped-usis/shared-supabase';

const PROFILE_SETTINGS_TABLE = 'registrar_enrollment_form_schedule';
const LEARNER_TABLE = 'registrar_learners';

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

  const payload = {
    address: toText(input.fields.address) || null,
    contact_number: toText(input.fields.contactNumber) || null,
    email: toText(input.fields.email) || null,
    father_name: toText(input.fields.fatherName) || null,
    guardian_name: toText(input.fields.guardianName) || null,
    mother_name: toText(input.fields.motherName) || null,
  };

  let query = supabase.from(LEARNER_TABLE).update(payload);
  if (learnerId) {
    query = query.eq('id', learnerId);
  } else {
    query = query.eq('lrn', lrn);
  }

  const { data, error } = await query.select('id,updated_at').maybeSingle();
  if (error) throw new Error(error.message || 'Unable to update learner profile.');
  if (!data) throw new Error('No learner profile record was updated.');

  return {
    id: String((data as any)?.id || learnerId || lrn),
    updatedAt: String((data as any)?.updated_at || ''),
  };
}
