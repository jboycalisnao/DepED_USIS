import { UsisLoginModal } from '../../../../common/components/UsisLoginModal';

type LearnerLoginPageProps = {
  username: string;
  password: string;
  isSubmitting: boolean;
  loginError: string | null;
  onDismissNotice: () => void;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function LearnerLoginPage({
  username,
  password,
  isSubmitting,
  loginError,
  onDismissNotice,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
}: LearnerLoginPageProps) {
  return (
    <section className="section-shell">
      <UsisLoginModal
        title="Learner's Portal"
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
