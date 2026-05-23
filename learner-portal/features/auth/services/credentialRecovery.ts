import { supabase } from '@deped-usis/shared-supabase';

type LearnerCredentialRecord = {
  learnerId: string;
  lrn: string;
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  status: string;
  loginStatus: string;
};

const normalizeText = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

const toRecord = (row: any): LearnerCredentialRecord => ({
  learnerId: String(row?.id || ''),
  lrn: String(row?.lrn || ''),
  firstName: String(row?.first_name || '').trim(),
  lastName: String(row?.last_name || '').trim(),
  username: String(row?.login_username || '').trim(),
  password: String(row?.login_password_plain || '').trim(),
  status: String(row?.status || '').trim(),
  loginStatus: String(row?.login_status || 'Active').trim(),
});

export async function lookupLearnerCredentialByLrn(lrn: string) {
  const normalizedLrn = String(lrn || '').trim();
  if (!normalizedLrn) {
    return { error: 'LRN is required.', record: null as LearnerCredentialRecord | null };
  }

  const { data, error } = await supabase
    .from('registrar_learners')
    .select('id,lrn,first_name,last_name,status,login_status,login_username,login_password_plain')
    .eq('lrn', normalizedLrn)
    .limit(1)
    .maybeSingle();

  if (error) {
    return {
      error: 'Unable to contact learner registry right now.',
      record: null as LearnerCredentialRecord | null,
    };
  }

  if (!data) {
    return { error: 'No learner record found for the provided LRN.', record: null as LearnerCredentialRecord | null };
  }

  const record = toRecord(data);
  const normalizedStatus = normalizeText(record.status);
  const normalizedLoginStatus = normalizeText(record.loginStatus);

  if (normalizedStatus !== 'enrolled' && normalizedStatus !== 'active') {
    return {
      error: `Learner status is ${record.status || 'Inactive'}. Credential release is only for active learners.`,
      record: null as LearnerCredentialRecord | null,
    };
  }

  if (normalizedLoginStatus !== 'active') {
    return {
      error: `Portal login status is ${record.loginStatus}. Contact registrar for assistance.`,
      record: null as LearnerCredentialRecord | null,
    };
  }

  if (!record.username || !record.password) {
    return {
      error: 'Learner credential is not yet configured. Contact registrar for setup.',
      record: null as LearnerCredentialRecord | null,
    };
  }

  return { error: null, record };
}

export function verifyLearnerNameMatch(input: { firstName: string; lastName: string }, record: LearnerCredentialRecord) {
  const firstOk = normalizeText(input.firstName) === normalizeText(record.firstName);
  const lastOk = normalizeText(input.lastName) === normalizeText(record.lastName);
  return firstOk && lastOk;
}

export type { LearnerCredentialRecord };
