import { UsisLoginModal } from '../../../../common/components/UsisLoginModal';
import { Link } from 'react-router-dom';

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
        moduleKey="learner_portal"
        title="School Portal"
        usernameLabel="LRN (Learner Reference Number)"
        usernameInputMode="numeric"
        usernamePattern="[0-9]{12}"
        usernameMaxLength={12}
        usernameAutoComplete="off"
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
        helperContent={
          <Link to="/get-credential">Don&apos;t know your credentials? Get them here.</Link>
        }
      />
    </section>
  );
}
