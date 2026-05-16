import React, { useState } from 'react';
import {
  ConfigProvider,
  App as AntApp,
} from 'antd';
import { useStore } from '../store';
import { RegistrarHeader } from '../components/shell/RegistrarHeader';
import { RegistrarFooter } from '../components/shell/RegistrarFooter';
import { UsisLoginModal } from '../../common/components/UsisLoginModal';

const LandingContent: React.FC = () => {
  const { login } = useStore();
  const { message } = AntApp.useApp();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const result = await login(username, password);
    if (result.ok) {
      message.success('Access granted. Synchronizing systems...');
      return;
    }
    message.error(result.error || 'Authentication failed. Please verify credentials.');
    setLoading(false);
  };

  return (
    <>
      <RegistrarHeader showSearch>
        <nav className="kit-nav" aria-label="Registrar landing sections">
          <div className="kit-nav__grid">
            <a className="kit-nav__link kit-nav__link--active" href="#registrar-login-title">
              Access
            </a>
          </div>
        </nav>
      </RegistrarHeader>

      <main className="page-frame registrar-login-page">
        <div className="content-width">
          <section className="section-shell">
            <UsisLoginModal
              title="Registrar's Portal"
              username={username}
              password={password}
              isSubmitting={loading}
              submitLabel="Login"
              onUsernameChange={setUsername}
              onPasswordChange={setPassword}
              onSubmit={onSubmit}
            />
          </section>
        </div>
      </main>

      <RegistrarFooter />
    </>
  );
};

const Landing: React.FC = () => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#0038a8',
          fontFamily: '"Segoe UI", "Segoe UI Variable", Tahoma, Arial, sans-serif',
          colorLink: '#0038a8',
        },
      }}
    >
      <AntApp>
        <LandingContent />
      </AntApp>
    </ConfigProvider>
  );
};

export default Landing;
