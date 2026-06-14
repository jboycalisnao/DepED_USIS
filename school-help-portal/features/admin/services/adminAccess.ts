import { supabase } from '@deped-usis/shared-supabase';
import { hasCoordinatorModuleAccessInSupabase } from '../../../../common/auth/moduleAccess';

export type HelpPortalAdminSession = {
  accountId: string;
  coordinatorName: string;
  coordinatorRole: string;
  lastLoginAt: string | null;
  schoolCode: string;
  schoolName: string;
  username: string;
};

export type HelpPortalCoordinatorRow = {
  accountId: string;
  coordinatorName: string;
  coordinatorRole: string;
  isActive: boolean;
  lastLoginAt: string | null;
  region: string;
  schoolCode: string;
  schoolName: string;
  username: string;
};

const STORAGE_KEY = 'school_help_portal_admin_session';

const toTitleCase = (value: string) =>
  value
    .trim()
    .split(/[._\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');

const toDisplayName = (firstName: unknown, middleName: unknown, lastName: unknown) => {
  const parts = [String(firstName || '').trim()];
  const middle = String(middleName || '').trim();
  if (middle) parts.push(`${middle.charAt(0).toUpperCase()}.`);
  const last = String(lastName || '').trim();
  if (last) parts.push(last);
  return parts.filter(Boolean).join(' ').trim();
};

const readSession = (): HelpPortalAdminSession | null => {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as HelpPortalAdminSession;
  } catch {
    return null;
  }
};

const writeSession = (session: HelpPortalAdminSession | null) => {
  if (typeof window === 'undefined') return;
  if (!session) {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
};

export const getStoredHelpPortalAdminSession = () => readSession();

export const clearHelpPortalAdminSession = () => writeSession(null);

export const storeHelpPortalAdminSession = (session: HelpPortalAdminSession) => writeSession(session);

export const resolveHelpPortalAdminAccess = async (username: string, password: string) => {
  const normalizedUsername = username.trim().toLowerCase();

  if (!normalizedUsername || password.trim().length < 6) {
    return { error: 'Provide a valid username and password with at least 6 characters.', session: null as HelpPortalAdminSession | null };
  }

  const sharedSelect = `
    *,
    usis_schools!inner (
      school_code,
      school_name,
      region
    )
  `;

  const { data, error } = await supabase
    .from('usis_core_coordinators')
    .select(sharedSelect)
    .eq('username', normalizedUsername)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return { error: 'No active coordinator account matches the supplied username.', session: null as HelpPortalAdminSession | null };
  }

  const validPassword = password === data.password_plain || password === data.password_hash;
  if (!validPassword) {
    return { error: 'The password did not match the coordinator record.', session: null as HelpPortalAdminSession | null };
  }

  const hasHelpDeskAccess = await hasCoordinatorModuleAccessInSupabase(String(data.id || ''), 'help_admin');
  if (!hasHelpDeskAccess) {
    return {
      error: 'This account does not have Help Desk Admin access in Integrated Admin.',
      session: null as HelpPortalAdminSession | null,
    };
  }

  const schoolRecord = Array.isArray(data.usis_schools) ? data.usis_schools[0] : data.usis_schools;

  const session: HelpPortalAdminSession = {
    accountId: String(data.id || ''),
    coordinatorName:
      toDisplayName(data.first_name, data.middle_name, data.last_name) ||
      toTitleCase(normalizedUsername),
    coordinatorRole: String(data.role || 'School USIS Coordinator'),
    lastLoginAt: data.last_login_at || null,
    schoolCode: String(schoolRecord?.school_code || ''),
    schoolName: String(schoolRecord?.school_name || 'USIS School'),
    username: normalizedUsername,
  };

  return { error: null, session };
};

export const finalizeHelpPortalAdminLogin = async (session: HelpPortalAdminSession, nextPassword?: string) => {
  const updatePayload: Record<string, unknown> = {
    last_login_at: new Date().toISOString(),
  };

  if (nextPassword?.trim()) {
    updatePayload.password_hash = nextPassword.trim();
    updatePayload.password_plain = nextPassword.trim();
  }

  const { error } = await supabase.from('usis_core_coordinators').update(updatePayload).eq('id', session.accountId);

  if (!error) return;

  const { error: upsertError } = await supabase
    .from('usis_core_coordinators')
    .upsert({ id: session.accountId, ...updatePayload }, { onConflict: 'id' });

  if (upsertError) {
    throw new Error('Unable to finalize admin login.');
  }
};

export const loadHelpPortalCoordinators = async (): Promise<HelpPortalCoordinatorRow[]> => {
  const { data, error } = await supabase
    .from('usis_core_coordinators')
    .select(
      `
        id,
        first_name,
        middle_name,
        last_name,
        username,
        role,
        is_active,
        last_login_at,
        usis_schools!inner (
          school_code,
          school_name,
          region
        )
      `,
    )
    .order('last_name', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Unable to load coordinator records.');
  }

  return (data || []).map((row: any) => {
    const schoolRecord = Array.isArray(row.usis_schools) ? row.usis_schools[0] : row.usis_schools;
    return {
      accountId: String(row.id || ''),
      coordinatorName:
        toDisplayName(row.first_name, row.middle_name, row.last_name) || toTitleCase(String(row.username || '')),
      coordinatorRole: String(row.role || 'School USIS Coordinator'),
      isActive: Boolean(row.is_active),
      lastLoginAt: row.last_login_at || null,
      region: String(schoolRecord?.region || 'Region VI - Western Visayas'),
      schoolCode: String(schoolRecord?.school_code || ''),
      schoolName: String(schoolRecord?.school_name || ''),
      username: String(row.username || ''),
    };
  });
};
