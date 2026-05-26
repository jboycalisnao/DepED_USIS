import { useEffect, useMemo, useRef, useState } from 'react';
import { BrowserRouter, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { UsisUnifiedHeader } from '../common/header/UsisUnifiedHeader';
import { UsisGlobalFooter } from '../common/footer/UsisGlobalFooter';
import { UsisSideNav, type UsisSideNavItem } from '../common/components/UsisSideNav';
import { UsisBreadcrumbBar } from '../common/components/UsisBreadcrumbBar';
import {
  clearStoredLearnerAccess,
  getStoredLearnerAccess,
  resolveLearnerAccess,
  storeLearnerAccess,
  type LearnerPortalAccessRecord,
} from './features/auth/services/learnerAccess';
import { clearLearnerPortalCache } from './features/portal/services/learnerPortalCache';
import { learnerNavItems } from './features/portal/layout/nav/learnerNavItems';
import { DashboardPage } from './features/portal/pages/DashboardPage';
import { GradesPage } from './features/portal/pages/GradesPage';
import { ServicesPage } from './features/portal/pages/ServicesPage';
import { ProfilePage } from './features/portal/pages/ProfilePage';
import { EnrollmentHistoryServicePage } from './features/portal/pages/services/EnrollmentHistoryServicePage';
import { DocumentRequestsServicePage } from './features/portal/pages/services/DocumentRequestsServicePage';
import { StudentSupportServicePage } from './features/portal/pages/services/StudentSupportServicePage';
import { PtaFeeServicePage } from './features/portal/pages/services/PtaFeeServicePage';
import { MerchServicePage } from './features/portal/pages/services/MerchServicePage';
import { MerchControlServicePage } from './features/portal/pages/services/MerchControlServicePage';
import { LearnerLoginPage } from './features/auth/pages/LearnerLoginPage';
import { LearnerCredentialPage } from './features/auth/pages/LearnerCredentialPage';

const LEARNER_PORTAL_BASENAME = '/learner-portal';

function resolveLearnerPortalBasename(pathname: string): string {
  return pathname === LEARNER_PORTAL_BASENAME || pathname.startsWith(`${LEARNER_PORTAL_BASENAME}/`)
    ? LEARNER_PORTAL_BASENAME
    : '';
}

function LearnerPortalShell({
  session,
  onLogout,
}: {
  session: LearnerPortalAccessRecord;
  onLogout: () => void;
}) {
  const location = useLocation();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const currentSection =
    learnerNavItems.find((item) =>
      item.path === '/'
        ? location.pathname === '/'
        : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
    ) || learnerNavItems[0];
  const sideNavItems = useMemo<UsisSideNavItem[]>(
    () => learnerNavItems.map((item) => ({ icon: item.icon, label: item.label, path: item.path })),
    []
  );

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.pathname]);

  return (
    <>
      <main className="page-frame learner-portal-main">
        <div className="content-width">
          <section className="learner-page-intro" aria-label="Current learner portal page">
            <UsisBreadcrumbBar
              rootLabel="Learner Portal"
              currentLabel={currentSection.label}
              profileName={session.learnerName}
              profileRole="Learner"
              profileSubtitle={session.lrn ? `LRN: ${session.lrn}` : undefined}
              onLogout={onLogout}
              leftActions={(
                <button
                  type="button"
                  className="usis-side-nav__mobile-toggle usis-side-nav__mobile-toggle--inline"
                  aria-label={isMobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
                  aria-expanded={isMobileNavOpen}
                  onClick={() => setIsMobileNavOpen((current) => !current)}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    menu
                  </span>
                </button>
              )}
            />
          </section>
          <div className="learner-layout">
            <UsisSideNav
              ariaLabel="Learner portal sections"
              items={sideNavItems}
              onLogout={onLogout}
              isMobileOpen={isMobileNavOpen}
              onMobileOpenChange={setIsMobileNavOpen}
              hideInternalMobileToggle
            />
            <div className="learner-content">
              <Routes>
                <Route path="/" element={<DashboardPage session={session} />} />
                <Route path="/grades" element={<GradesPage />} />
                <Route path="/services" element={<ServicesPage session={session} />} />
                <Route path="/services/enrollment-history" element={<EnrollmentHistoryServicePage session={session} />} />
                <Route path="/services/document-requests" element={<DocumentRequestsServicePage />} />
                <Route path="/services/student-support" element={<StudentSupportServicePage />} />
                <Route path="/services/pta-fee" element={<PtaFeeServicePage session={session} />} />
                <Route path="/services/merch" element={<MerchServicePage session={session} />} />
                <Route path="/services/merch-control" element={<MerchControlServicePage session={session} />} />
                <Route path="/profile" element={<ProfilePage session={session} />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </div>
        </div>
      </main>
      <UsisGlobalFooter />
    </>
  );
}

export default function App() {
  const basename = resolveLearnerPortalBasename(window.location.pathname);
  const [session, setSession] = useState<LearnerPortalAccessRecord | null>(() => getStoredLearnerAccess());
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setLoginError(null);

    const result = await resolveLearnerAccess(username, password);
    if (result.record) {
      storeLearnerAccess(result.record);
      setSession(result.record);
      setUsername('');
      setPassword('');
      setIsSubmitting(false);
      return;
    }

    setLoginError(result.error || 'Unable to process learner login.');
    setIsSubmitting(false);
  };

  const handleLogout = () => {
    clearStoredLearnerAccess();
    clearLearnerPortalCache();
    setSession(null);
  };

  return (
    <BrowserRouter basename={basename}>
      <div className="learner-portal-app">
        <header className="site-chrome learner-portal-chrome">
          <div className="content-width">
            <UsisUnifiedHeader searchId="learner-portal-search" searchLabel="Search learner portal" />
          </div>
        </header>

        {!session ? (
          <LearnerPublicAccess
            username={username}
            password={password}
            isSubmitting={isSubmitting}
            loginError={loginError}
            onDismissNotice={() => setLoginError(null)}
            onUsernameChange={setUsername}
            onPasswordChange={setPassword}
            onSubmit={handleSubmit}
            onPrefillLogin={(nextUsername, nextPassword) => {
              setUsername(nextUsername);
              setPassword(nextPassword);
              setLoginError(null);
            }}
          />
        ) : (
          <LearnerPortalShell session={session} onLogout={handleLogout} />
        )}
      </div>
    </BrowserRouter>
  );
}

const publicNavItems = [
  { label: 'Login', path: '/login' },
  { label: 'Get Credential', path: '/get-credential' },
];

function LearnerPublicAccess({
  username,
  password,
  isSubmitting,
  loginError,
  onDismissNotice,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
  onPrefillLogin,
}: {
  username: string;
  password: string;
  isSubmitting: boolean;
  loginError: string | null;
  onDismissNotice: () => void;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onPrefillLogin: (username: string, password: string) => void;
}) {
  return (
    <>
      <main className="page-frame learner-portal-main">
        <div className="content-width">
          <nav className="kit-nav" aria-label="Learner access navigation">
            <div className="kit-nav__grid">
              {publicNavItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `kit-nav__link ${isActive ? 'kit-nav__link--active' : ''}`}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </nav>
          <Routes>
            <Route
              path="/login"
              element={
                <LearnerLoginPage
                  username={username}
                  password={password}
                  isSubmitting={isSubmitting}
                  loginError={loginError}
                  onDismissNotice={onDismissNotice}
                  onUsernameChange={onUsernameChange}
                  onPasswordChange={onPasswordChange}
                  onSubmit={onSubmit}
                />
              }
            />
            <Route path="/get-credential" element={<LearnerCredentialPage onPrefillLogin={onPrefillLogin} />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </main>
      <UsisGlobalFooter />
    </>
  );
}
