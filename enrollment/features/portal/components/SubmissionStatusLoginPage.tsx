import { FormEvent, useState } from 'react';
import {
  authenticateSubmissionStatus,
  type SubmissionStatusAccessRecord,
} from '../../enrollment-form/services/submissionStatusAuth';
import { UsisLoginModal } from '../../../../common/components/UsisLoginModal';

type Props = {
  onLogin: (record: SubmissionStatusAccessRecord) => void;
};

export function SubmissionStatusLoginPage({ onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await authenticateSubmissionStatus(username, password);
      if (!result.record) {
        setError(result.error || 'Unable to access submission status.');
        return;
      }
      onLogin(result.record);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="page-frame enrollment-public-enrollment">
      <div className="content-width">
        <section className="section-shell">
          <UsisLoginModal
            title="Submission Status Login"
            username={username}
            password={password}
            isSubmitting={isSubmitting}
            submitLabel="Sign In"
            onUsernameChange={setUsername}
            onPasswordChange={setPassword}
            onSubmit={onSubmit}
          />
        </section>
      </div>

      {error ? (
        <div className="modal-overlay">
          <div className="modal-backdrop" onClick={() => setError(null)}></div>
          <div className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="submission-login-notice-title">
            <div className="modal-dialog__header">
              <div className="modal-dialog__title-group">
                <h3 id="submission-login-notice-title">Login Notice</h3>
              </div>
              <button type="button" className="modal-dialog__close" onClick={() => setError(null)} aria-label="Close login notice">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="modal-dialog__body">
              <p>{error}</p>
            </div>
            <div className="modal-dialog__actions">
              <button type="button" className="modal-dialog__blue" onClick={() => setError(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
