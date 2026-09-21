import { useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { UsisUnifiedHeader } from '../common/header/UsisUnifiedHeader';
import { UsisGlobalFooter } from '../common/footer/UsisGlobalFooter';
import { UsisSideNav } from '../common/components/UsisSideNav';
import { UsisBreadcrumbBar } from '../common/components/UsisBreadcrumbBar';
import { UsisPortalGate } from '../common/components/UsisPortalGate';
import { UsisAlertModal } from '../common/components/UsisAlertModal';
import { AccessPage } from './features/auth/pages/AccessPage';
import {
  clearStoredSrcyAccess,
  getStoredSrcyAccess,
  storeSrcyAccess,
  type SrcyAccessRecord,
} from './features/auth/services/srcyAccess';
import { clearAllSrcySessionCache } from './features/members/services/srcyMemberDetailsCache';
import { DashboardPage } from './features/dashboard/pages/DashboardPage';
import { srcyNavItems } from './features/layout/nav/srcyNavItems';
import { MembershipPage } from './features/members/pages/MembershipPage';
import { MembershipListPage } from './features/members/pages/MembershipListPage';
import { DomRecordsPage } from './features/members/pages/DomRecordsPage';
import { TrainingsPage } from './features/trainings/pages/TrainingsPage';

function SrcyShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState<SrcyAccessRecord | null>(() => getStoredSrcyAccess());
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  const currentSectionLabel = useMemo(() => {
    const match = srcyNavItems.find((item) =>
      item.path === '/'
        ? location.pathname === '/'
        : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`),
    );
    return match?.label || 'Dashboard';
  }, [location.pathname]);

  const requestLogout = () => {
    setIsLogoutConfirmOpen(true);
  };

  const executeLogout = () => {
    clearAllSrcySessionCache();
    clearStoredSrcyAccess();
    setSession(null);
    setIsLogoutConfirmOpen(false);
    navigate('/access', { replace: true });
  };

  return (
    <div className="srcy-app">
      <UsisPortalGate moduleKey="srcy" />
      <header className="site-chrome">
        <div className="content-width">
          <UsisUnifiedHeader searchId="srcy-search" searchLabel="Search SRCY Hub" />
        </div>
      </header>

      <main className="page-frame srcy-main">
        <div className="content-width">
          {session ? (
            <UsisBreadcrumbBar
              rootLabel="SRCY Hub"
              currentLabel={currentSectionLabel}
              profileName={session.coordinatorName}
              profileRole={session.coordinatorRole || null}
              profileSubtitle={session.schoolName || undefined}
              onLogout={requestLogout}
              leftActions={
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
              }
            />
          ) : null}

          <section className={session ? 'srcy-layout' : 'srcy-public-layout'}>
            {session ? (
              <UsisSideNav
                items={srcyNavItems}
                onLogout={requestLogout}
                ariaLabel="SRCY Hub sections"
                isMobileOpen={isMobileNavOpen}
                onMobileOpenChange={setIsMobileNavOpen}
                hideInternalMobileToggle
              />
            ) : null}
            <div className="srcy-content">
              <Routes>
                <Route
                  path="/access"
                  element={
                    session ? (
                      <Navigate to="/" replace />
                    ) : (
                      <AccessPage
                        onLoginSuccess={(record) => {
                          storeSrcyAccess(record);
                          setSession(record);
                        }}
                      />
                    )
                  }
                />
                <Route path="/" element={session ? <DashboardPage session={session} /> : <Navigate to="/access" replace />} />
                <Route path="/memberships" element={session ? <MembershipPage session={session} /> : <Navigate to="/access" replace />} />
                <Route path="/membership-list" element={session ? <MembershipListPage session={session} /> : <Navigate to="/access" replace />} />
                <Route path="/dom-records" element={session ? <DomRecordsPage session={session} /> : <Navigate to="/access" replace />} />
                <Route path="/trainings" element={session ? <TrainingsPage session={session} /> : <Navigate to="/access" replace />} />
                <Route path="*" element={<Navigate to={session ? '/' : '/access'} replace />} />
              </Routes>
            </div>
          </section>
        </div>
      </main>

      <UsisGlobalFooter />
      <UsisAlertModal
        open={isLogoutConfirmOpen}
        title="Confirm Logout"
        message="Log out of the SRCY Hub?"
        tone="warning"
        confirmLabel="Log Out"
        cancelLabel="Stay Signed In"
        onClose={() => setIsLogoutConfirmOpen(false)}
        onConfirm={executeLogout}
      />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <SrcyShell />
    </BrowserRouter>
  );
}
