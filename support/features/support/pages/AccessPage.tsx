import { useState } from 'react';
import { UsisLoginModal } from '../../../../common/components/UsisLoginModal';
import { hasCoordinatorModuleAccess } from '../../../../common/auth/moduleAccess';
import {
  type SupportAccessRecord,
  resolveSupportCoordinatorAccess,
} from '../utils/supportAccess';

type AccessPageProps = {
  session: SupportAccessRecord | null;
  onLoginSuccess: (record: SupportAccessRecord) => void;
  onLogout: () => void;
};

export function AccessPage({ session, onLoginSuccess, onLogout }: AccessPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setNoticeMessage(null);

    const result = await resolveSupportCoordinatorAccess(username, password);

    if (!result.record) {
      setIsSubmitting(false);
      setNoticeMessage(result.error || 'Unable to process support access login.');
      return;
    }

    const canAccessSupport =
      result.record.isSuperAdmin || hasCoordinatorModuleAccess(result.record.userId, 'support');

    if (!canAccessSupport) {
      setIsSubmitting(false);
      setNoticeMessage('This coordinator account has no assigned Support module access.');
      return;
    }

    onLoginSuccess(result.record);
    setUsername('');
    setPassword('');
    setIsSubmitting(false);
  };

  if (!session) {
    return (
      <div className="support-access-login">
        <UsisLoginModal
          title="Support Access Login"
          username={username}
          password={password}
          isSubmitting={isSubmitting}
          submitLabel="Login"
          noticeTitle="Access Notice"
          noticeMessage={noticeMessage}
          onDismissNotice={() => setNoticeMessage(null)}
          onUsernameChange={setUsername}
          onPasswordChange={setPassword}
          onSubmit={handleSubmit}
        />
      </div>
    );
  }

  return (
    <section className="support-page">
      <header className="support-page__header">
        <h2>Access Session</h2>
        <p>Authenticated support credential session for school-level learner support operations.</p>
      </header>
      <article className="support-note-box">
        <strong>Logged in as</strong>
        <span>{session.coordinatorName}</span>
        <span>{session.coordinatorRole}</span>
        <span>{session.schoolName}</span>
      </article>
      <div>
        <button
          type="button"
          className="primary-button"
          onClick={onLogout}
        >
          Logout
        </button>
      </div>
    </section>
  );
}
