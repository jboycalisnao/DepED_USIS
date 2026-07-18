import { useEffect, useMemo, useRef, useState } from 'react';
import { BrowserRouter, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
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
import { AttendanceServicePage } from './features/portal/pages/services/AttendanceServicePage';
import { DocumentRequestsServicePage } from './features/portal/pages/services/DocumentRequestsServicePage';
import { LearnerHelpTicketServicePage } from './features/portal/pages/services/LearnerHelpTicketServicePage';
import { StudentSupportServicePage } from './features/portal/pages/services/StudentSupportServicePage';
import { PtaFeeServicePage } from './features/portal/pages/services/PtaFeeServicePage';
import { MerchServicePage } from './features/portal/pages/services/MerchServicePage';
import { MerchControlServicePage } from './features/portal/pages/services/MerchControlServicePage';
import { IdServicePage } from './features/portal/pages/services/IdServicePage';
import { LearnerLoginPage } from './features/auth/pages/LearnerLoginPage';
import { LearnerCredentialPage } from './features/auth/pages/LearnerCredentialPage';
import { UsisPortalGate } from '../common/components/UsisPortalGate';
import { LearnerPortalSeo } from './components/ui/LearnerPortalSeo';
import { LearnerPortalNotificationsTrigger } from './features/portal/components/LearnerPortalNotificationsTrigger';

const LEARNER_PORTAL_BASENAME = '/learner-portal';
const LEARNER_PORTAL_RETURN_TO_KEY = 'learner_portal_return_to';
const PUBLIC_LEARNER_PATHS = new Set(['/login', '/get-credential']);
const PRIVATE_LEARNER_PATHS = new Set([
  '/',
  '/grades',
  '/services',
  '/services/attedance',
  '/services/attendance',
  '/services/enrollment-history',
  '/services/document-requests',
  '/services/student-support',
  '/services/help-ticket',
  '/services/pta-fee',
  '/services/merch',
  '/services/id',
  '/services/merch-control',
  '/profile',
]);

const normalizeLearnerPortalPath = (pathname: string) => {
  const cleanPath = String(pathname || '/').trim() || '/';
  if (cleanPath === '/') return cleanPath;
  return cleanPath.replace(/\/+$/, '');
};

const stripLearnerPortalBasename = (pathname: string, basename = LEARNER_PORTAL_BASENAME) => {
  const normalizedPath = normalizeLearnerPortalPath(pathname);
  if (!basename) return normalizedPath;
  if (normalizedPath === basename) return '/';
  if (normalizedPath.startsWith(`${basename}/`)) {
    return normalizeLearnerPortalPath(normalizedPath.slice(basename.length) || '/');
  }
  return normalizedPath;
};

function resolveLearnerPortalBasename(pathname: string): string {
  return pathname === LEARNER_PORTAL_BASENAME || pathname.startsWith(`${LEARNER_PORTAL_BASENAME}/`)
    ? LEARNER_PORTAL_BASENAME
    : '';
}

const resolveLearnerReturnPath = (pathname: string, search = '', hash = '') => {
  const normalizedPath = stripLearnerPortalBasename(pathname);
  if (!PRIVATE_LEARNER_PATHS.has(normalizedPath)) return '';
  const routedPath = normalizedPath === '/services/attedance' ? '/services/attendance' : normalizedPath;
  return `${routedPath}${search}${hash}`;
};

const resolveWindowLearnerReturnPath = (basename: string) => {
  if (typeof window === 'undefined') return '';
  const rawPath = window.location.pathname || '/';
  const routedPath = stripLearnerPortalBasename(rawPath, basename);
  return resolveLearnerReturnPath(routedPath, window.location.search, window.location.hash);
};

const readStoredLearnerReturnPath = () => {
  if (typeof window === 'undefined') return '';
  const storedPath = window.sessionStorage.getItem(LEARNER_PORTAL_RETURN_TO_KEY) || '';
  const url = new URL(storedPath || '/', window.location.origin);
  return resolveLearnerReturnPath(url.pathname, url.search, url.hash);
};

const storeLearnerReturnPath = (returnPath: string) => {
  if (typeof window === 'undefined' || !returnPath) return;
  const url = new URL(returnPath, window.location.origin);
  const normalizedReturnPath = resolveLearnerReturnPath(url.pathname, url.search, url.hash);
  if (!normalizedReturnPath) return;
  window.sessionStorage.setItem(LEARNER_PORTAL_RETURN_TO_KEY, normalizedReturnPath);
};

const clearLearnerReturnPath = () => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(LEARNER_PORTAL_RETURN_TO_KEY);
};

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
          <section className="learner-page-intro" aria-label="Current school portal page">
            <UsisBreadcrumbBar
              rootLabel="School Portal"
              currentLabel={currentSection.label}
              profileName={session.learnerName}
              profileRole="Learner"
              profileSubtitle={session.lrn ? `LRN: ${session.lrn}` : undefined}
              onLogout={onLogout}
              rightActions={<LearnerPortalNotificationsTrigger learnerName={session.learnerName} />}
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
                <Route path="/grades" element={<GradesPage session={session} />} />
                <Route path="/services" element={<ServicesPage session={session} />} />
                <Route path="/services/attedance" element={<Navigate to="/services/attendance" replace />} />
                <Route path="/services/attendance" element={<AttendanceServicePage session={session} />} />
                <Route path="/services/enrollment-history" element={<EnrollmentHistoryServicePage session={session} />} />
                <Route path="/services/document-requests" element={<DocumentRequestsServicePage />} />
                <Route path="/services/student-support" element={<StudentSupportServicePage />} />
                <Route path="/services/help-ticket" element={<LearnerHelpTicketServicePage session={session} />} />
                <Route path="/services/pta-fee" element={<PtaFeeServicePage session={session} />} />
                <Route path="/services/merch" element={<MerchServicePage session={session} />} />
                <Route path="/services/id" element={<IdServicePage session={session} />} />
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
  const initialReturnPath = resolveWindowLearnerReturnPath(basename);
  if (initialReturnPath && !getStoredLearnerAccess()) {
    storeLearnerReturnPath(initialReturnPath);
  }

  return (
    <BrowserRouter basename={basename}>
      <LearnerPortalAppContent />
    </BrowserRouter>
  );
}

function LearnerPortalAppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState<LearnerPortalAccessRecord | null>(() => getStoredLearnerAccess());
  const returnPathRef = useRef(readStoredLearnerReturnPath());
  const [postLoginReturnPath, setPostLoginReturnPath] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    if (session) return;
    if (PUBLIC_LEARNER_PATHS.has(location.pathname)) return;
    const returnPath = resolveLearnerReturnPath(location.pathname, location.search, location.hash);
    if (returnPath) {
      returnPathRef.current = returnPath;
      storeLearnerReturnPath(returnPath);
    }
  }, [location.hash, location.pathname, location.search, session]);

  useEffect(() => {
    if (!session || !postLoginReturnPath) return;
    const currentPath = `${location.pathname}${location.search}${location.hash}`;
    if (currentPath === postLoginReturnPath) {
      setPostLoginReturnPath('');
    }
  }, [location.hash, location.pathname, location.search, postLoginReturnPath, session]);

  const handleUsernameChange = (value: string) => {
    setUsername(value.replace(/\D/g, '').slice(0, 12));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setLoginError(null);

    const result = await resolveLearnerAccess(username, password);
    if (result.record) {
      const returnPath = returnPathRef.current || readStoredLearnerReturnPath();
      clearLearnerReturnPath();
      returnPathRef.current = '';
      setPostLoginReturnPath(returnPath);
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
    navigate('/login', { replace: true });
  };

  const currentPath = `${location.pathname}${location.search}${location.hash}`;
  const shouldRestorePostLoginPath = Boolean(
    session && postLoginReturnPath && currentPath !== postLoginReturnPath,
  );

  return (
    <div className="learner-portal-app">
      <UsisPortalGate moduleKey="learner_portal" />
      <LearnerPortalSeo isAuthenticated={Boolean(session)} />
      <header className="site-chrome learner-portal-chrome">
        <div className="content-width">
          <UsisUnifiedHeader searchId="learner-portal-search" searchLabel="Search school portal" />
        </div>
      </header>

      {!session ? (
        <LearnerPublicAccess
          username={username}
          password={password}
          isSubmitting={isSubmitting}
          loginError={loginError}
          onDismissNotice={() => setLoginError(null)}
          onUsernameChange={handleUsernameChange}
          onPasswordChange={setPassword}
          onSubmit={handleSubmit}
          onPrefillLogin={(nextUsername, nextPassword) => {
            setUsername(nextUsername.replace(/\D/g, '').slice(0, 12));
            setPassword(nextPassword);
            setLoginError(null);
          }}
        />
      ) : shouldRestorePostLoginPath ? (
        <Navigate to={postLoginReturnPath} replace />
      ) : (
        <LearnerPortalShell session={session} onLogout={handleLogout} />
      )}
    </div>
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
