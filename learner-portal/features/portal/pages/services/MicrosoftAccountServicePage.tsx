import { useEffect, useState } from 'react';
import type { LearnerPortalAccessRecord } from '../../../auth/services/learnerAccess';
import {
  createLearnerMicrosoftAccount,
  fetchLearnerMicrosoftAccount,
  type LearnerMicrosoftAccountRecord,
} from '../../services/learnerMicrosoftAccountService';
import UsisPageLoader from '../../../../../common/components/UsisPageLoader';
import { UsisAlertModal } from '../../../../../common/components/UsisAlertModal';

type MicrosoftAccountServicePageProps = {
  session: LearnerPortalAccessRecord;
};

const formatDate = (value: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const getStatusClassName = (status: string, exists: boolean) => {
  const norm = (status || '').toLowerCase();
  if (norm === 'deleted') return 'learner-microsoft-account__status is-deleted';
  if (exists || norm === 'active') return 'learner-microsoft-account__status is-active';
  return 'learner-microsoft-account__status is-not-linked';
};

export function MicrosoftAccountServicePage({ session }: MicrosoftAccountServicePageProps) {
  const [account, setAccount] = useState<LearnerMicrosoftAccountRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingLive, setIsCheckingLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ title: string; message: string; tone: 'success' | 'danger' | 'info' } | null>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isEmailCopied, setIsEmailCopied] = useState(false);

  const refresh = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchLearnerMicrosoftAccount({ learnerId: session.learnerId, lrn: session.lrn });
      setAccount(result);
    } catch (loadError: any) {
      setError(loadError?.message || 'Unable to load Microsoft account status.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshStatus = async () => {
    setIsCheckingLive(true);
    try {
      const result = await fetchLearnerMicrosoftAccount({
        learnerId: session.learnerId,
        lrn: session.lrn,
        refresh: true,
      });
      setAccount(result);
      if (result.exists) {
        setAlert({
          title: 'Account Verified',
          message: result.statusMessage || `Microsoft account (${result.userPrincipalName}) is active and exists in Microsoft 365.`,
          tone: 'success',
        });
      } else {
        setAlert({
          title: 'Account Not Found',
          message:
            result.statusMessage ||
            'No active Microsoft account was found in Microsoft 365 for this learner. The account status has been updated to reflect this.',
          tone: 'info',
        });
      }
    } catch (refreshError: any) {
      setAlert({
        title: 'Status Check Failed',
        message: refreshError?.message || 'Unable to check Microsoft account status with Microsoft 365.',
        tone: 'danger',
      });
    } finally {
      setIsCheckingLive(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [session.learnerId, session.lrn]);

  const handleCreate = async () => {
    setIsSubmitting(true);
    try {
      const result = await createLearnerMicrosoftAccount({ learnerId: session.learnerId, lrn: session.lrn });
      setAccount(result);
      setAlert({
        title: 'Microsoft Account Created',
        message: result.temporaryPassword
          ? `Account: ${result.userPrincipalName}. Temporary password: ${result.temporaryPassword}`
          : `Account: ${result.userPrincipalName}.`,
        tone: 'success',
      });
    } catch (createError: any) {
      setAlert({ title: 'Creation Failed', message: createError?.message || 'Unable to create Microsoft account.', tone: 'danger' });
      await refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordValue =
    account?.password ||
    session.loginPassword ||
    account?.temporaryPassword ||
    '';

  const handleCopyPassword = async () => {
    if (!passwordValue) return;
    try {
      await navigator.clipboard.writeText(passwordValue);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      setAlert({
        title: 'Copy Failed',
        message: 'Unable to copy password to clipboard. Please select and copy manually.',
        tone: 'info',
      });
    }
  };

  const handleCopyEmail = async () => {
    if (!account?.userPrincipalName) return;
    try {
      await navigator.clipboard.writeText(account.userPrincipalName);
      setIsEmailCopied(true);
      setTimeout(() => setIsEmailCopied(false), 2000);
    } catch {
      setAlert({
        title: 'Copy Failed',
        message: 'Unable to copy email to clipboard. Please select and copy manually.',
        tone: 'info',
      });
    }
  };

  if (isLoading) return <UsisPageLoader message="Loading Microsoft account service..." />;

  return (
    <section className="section-shell">
      <div className="portal-panel learner-tab-panel">
        <header className="portal-panel__header learner-tab-header">
          <h2>Microsoft Account</h2>
          <p>View your school Microsoft email status or create one if none is linked yet.</p>
        </header>
      </div>

      {error ? <p className="learner-services-history__state">{error}</p> : null}

      {!error ? (
        <section className="portal-panel learner-microsoft-account" aria-labelledby="learner-microsoft-account-title">
          <header className="portal-panel__header learner-microsoft-account__header">
            <h3 id="learner-microsoft-account-title">Account Status</h3>
            <button
              type="button"
              className="learner-microsoft-account__refresh-btn"
              onClick={handleRefreshStatus}
              disabled={isCheckingLive || isSubmitting}
              title="Check if this account still exists in Microsoft 365"
              aria-label="Refresh or fetch Microsoft account status"
            >
              <svg
                className={`learner-microsoft-account__refresh-icon${isCheckingLive ? ' is-spinning' : ''}`}
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.19" />
              </svg>
              <span>{isCheckingLive ? 'Checking Status...' : 'Fetch Status'}</span>
            </button>
          </header>

          <div className="portal-panel__body learner-microsoft-account__body">
            <div className="notice-box learner-microsoft-account__notice">
              <strong>
                {account?.exists
                  ? 'Linked Account'
                  : account?.microsoftAccountStatus === 'Deleted'
                  ? 'Account Not Found / Deleted'
                  : 'No Linked Account'}
              </strong>
              <span>
                {account?.exists
                  ? 'A Microsoft account is already linked to your learner record.'
                  : account?.microsoftAccountStatus === 'Deleted'
                  ? 'This Microsoft account was deleted or no longer exists in Microsoft 365. You may create a new one below.'
                  : 'No Microsoft account is linked yet. You may create one from this service.'}
              </span>
            </div>

            <dl className="learner-microsoft-account__details" aria-label="Microsoft account details">
              <div className="learner-microsoft-account__detail learner-microsoft-account__detail--wide">
                <dt>Microsoft Email</dt>
                <dd className="learner-microsoft-account__email-row">
                  <span className="learner-microsoft-account__email-text">{account?.userPrincipalName || '-'}</span>
                  {account?.userPrincipalName ? (
                    <button
                      type="button"
                      className={`learner-microsoft-account__copy-email-btn${isEmailCopied ? ' is-copied' : ''}`}
                      onClick={handleCopyEmail}
                      title="Copy email address"
                      aria-label="Copy email address"
                    >
                      {isEmailCopied ? (
                        <>
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  ) : null}
                </dd>
              </div>
              <div className="learner-microsoft-account__detail">
                <dt>Status</dt>
                <dd>
                  <span className={getStatusClassName(account?.microsoftAccountStatus || '', Boolean(account?.exists))}>
                    {account?.microsoftAccountStatus || 'Not Linked'}
                  </span>
                </dd>
              </div>
              <div className="learner-microsoft-account__detail">
                <dt>Created</dt>
                <dd>{formatDate(account?.microsoftCreatedAt || '')}</dd>
              </div>
              <div className="learner-microsoft-account__detail">
                <dt>Last Sync</dt>
                <dd>{formatDate(account?.microsoftLastSyncedAt || '')}</dd>
              </div>
            </dl>

            <div className="learner-microsoft-password-card" role="region" aria-label="Account password notice">
              <div className="learner-microsoft-password-card__header">
                <div className="learner-microsoft-password-card__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <div className="learner-microsoft-password-card__text">
                  <h4 className="learner-microsoft-password-card__title">Account Password Information</h4>
                  <p className="learner-microsoft-password-card__desc">
                    Your Microsoft account password is the same password as your USIS account password. Use this password when signing in to Microsoft Office 365, Teams, and Outlook.
                  </p>
                </div>
              </div>

              <div className="learner-password-reveal">
                <label htmlFor="microsoft-account-password" className="learner-password-reveal__label">
                  Account Password
                </label>
                <div className="learner-password-reveal__control">
                  <div className="learner-password-reveal__input-wrap">
                    <input
                      id="microsoft-account-password"
                      type={isPasswordVisible ? 'text' : 'password'}
                      readOnly
                      value={passwordValue}
                      placeholder={passwordValue ? undefined : 'Password not available'}
                      className="learner-password-reveal__input"
                      aria-label="Account password"
                    />
                    <button
                      type="button"
                      className="learner-password-reveal__toggle-btn"
                      onClick={() => setIsPasswordVisible((prev) => !prev)}
                      title={isPasswordVisible ? 'Hide password' : 'Show password'}
                      aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18">
                        {isPasswordVisible ? (
                          <>
                            <path d="M3 5l16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            <path d="M10.6 6.5A10.7 10.7 0 0 1 12 6.4c5.2 0 9 5.6 9 5.6a17.2 17.2 0 0 1-3.4 3.9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M14.1 14.2A3 3 0 0 1 9.8 9.9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M6.2 9A17.1 17.1 0 0 0 3 12s3.8 5.6 9 5.6c1.1 0 2.1-.2 3.1-.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </>
                        ) : (
                          <>
                            <path d="M1.8 12s4-5.8 10.2-5.8S22.2 12 22.2 12 18.2 17.8 12 17.8 1.8 12 1.8 12Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
                          </>
                        )}
                      </svg>
                    </button>
                  </div>
                  <button
                    type="button"
                    className={`learner-password-reveal__copy-btn${isCopied ? ' is-copied' : ''}`}
                    onClick={handleCopyPassword}
                    disabled={!passwordValue}
                    title="Copy password to clipboard"
                  >
                    {isCopied ? (
                      <>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {!account?.exists ? (
              <div className="form-actions learner-microsoft-account__actions">
                <button type="button" className="primary-button" onClick={handleCreate} disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Microsoft Account'}
                </button>
              </div>
            ) : null}

            {account?.created && account.temporaryPassword ? (
              <p className="notice-box learner-microsoft-account__password">
                <strong>Temporary Password</strong>
                <span>{account.temporaryPassword}</span>
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      <UsisAlertModal
        open={Boolean(alert)}
        title={alert?.title || 'Notice'}
        message={alert?.message || ''}
        tone={alert?.tone || 'info'}
        onClose={() => setAlert(null)}
      />
    </section>
  );
}
