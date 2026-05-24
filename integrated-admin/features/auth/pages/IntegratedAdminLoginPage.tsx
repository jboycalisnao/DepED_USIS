import { useState } from 'react';
import { UsisLoginModal } from '../../../../common/components/UsisLoginModal';

export function IntegratedAdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  return (
    <section className="section-shell integrated-admin-login">
      <UsisLoginModal
        title="Integrated Admin"
        username={username}
        password={password}
        submitLabel="Login"
        onUsernameChange={setUsername}
        onPasswordChange={setPassword}
        onSubmit={(event) => event.preventDefault()}
      />
    </section>
  );
}
