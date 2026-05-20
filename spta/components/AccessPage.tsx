import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UsisLoginModal } from '../../common/components/UsisLoginModal';
import { hasCoordinatorModuleAccess } from '../../common/auth/moduleAccess';
import { resolveCoordinatorAccess, type CoordinatorAccessRecord } from '../../coordinator/features/auth/utils/coordinatorAccess';

type AccessPageProps = {
  onAccessSuccess: (record: CoordinatorAccessRecord) => void;
};

export function AccessPage({ onAccessSuccess }: AccessPageProps) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setNoticeMessage(null);

    const result = await resolveCoordinatorAccess(username, password);
    if (!result.record) {
      setIsSubmitting(false);
      setNoticeMessage(result.error || 'Unable to process access login.');
      return;
    }

    const canAccessSpta =
      result.record.isSuperAdmin ||
      result.record.accountSource === 'usis_core_coordinators' ||
      result.record.accountSource === 'sp_portal_coordinators' ||
      hasCoordinatorModuleAccess(result.record.userId, 'spta') ||
      hasCoordinatorModuleAccess(result.record.userId, 'sp_portal') ||
      hasCoordinatorModuleAccess(result.record.userId, 'coordinator');

    if (!canAccessSpta) {
      setIsSubmitting(false);
      setNoticeMessage('This coordinator account has no assigned SPTA module access.');
      return;
    }

    onAccessSuccess(result.record);
    setUsername('');
    setPassword('');
    setIsSubmitting(false);
    navigate('/admin');
  };

  return (
    <section className="section-shell spta-access-page">
      <UsisLoginModal
        title="SPTA Access Login"
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
    </section>
  );
}
