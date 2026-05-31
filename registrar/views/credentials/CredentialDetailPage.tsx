import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TopCenterAlert from '../../components/TopCenterAlert';
import { useStore } from '../../store';
import { createResetVariantPassword } from './credentialsHelpers';
import { UsisAlertModal } from '../../../common/components/UsisAlertModal';

export default function CredentialDetailPage() {
  const { learnerId } = useParams();
  const navigate = useNavigate();
  const { learners, updateLearner } = useStore();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    action: null | 'reset' | 'delete';
    message: string;
    title: string;
  }>({ action: null, message: '', title: '' });

  const learner = useMemo(() => learners.find((row) => row.id === learnerId), [learners, learnerId]);

  const copyValue = async (value: string, label: string) => {
    const next = String(value || '').trim();
    if (!next) return setFeedback(`No ${label} available to copy.`);
    try {
      await navigator.clipboard.writeText(next);
      setFeedback(`${label} copied.`);
    } catch {
      setFeedback(`Unable to copy ${label}.`);
    }
  };

  const performResetPortalAndMicrosoft = async () => {
    if (!learner) return;
    const nextPassword = createResetVariantPassword(learner);
    setIsBusy(true);
    try {
      const localResult = await updateLearner(learner.id, { loginPassword: nextPassword, loginStatus: 'Active' });
      if (localResult?.error) {
        setFeedback(`Failed to reset learner password: ${localResult.error}`);
        return;
      }

      const msResponse = await fetch('/api/microsoft-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset-password',
          learnerId: learner.id,
          newPassword: nextPassword,
        }),
      });

      const msJson = await msResponse.json().catch(() => ({}));
      if (!msResponse.ok) {
        setFeedback(`Learner password updated, but Microsoft reset failed: ${String(msJson?.error || 'Unknown error')}`);
        return;
      }

      await updateLearner(learner.id, {
        microsoftLastSyncedAt: String(msJson?.microsoftLastSyncedAt || new Date().toISOString()),
        microsoftAccountStatus: String(msJson?.microsoftAccountStatus || learner.microsoftAccountStatus || 'Active'),
      });
      setFeedback('Learner portal password and Microsoft password reset successfully.');
    } finally {
      setIsBusy(false);
    }
  };

  const performDeleteMicrosoft = async () => {
    if (!learner) return;
    setIsBusy(true);
    try {
      const response = await fetch('/api/microsoft-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete-account',
          learnerId: learner.id,
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFeedback(`Delete failed: ${String(json?.error || 'Unknown error')}`);
        return;
      }

      await updateLearner(learner.id, {
        microsoftUserId: '',
        microsoftUpn: '',
        microsoftAccountStatus: 'Deleted',
        microsoftLastSyncedAt: String(json?.microsoftLastSyncedAt || new Date().toISOString()),
      });
      setFeedback('Microsoft account deleted and learner record synced.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleResetPortalAndMicrosoft = () => {
    if (!learner) return;
    setConfirmModal({
      action: 'reset',
      title: 'Confirm Password Reset',
      message: `Reset learner and Microsoft password for ${learner.lastName}, ${learner.firstName}?`,
    });
  };

  const handleDeleteMicrosoft = () => {
    if (!learner) return;
    setConfirmModal({
      action: 'delete',
      title: 'Confirm Microsoft Delete',
      message: `Delete Microsoft account for ${learner.lastName}, ${learner.firstName}?`,
    });
  };

  if (!learner) {
    return (
      <section className="registrar-credential-detail">
        <div className="registrar-credential-detail__panel">
          <h3>Learner Not Found</h3>
          <button type="button" className="secondary-button" onClick={() => navigate('/credentials')}>Back to Credentials</button>
        </div>
      </section>
    );
  }

  return (
    <section className="registrar-credential-detail">
      <div className="registrar-credential-detail__panel">
        <div className="registrar-credential-detail__head">
          <h3>{learner.lastName}, {learner.firstName}</h3>
          <button type="button" className="secondary-button" onClick={() => navigate('/credentials')}>Back to Credentials</button>
        </div>

        <div className="registrar-credential-detail__grid">
          <button type="button" className="registrar-credentials-page__copy-cell" onClick={() => copyValue(learner.lrn || '', 'LRN')}>
            <span>LRN: {learner.lrn}</span><span className="material-symbols-outlined">content_copy</span>
          </button>
          <button type="button" className="registrar-credentials-page__copy-cell" onClick={() => copyValue(learner.loginUsername || learner.lrn, 'Username')}>
            <span>Username: {learner.loginUsername || learner.lrn}</span><span className="material-symbols-outlined">content_copy</span>
          </button>
          <button type="button" className="registrar-credentials-page__copy-cell" onClick={() => copyValue(learner.loginPassword || '', 'Password')}>
            <span>Password: {learner.loginPassword || '-'}</span><span className="material-symbols-outlined">content_copy</span>
          </button>
          <button type="button" className="registrar-credentials-page__copy-cell" onClick={() => copyValue(learner.microsoftUpn || '', 'Microsoft Email')}>
            <span>Microsoft Email: {learner.microsoftUpn || 'Not Linked'}</span><span className="material-symbols-outlined">content_copy</span>
          </button>
        </div>

        <div className="registrar-credential-detail__actions">
          <button type="button" className="primary-button" onClick={handleResetPortalAndMicrosoft} disabled={isBusy}>
            Reset Learner + Microsoft Password
          </button>
          <button type="button" className="secondary-button" onClick={handleDeleteMicrosoft} disabled={isBusy}>
            Delete Microsoft Account
          </button>
        </div>
      </div>

      <TopCenterAlert open={!!feedback} title="Credential Detail Notice" message={feedback || ''} type="accent" onClose={() => setFeedback(null)} />
      <UsisAlertModal
        open={confirmModal.action !== null}
        title={confirmModal.title}
        message={confirmModal.message}
        tone={confirmModal.action === 'delete' ? 'danger' : 'warning'}
        confirmLabel={confirmModal.action === 'delete' ? 'Delete Account' : 'Reset Password'}
        cancelLabel="Cancel"
        onClose={() => setConfirmModal({ action: null, message: '', title: '' })}
        onConfirm={() => {
          if (confirmModal.action === 'delete') {
            void performDeleteMicrosoft();
          } else if (confirmModal.action === 'reset') {
            void performResetPortalAndMicrosoft();
          }
        }}
      />
    </section>
  );
}
