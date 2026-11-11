import React, { useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { UsisUnifiedHeader } from '../common/header/UsisUnifiedHeader';
import { UsisGlobalFooter } from '../common/footer/UsisGlobalFooter';
import { UsisSideNav } from '../common/components/UsisSideNav';
import { UsisBreadcrumbBar } from '../common/components/UsisBreadcrumbBar';
import { UsisPortalGate } from '../common/components/UsisPortalGate';
import { UsisAlertModal } from '../common/components/UsisAlertModal';
import { sccNavItems } from './features/layout/sccNavItems';
import { getStoredSccSession, setStoredSccSession, clearStoredSccSession } from './features/auth/services/sccAuthService';
import type { SccSession } from './types';
import { SccLoginPage } from './features/auth/pages/SccLoginPage';
import { SccDashboardPage } from './features/dashboard/pages/SccDashboardPage';
import { SccServicesCatalogPage } from './features/services/pages/SccServicesCatalogPage';
import { SccRequestsPage } from './features/requests/pages/SccRequestsPage';
import { SccOrgProfilePage } from './features/organization/pages/SccOrgProfilePage';
import { SccAdminDeskPage } from './features/admin/pages/SccAdminDeskPage';

function SccShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState<SccSession | null>(() => getStoredSccSession());
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  const currentSectionLabel = useMemo(() => {
    const match = sccNavItems.find((item) =>
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
    clearStoredSccSession();
    setSession(null);
    setIsLogoutConfirmOpen(false);
    navigate('/access', { replace: true });
  };

  const visibleNavItems = useMemo(() => {
    if (!session) return [];
    if (!session.isCoordinator) {
      return sccNavItems.filter((item) => item.path !== '/admin-desk');
    }
    return sccNavItems;
  }, [session]);

  return (
    <div className="scc-app">
      <UsisPortalGate moduleKey="scc_portal" />
      <header className="site-chrome">
        <div className="content-width">
          <UsisUnifiedHeader
            searchId="scc-search"
            searchLabel="Search SCC Portal"
          />
        </div>
      </header>

      <main className="page-frame scc-main">
        <div className="content-width">
          {session ? (
            <UsisBreadcrumbBar
              rootLabel="SCC Portal"
              currentLabel={currentSectionLabel}
              profileName={session.fullName}
              profileRole={`${session.organizationAcronym} ${session.role === 'club_president' ? 'President' : session.role === 'scc_coordinator' ? 'Coordinator' : 'Officer'}`}
              profileSubtitle={session.organizationName}
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

          <section className={session ? 'scc-layout' : 'scc-public-layout'}>
            {session ? (
              <UsisSideNav
                items={visibleNavItems}
                onLogout={requestLogout}
                ariaLabel="SCC Portal sections"
                isMobileOpen={isMobileNavOpen}
                onMobileOpenChange={setIsMobileNavOpen}
                hideInternalMobileToggle
              />
            ) : null}

            <div className="scc-content">
              <Routes>
                <Route
                  path="/access"
                  element={
                    session ? (
                      <Navigate to="/" replace />
                    ) : (
                      <SccLoginPage
                        onLoginSuccess={(newSession) => {
                          setStoredSccSession(newSession);
                          setSession(newSession);
                          navigate('/', { replace: true });
                        }}
                      />
                    )
                  }
                />

                <Route
                  path="/"
                  element={
                    session ? (
                      <SccDashboardPage
                        session={session}
                        onNavigateToRequests={() => navigate('/requests')}
                        onNavigateToServices={() => navigate('/catalog')}
                        onNavigateToRoster={() => navigate('/roster')}
                      />
                    ) : (
                      <Navigate to="/access" replace />
                    )
                  }
                />

                <Route
                  path="/catalog"
                  element={
                    session ? (
                      <SccServicesCatalogPage session={session} />
                    ) : (
                      <Navigate to="/access" replace />
                    )
                  }
                />

                <Route
                  path="/requests"
                  element={
                    session ? (
                      <SccRequestsPage session={session} />
                    ) : (
                      <Navigate to="/access" replace />
                    )
                  }
                />

                <Route
                  path="/roster"
                  element={
                    session ? (
                      <SccOrgProfilePage session={session} />
                    ) : (
                      <Navigate to="/access" replace />
                    )
                  }
                />

                <Route
                  path="/admin-desk"
                  element={
                    session ? (
                      session.isCoordinator ? (
                        <SccAdminDeskPage session={session} />
                      ) : (
                        <Navigate to="/" replace />
                      )
                    ) : (
                      <Navigate to="/access" replace />
                    )
                  }
                />

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
        message="Are you sure you want to log out of the School Coordinating Council Portal?"
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
      <SccShell />
    </BrowserRouter>
  );
}
