import { supabase } from '@deped-usis/shared-supabase';

export interface LearnerPortalAccessRecord {
  learnerId: string;
  lrn: string;
  learnerName: string;
  username: string;
  loginStatus: string;
}

export const LEARNER_PORTAL_SESSION_KEY = 'usis_learner_portal_access';

const toTitleCase = (value: string) =>
  value
    .trim()
    .split(/[._\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');

const normalizeDisplayName = (value: string) => {
  const raw = value.trim();
  if (!raw) return '';
  if (!raw.includes(',')) {
    return raw;
  }

  const [lastNameRaw, rightSideRaw] = raw.split(',', 2);
  const lastName = (lastNameRaw || '').trim();
  const rightTokens = (rightSideRaw || '').trim().split(/\s+/).filter(Boolean);
  const firstName = rightTokens[0] || '';
  return [firstName, lastName].filter(Boolean).join(' ');
};

export const getStoredLearnerAccess = (): LearnerPortalAccessRecord | null => {
  const raw = sessionStorage.getItem(LEARNER_PORTAL_SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as LearnerPortalAccessRecord;
    return {
      ...parsed,
      learnerName: normalizeDisplayName(String(parsed.learnerName || '')),
    };
  } catch {
    return null;
  }
};

export const clearStoredLearnerAccess = () => {
  sessionStorage.removeItem(LEARNER_PORTAL_SESSION_KEY);
};

export const storeLearnerAccess = (record: LearnerPortalAccessRecord) => {
  const normalized: LearnerPortalAccessRecord = {
    ...record,
    learnerName: normalizeDisplayName(String(record.learnerName || '')),
  };
  sessionStorage.setItem(LEARNER_PORTAL_SESSION_KEY, JSON.stringify(normalized));
};

export const resolveLearnerAccess = async (username: string, password: string) => {
  const normalizedUsername = username.trim().toLowerCase();
  const normalizedPassword = password.trim();

  if (!normalizedUsername || !normalizedPassword) {
    return {
      error: 'Username and password are required.',
      record: null as LearnerPortalAccessRecord | null,
    };
  }

  const { data, error } = await supabase
    .from('registrar_learners')
    .select('id,lrn,first_name,middle_name,last_name,login_username,login_password_plain,login_status')
    .eq('login_username', normalizedUsername)
    .limit(1)
    .maybeSingle();

  if (error) {
    return {
      error: 'Unable to contact learner credential registry right now.',
      record: null as LearnerPortalAccessRecord | null,
    };
  }

  if (!data) {
    return {
      error: 'Invalid learner portal credentials.',
      record: null as LearnerPortalAccessRecord | null,
    };
  }

  const loginStatus = String(data.login_status || 'Active').trim();
  if (loginStatus.toLowerCase() !== 'active') {
    return {
      error: `Login is ${loginStatus}. Contact registrar for assistance.`,
      record: null as LearnerPortalAccessRecord | null,
    };
  }

  const validPassword = normalizedPassword === String(data.login_password_plain || '').trim();
  if (!validPassword) {
    return {
      error: 'Invalid learner portal credentials.',
      record: null as LearnerPortalAccessRecord | null,
    };
  }

  const learnerName =
    normalizeDisplayName([data.first_name, data.last_name].filter(Boolean).join(' ').trim()) ||
    toTitleCase(normalizedUsername);

  return {
    error: null,
    record: {
      learnerId: String(data.id || ''),
      lrn: String(data.lrn || ''),
      learnerName,
      username: String(data.login_username || normalizedUsername),
      loginStatus,
    } satisfies LearnerPortalAccessRecord,
  };
};
