import React, { useState } from 'react';
import {
  ConfigProvider,
  App as AntApp,
} from 'antd';
import { SafetyCertificateOutlined } from '@ant-design/icons';
import { useStore } from '../store';
import { RegistrarHeader } from '../components/shell/RegistrarHeader';
import { RegistrarFooter } from '../components/shell/RegistrarFooter';

const LandingContent: React.FC = () => {
  const { login } = useStore();
  const { message } = AntApp.useApp();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setTimeout(() => {
      const success = login(username, password);
      if (success) {
        message.success('Access granted. Synchronizing systems...');
      } else {
        message.error('Authentication failed. Please verify credentials.');
        setLoading(false);
      }
    }, 800);
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
          <section className="registrar-login section-shell">
            <div className="registrar-login__panel">
              <section className="portal-panel registrar-login-panel" aria-labelledby="registrar-login-title">
                <header className="portal-panel__header registrar-login-panel__header">
                  <h2 id="registrar-login-title">Registrar's Portal</h2>
                  <p>Use assigned school credentials to access learner records.</p>
                </header>

                <form className="registrar-login-form" onSubmit={onSubmit}>
                  <label className="floating-field">
                    <div className="floating-field__control">
                      <input
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        type="text"
                        name="username"
                        autoComplete="username"
                        required
                        tabIndex={1}
                        placeholder=" "
                      />
                      <span>User Identification</span>
                    </div>
                  </label>

                  <label className="floating-field">
                    <div className="floating-field__control">
                      <input
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        type={isPasswordVisible ? 'text' : 'password'}
                        name="password"
                        autoComplete="current-password"
                        required
                        tabIndex={2}
                        placeholder=" "
                        className="floating-field__input--password"
                      />
                      <span>Access Key</span>
                      <button
                        type="button"
                        className="floating-field__password-toggle"
                        aria-label={isPasswordVisible ? 'Hide access key' : 'Show access key'}
                        tabIndex={3}
                        onClick={() => setIsPasswordVisible((visible) => !visible)}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true" className="floating-field__password-icon">
                          {isPasswordVisible ? (
                            <>
                              <path d="M3 5l16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                              <path d="M10.6 6.5A10.7 10.7 0 0 1 12 6.4c5.2 0 9 5.6 9 5.6a17.2 17.2 0 0 1-3.4 3.9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M14.1 14.2A3 3 0 0 1 9.8 9.9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M6.2 9A17.1 17.1 0 0 0 3 12s3.8 5.6 9 5.6c1.1 0 2.1-.2 3.1-.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </>
                          ) : (
                            <>
                              <path d="M1.8 12s4-5.8 10.2-5.8S22.2 12 22.2 12 18.2 17.8 12 17.8 1.8 12 1.8 12Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                              <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
                            </>
                          )}
                        </svg>
                      </button>
                    </div>
                  </label>

                  <div className="registrar-login-form__options">
                    <label className="choice-row registrar-login__remember">
                      <input type="checkbox" name="remember" tabIndex={4} defaultChecked />
                      <span>Stay Active</span>
                    </label>
                    <button type="button" className="portal-link registrar-login__recovery" tabIndex={5}>
                      Recovery
                    </button>
                  </div>

                  <button type="submit" className="primary-button registrar-login__submit" disabled={loading} tabIndex={6}>
                    {!loading && <SafetyCertificateOutlined className="text-lg" />}
                    {loading ? 'Checking Access' : 'Secure Access'}
                  </button>
                </form>

                <div className="registrar-login-card__meta">
                  <span>System Cycle 2025.0</span>
                  <span>Institutional Master Registry</span>
                </div>
              </section>
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
          fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
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
