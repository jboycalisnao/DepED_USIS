import { supabase } from '../../../lib/supabase';

export type SubmissionStatusAccessRecord = {
  learnerId: string;
  lrn: string;
  fullName: string;
  username: string;
};

const LOGIN_USERNAME_FIELDS = ['portal_username', 'login_username', 'username'] as const;
const LOGIN_PASSWORD_FIELDS = [
  'portal_password_plain',
  'login_password_plain',
  'portal_password',
  'login_password',
  'password_plain',
  'password_hash',
] as const;

const normalize = (value: unknown) => String(value ?? '').trim();

export async function authenticateSubmissionStatus(
  username: string,
  password: string,
): Promise<{ record: SubmissionStatusAccessRecord | null; error: string | null }> {
  const normalizedUsername = normalize(username);
  const normalizedPassword = normalize(password);

  if (!normalizedUsername || !normalizedPassword) {
    return { record: null, error: 'Enter both username and password.' };
  }

  const { data, error } = await supabase
    .from('registrar_learners')
    .select('*')
    .or(`lrn.eq.${normalizedUsername},contact_number.eq.${normalizedUsername}`)
    .limit(50);

  if (error || !data?.length) {
    return { record: null, error: 'No learner account matched the supplied credentials.' };
  }

  const matched = data.find((row) => {
    const usernames = new Set<string>([
      normalize((row as any).lrn).toLowerCase(),
      ...LOGIN_USERNAME_FIELDS.map((field) => normalize((row as any)[field]).toLowerCase()),
    ]);
    const passwords = new Set<string>([
      ...LOGIN_PASSWORD_FIELDS.map((field) => normalize((row as any)[field])),
      normalize((row as any).birth_date),
    ]);
    return usernames.has(normalizedUsername.toLowerCase()) && passwords.has(normalizedPassword);
  });

  if (!matched) {
    return { record: null, error: 'No learner account matched the supplied credentials.' };
  }

  return {
    record: {
      learnerId: normalize((matched as any).id),
      lrn: normalize((matched as any).lrn),
      fullName: (() => {
        const lastName = normalize((matched as any).last_name);
        const firstName = normalize((matched as any).first_name);
        const middleName = normalize((matched as any).middle_name);
        const firstMiddle = [firstName, middleName].filter(Boolean).join(' ');
        if (lastName && firstMiddle) return `${lastName}, ${firstMiddle}`;
        return lastName || firstMiddle || normalize((matched as any).lrn);
      })(),
      username: normalizedUsername,
    },
    error: null,
  };
}
