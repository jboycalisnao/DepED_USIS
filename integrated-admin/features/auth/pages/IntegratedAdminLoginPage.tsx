import type { FormEvent } from 'react';
import { UsisLoginModal } from '../../../../common/components/UsisLoginModal';

type IntegratedAdminLoginPageProps = {
  username: string;
  password: string;
  isSubmitting: boolean;
  loginError: string | null;
  onDismissNotice: () => void;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function IntegratedAdminLoginPage({
  username,
  password,
  isSubmitting,
  loginError,
  onDismissNotice,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
}: IntegratedAdminLoginPageProps) {
  return (
    <section className="section-shell integrated-admin-login">
      <UsisLoginModal
        title="Integrated Admin"
        username={username}
        password={password}
        isSubmitting={isSubmitting}
        submitLabel="Login"
        noticeTitle="Login Failed"
        noticeMessage={loginError}
        onDismissNotice={onDismissNotice}
        onUsernameChange={onUsernameChange}
        onPasswordChange={onPasswordChange}
        onSubmit={onSubmit}
      />
    </section>
  );
}
