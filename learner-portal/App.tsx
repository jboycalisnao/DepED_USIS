import { useEffect, useMemo, useRef, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { UsisUnifiedHeader } from '../common/header/UsisUnifiedHeader';
import { UsisGlobalFooter } from '../common/footer/UsisGlobalFooter';
import { UsisLoginModal } from '../common/components/UsisLoginModal';
import {
  clearStoredLearnerAccess,
  getStoredLearnerAccess,
  resolveLearnerAccess,
  storeLearnerAccess,
  type LearnerPortalAccessRecord,
} from './features/auth/services/learnerAccess';
import { clearLearnerPortalCache } from './features/portal/services/learnerPortalCache';
import { learnerNavItems } from './features/portal/layout/nav/learnerNavItems';
import { LearnerSideNav } from './features/portal/layout/LearnerSideNav';
import { DashboardPage } from './features/portal/pages/DashboardPage';
import { GradesPage } from './features/portal/pages/GradesPage';
import { ServicesPage } from './features/portal/pages/ServicesPage';
import { ProfilePage } from './features/portal/pages/ProfilePage';
import { EnrollmentHistoryServicePage } from './features/portal/pages/services/EnrollmentHistoryServicePage';
import { DocumentRequestsServicePage } from './features/portal/pages/services/DocumentRequestsServicePage';
import { StudentSupportServicePage } from './features/portal/pages/services/StudentSupportServicePage';

function LearnerPortalShell({
  session,
  onLogout,
}: {
  session: LearnerPortalAccessRecord;
  onLogout: () => void;
}) {
  const location = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const currentSection =
    learnerNavItems.find((item) =>
      item.path === '/'
        ? location.pathname === '/'
        : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
    ) || learnerNavItems[0];
  const profileInitials = useMemo(() => {
    const sourceName = String(session.learnerName || '').trim();
    if (!sourceName) return 'L';
    const tokens = sourceName.split(/\s+/).slice(0, 2);
    return tokens.map((token) => token.charAt(0).toUpperCase()).join('');
  }, [session.learnerName]);

  useEffect(() => {
    if (!isProfileOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!profileMenuRef.current) return;
      if (profileMenuRef.current.contains(event.target as Node)) return;
      setIsProfileOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileOpen]);

  return (
    <>
      <main className="page-frame learner-portal-main">
        <div className="content-width">
          <section className="learner-page-intro" aria-label="Current learner portal page">
            <p className="learner-breadcrumb">
              <span className="learner-breadcrumb__root">Learner Portal</span>
              <span className="learner-breadcrumb__sep" aria-hidden="true">
                /
              </span>
              <span className="learner-breadcrumb__current">{currentSection.label}</span>
            </p>
            <div className="learner-profile-menu" ref={profileMenuRef}>
              <button
                type="button"
                className="learner-profile-trigger"
                aria-haspopup="menu"
                aria-expanded={isProfileOpen}
                onClick={() => setIsProfileOpen((current) => !current)}
              >
                <span className="learner-profile-trigger__avatar" aria-hidden="true">
                  {profileInitials}
                </span>
              </button>
              {isProfileOpen ? (
                <div className="learner-profile-popover" role="menu" aria-label="Learner profile menu">
                  <div className="learner-profile-popover__avatar" aria-hidden="true">
                    {profileInitials}
                  </div>
                  <p className="learner-profile-popover__name">{session.learnerName}</p>
                  <p className="learner-profile-popover__meta">LRN: {session.lrn || 'N/A'}</p>
                  <div className="learner-profile-popover__divider" />
                  <button type="button" className="learner-profile-popover__logout" onClick={onLogout}>
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="learner-logout-icon">
                      <path d="M3 4.5h10v15H3v-15Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M13 12h8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="m18 8 4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Logout
                  </button>
                </div>
              ) : null}
            </div>
          </section>
          <div className="learner-layout">
            <LearnerSideNav items={learnerNavItems} onLogout={onLogout} />
            <div className="learner-content">
              <Routes>
                <Route path="/" element={<DashboardPage session={session} />} />
                <Route path="/grades" element={<GradesPage />} />
                <Route path="/services" element={<ServicesPage />} />
                <Route path="/services/enrollment-history" element={<EnrollmentHistoryServicePage session={session} />} />
                <Route path="/services/document-requests" element={<DocumentRequestsServicePage />} />
                <Route path="/services/student-support" element={<StudentSupportServicePage />} />
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
    <BrowserRouter>
      <div className="learner-portal-app">
        <header className="site-chrome learner-portal-chrome">
          <div className="content-width">
            <UsisUnifiedHeader searchId="learner-portal-search" searchLabel="Search learner portal" />
          </div>
        </header>

        {!session ? (
          <main className="page-frame learner-portal-main">
            <div className="content-width">
              <section className="section-shell">
                <UsisLoginModal
                  title="Learner's Portal"
                  username={username}
                  password={password}
                  isSubmitting={isSubmitting}
                  submitLabel="Login"
                  noticeTitle="Login Failed"
                  noticeMessage={loginError}
                  onDismissNotice={() => setLoginError(null)}
                  onUsernameChange={setUsername}
                  onPasswordChange={setPassword}
                  onSubmit={handleSubmit}
                />
              </section>
            </div>
          </main>
        ) : (
          <LearnerPortalShell session={session} onLogout={handleLogout} />
        )}
      </div>
    </BrowserRouter>
  );
}
