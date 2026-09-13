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

const getStatusClassName = (exists: boolean) =>
  exists ? 'learner-microsoft-account__status is-active' : 'learner-microsoft-account__status is-not-linked';

export function MicrosoftAccountServicePage({ session }: MicrosoftAccountServicePageProps) {
  const [account, setAccount] = useState<LearnerMicrosoftAccountRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ title: string; message: string; tone: 'success' | 'danger' | 'info' } | null>(null);

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
            <h3>Account Status</h3>
          </header>

          <div className="portal-panel__body learner-microsoft-account__body">
            <div className="notice-box learner-microsoft-account__notice">
              <strong>{account?.exists ? 'Linked Account' : 'No Linked Account'}</strong>
              <span>
                {account?.exists
                  ? 'A Microsoft account is already linked to your learner record.'
                  : 'No Microsoft account is linked yet. You may create one from this service.'}
              </span>
            </div>

            <dl className="learner-microsoft-account__details" aria-label="Microsoft account details">
              <div className="learner-microsoft-account__detail learner-microsoft-account__detail--wide">
                <dt>Microsoft Email</dt>
                <dd>{account?.userPrincipalName || '-'}</dd>
              </div>
              <div className="learner-microsoft-account__detail">
                <dt>Status</dt>
                <dd>
                  <span className={getStatusClassName(Boolean(account?.exists))}>
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
