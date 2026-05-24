import { useState, type FormEvent } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { UsisUnifiedHeader } from '../common/header/UsisUnifiedHeader';
import { UsisGlobalFooter } from '../common/footer/UsisGlobalFooter';
import { IntegratedAdminLoginPage } from './features/auth/pages/IntegratedAdminLoginPage';
import {
  clearStoredIntegratedAdminAccess,
  getStoredIntegratedAdminAccess,
  resolveIntegratedAdminAccess,
  storeIntegratedAdminAccess,
  type IntegratedAdminAccessRecord,
} from './features/auth/services/integratedAdminAccess';

function IntegratedAdminWorkspace({
  session,
  onLogout,
}: {
  session: IntegratedAdminAccessRecord;
  onLogout: () => void;
}) {
  return (
    <section className="section-shell integrated-admin-workspace">
      <article className="portal-panel">
        <div className="portal-panel__header">
          <h2>Integrated Admin Workspace</h2>
          <p>Signed in as {session.coordinatorName}.</p>
        </div>
        <div className="portal-panel__body">
          <p>
            This subsystem is connected to coordinator credentials and ready for module-level configuration work.
          </p>
          <p>
            <strong>Role:</strong> {session.role}
          </p>
          <p>
            <strong>School:</strong> {session.schoolName}
          </p>
          <button type="button" className="secondary-button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </article>
    </section>
  );
}

function IntegratedAdminShell() {
  const [session, setSession] = useState<IntegratedAdminAccessRecord | null>(() =>
    getStoredIntegratedAdminAccess(),
  );
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setLoginError(null);

    const result = await resolveIntegratedAdminAccess(username, password);
    if (result.record) {
      storeIntegratedAdminAccess(result.record);
      setSession(result.record);
      setUsername('');
      setPassword('');
      setIsSubmitting(false);
      return;
    }

    setLoginError(result.error || 'Unable to process login.');
    setIsSubmitting(false);
  };

  const handleLogout = () => {
    clearStoredIntegratedAdminAccess();
    setSession(null);
  };

  return (
    <div className="integrated-admin-app">
      <header className="site-chrome">
        <div className="content-width">
          <UsisUnifiedHeader searchId="integrated-admin-search" searchLabel="Search integrated admin portal" />
        </div>
      </header>

      <main className="page-frame integrated-admin-main">
        <div className="content-width">
          <Routes>
            <Route
              path="/"
              element={
                session ? (
                  <IntegratedAdminWorkspace session={session} onLogout={handleLogout} />
                ) : (
                  <IntegratedAdminLoginPage
                    username={username}
                    password={password}
                    isSubmitting={isSubmitting}
                    loginError={loginError}
                    onDismissNotice={() => setLoginError(null)}
                    onUsernameChange={setUsername}
                    onPasswordChange={setPassword}
                    onSubmit={handleSubmit}
                  />
                )
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>

      <UsisGlobalFooter />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <IntegratedAdminShell />
    </BrowserRouter>
  );
}
