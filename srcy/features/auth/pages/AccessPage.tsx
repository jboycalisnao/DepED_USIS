import { useState } from 'react';
import { UsisLoginModal } from '../../../../common/components/UsisLoginModal';
import { hasCoordinatorModuleAccessInSupabase } from '../../../../common/auth/moduleAccess';
import { resolveCoordinatorAccess } from '../../../../coordinator/features/auth/utils/coordinatorAccess';
import type { SrcyAccessRecord } from '../services/srcyAccess';
import rcyEmblem from '../../../../common/assets/RCY Emblem.png';

type AccessPageProps = {
  onLoginSuccess: (record: SrcyAccessRecord) => void;
};

export function AccessPage({ onLoginSuccess }: AccessPageProps) {
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
      setNoticeMessage(result.error || 'Unable to process SRCY coordinator login.');
      setIsSubmitting(false);
      return;
    }

    const canAccessSrcy =
      result.record.isSuperAdmin || await hasCoordinatorModuleAccessInSupabase(result.record.userId, 'srcy');

    if (!canAccessSrcy) {
      setNoticeMessage('This coordinator account has no assigned SRCY module access.');
      setIsSubmitting(false);
      return;
    }

    onLoginSuccess(result.record);
    setUsername('');
    setPassword('');
    setIsSubmitting(false);
  };

  return (
    <section className="section-shell srcy-login-page">
      <div className="srcy-login-page__media" aria-hidden="true">
        <img src={rcyEmblem} alt="" />
      </div>
      <UsisLoginModal
        moduleKey="srcy"
        title="SRCY Council Login"
        username={username}
        password={password}
        isSubmitting={isSubmitting}
        submitLabel="Login"
        noticeTitle="Access Notice"
        noticeMessage={noticeMessage}
        helperContent={<span>Use your assigned coordinator portal credentials.</span>}
        onDismissNotice={() => setNoticeMessage(null)}
        onUsernameChange={setUsername}
        onPasswordChange={setPassword}
        onSubmit={handleSubmit}
      />
    </section>
  );
}
