import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const result = await login(username, password);
    if (result.ok) {
      return;
    }
    setError(result.error || 'Authentication failed. Please verify credentials.');
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
            <a className="kit-nav__link" href="/verify-document">
              Document Verification
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
              noticeTitle="Access Denied"
              noticeMessage={error}
              onDismissNotice={() => setError(null)}
              onUsernameChange={setUsername}
              onPasswordChange={setPassword}
              onSubmit={onSubmit}
            />
            <div style={{ marginTop: '18px' }}>
              <Link className="secondary-button" to="/verify-document">
                Open Public Verification Page
              </Link>
            </div>
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
