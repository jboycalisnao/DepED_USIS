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
            submitLabel="Login"
            noticeTitle="Login Notice"
            noticeMessage={error}
            onDismissNotice={() => setError(null)}
            onUsernameChange={setUsername}
            onPasswordChange={setPassword}
            onSubmit={onSubmit}
          />
        </section>
      </div>
    </main>
  );
}
