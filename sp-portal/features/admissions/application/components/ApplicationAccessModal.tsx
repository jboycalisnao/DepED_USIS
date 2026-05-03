import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@deped-usis/shared-supabase';
import { FloatingInput } from '@/components/ui/FloatingField';
import { storeSpPortalAdminAccess } from '@/features/admin/utils/spPortalAdminAccess';

type AccessMode = 'sign-in' | 'sign-up';

type ApplicationAccessPanelProps = {
  allowSignUp: boolean;
  schoolId: string;
  schoolName: string;
  onAccessGranted: (email: string) => void;
};

type LocalAccount = {
  email: string;
  password: string;
  createdAt: string;
};

type SeededCredentialAccess =
  | { type: 'admin'; email: string; name: string; role: string; schoolUuid: string }
  | { type: 'applicant' }
  | null;

const localAccountKey = 'sp_portal_local_accounts';

function readLocalAccounts() {
  return JSON.parse(localStorage.getItem(localAccountKey) || '[]') as LocalAccount[];
}

function saveLocalAccount(account: LocalAccount) {
  const accounts = readLocalAccounts().filter((item) => item.email !== account.email);
  localStorage.setItem(localAccountKey, JSON.stringify([...accounts, account]));
}

const isMissingSpPortalTable = (error: { code?: string; message?: string } | null) =>
  error?.code === '42P01' || error?.message?.includes('sp_portal_coordinators');

async function resolveSeededCredentialAccess(schoolId: string, email: string, password: string): Promise<SeededCredentialAccess> {
  const normalizedSchoolId = schoolId.trim();
  const normalizedIdentity = email.trim().toLowerCase();
  const normalizedPassword = password.trim();
  const usernameFallback = normalizedIdentity.split('@')[0] || normalizedIdentity;
  const emailSchoolCode = normalizedIdentity.match(/@(\d{6})\.local$/)?.[1] || '';
  const schoolCodes = Array.from(new Set([normalizedSchoolId, emailSchoolCode].filter(Boolean)));

  if (!normalizedSchoolId || !normalizedIdentity || normalizedPassword.length < 6) {
    return null;
  }

  const coreCredentialSelect = 'id, school_id, username, email, password_hash, role, is_super_admin';
  const spPortalCredentialSelect = 'id, school_id, username, email, password_hash, password_plain, role, is_super_admin';
  const identityFilter = `email.eq.${normalizedIdentity},username.eq.${normalizedIdentity},username.eq.${usernameFallback}`;

  const coreResponse = await supabase
    .from('usis_core_coordinators')
    .select(coreCredentialSelect)
    .eq('is_active', true)
    .or(identityFilter);

  if (coreResponse.error) {
    return null;
  }

  const hasValidPassword = (record: {
    password_hash?: string | null;
    password_plain?: string | null;
  }) => normalizedPassword === record.password_plain || normalizedPassword === record.password_hash;

  const coreRecords = coreResponse.data || [];
  const globalCoreRecord = coreRecords.find(
    (record) => hasValidPassword(record) && (Boolean(record.is_super_admin) || record.role === 'system_admin'),
  );

  if (globalCoreRecord) {
    return {
      type: 'admin',
      email: globalCoreRecord.email || normalizedIdentity,
      name: globalCoreRecord.username || usernameFallback,
      role: globalCoreRecord.role || 'system_admin',
      schoolUuid: globalCoreRecord.school_id || '',
    };
  }

  const schoolResponse = await supabase
    .from('usis_schools')
    .select('id, school_code')
    .in('school_code', schoolCodes)
    .limit(schoolCodes.length);

  if (schoolResponse.error || !schoolResponse.data?.length) {
    return null;
  }

  const allowedSchoolIds = new Set(schoolResponse.data.map((school) => school.id));

  const spPortalResponse = await supabase
      .from('sp_portal_coordinators')
      .select(spPortalCredentialSelect)
      .eq('is_active', true)
      .or(identityFilter);

  if (spPortalResponse.error && !isMissingSpPortalTable(spPortalResponse.error)) {
    return null;
  }

  const hasCoreAccess = coreRecords.some(
    (record) =>
      hasValidPassword(record) && allowedSchoolIds.has(record.school_id),
  );

  if (hasCoreAccess) {
    return { type: 'applicant' };
  }

  const hasSpPortalAccess = (spPortalResponse.data || []).some(
    (record) => hasValidPassword(record) && allowedSchoolIds.has(record.school_id),
  );

  return hasSpPortalAccess ? { type: 'applicant' } : null;
}

export function ApplicationAccessPanel({ allowSignUp, schoolId, schoolName, onAccessGranted }: ApplicationAccessPanelProps) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AccessMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeMode: AccessMode = allowSignUp ? mode : 'sign-in';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    setIsSubmitting(true);

    if (activeMode === 'sign-up' && password !== confirmPassword) {
      setFeedback('Passwords do not match.');
      setIsSubmitting(false);
      return;
    }

    if (activeMode === 'sign-up') {
      const { error } = await supabase.auth.signUp({ email, password });

      if (error) {
        saveLocalAccount({ email, password, createdAt: new Date().toISOString() });
      }

      setIsSubmitting(false);
      onAccessGranted(email);
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
    const localAccount = readLocalAccounts().find(
      (account) => account.email === normalizedEmail && account.password === password,
    );
    const seededCredentialAccess = error && !localAccount
      ? await resolveSeededCredentialAccess(schoolId, normalizedEmail, password)
      : null;

    setIsSubmitting(false);

    if (error && !localAccount && !seededCredentialAccess) {
      setFeedback('Account not found or password is incorrect.');
      return;
    }

    if (seededCredentialAccess?.type === 'admin') {
      storeSpPortalAdminAccess({
        accountSource: 'usis_core_coordinators',
        coordinatorName: seededCredentialAccess.name,
        coordinatorRole: seededCredentialAccess.role,
        isSuperAdmin: true,
        schoolId,
        schoolName,
        schoolUuid: seededCredentialAccess.schoolUuid,
      });
      navigate('/admin', { replace: true });
      return;
    }

    onAccessGranted(normalizedEmail);
  };

  return (
    <section className="application-access" aria-labelledby="application-access-title">
      <header className="application-access__header">
        <p className="page-intro__eyebrow">SP Portal Access</p>
        <h2 id="application-access-title">{allowSignUp ? 'Sign in or create an account' : 'Sign in required'}</h2>
        <p>{schoolName}</p>
      </header>

      {allowSignUp ? (
        <div className="application-access__tabs" role="tablist" aria-label="Application access mode">
          <button className={activeMode === 'sign-in' ? 'is-active' : ''} type="button" onClick={() => setMode('sign-in')}>
            Sign In
          </button>
          <button className={activeMode === 'sign-up' ? 'is-active' : ''} type="button" onClick={() => setMode('sign-up')}>
            Sign Up
          </button>
        </div>
      ) : (
        <p className="application-access__notice">Applications are closed. New account creation is not available.</p>
      )}

      <form className="application-access__form" onSubmit={handleSubmit}>
        <FloatingInput label="Email Address" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        <FloatingInput label="Password" required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        {activeMode === 'sign-up' ? (
          <FloatingInput
            label="Confirm Password"
            required
            minLength={6}
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        ) : null}
        {feedback ? <p className="application-access__feedback">{feedback}</p> : null}
        <button className="portal-button" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Processing' : activeMode === 'sign-up' ? 'Create Account' : 'Sign In'}
        </button>
      </form>
    </section>
  );
}
