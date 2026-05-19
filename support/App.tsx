import { useMemo, useState } from 'react';
import { BrowserRouter, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { UsisUnifiedHeader } from '../common/header/UsisUnifiedHeader';
import { UsisGlobalFooter } from '../common/footer/UsisGlobalFooter';
import { UsisSideNav } from '../common/components/UsisSideNav';
import { UsisBreadcrumbBar } from '../common/components/UsisBreadcrumbBar';
import { supportNavItems } from './features/support/layout/nav/supportNavItems';
import { OverviewPage } from './features/support/pages/OverviewPage';
import { AccessPage } from './features/support/pages/AccessPage';
import { ClinicAdminPage } from './features/support/clinic/ClinicAdminPage';
import { GuidanceAdminPage } from './features/support/pages/admin/GuidanceAdminPage';
import {
  clearStoredSupportAccess,
  getStoredSupportAccess,
  storeSupportAccess,
  type SupportAccessRecord,
} from './features/support/utils/supportAccess';

function SupportShell() {
  const location = useLocation();
  const [session, setSession] = useState<SupportAccessRecord | null>(() => getStoredSupportAccess());
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const currentSectionLabel = useMemo(() => {
    const match = supportNavItems.find((item) =>
      item.path === '/'
        ? location.pathname === '/'
        : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`),
    );
    return match?.label || 'Home';
  }, [location.pathname]);

  const handleLogout = () => {
    clearStoredSupportAccess();
    setSession(null);
  };

  const guestNavItems = supportNavItems.filter((item) => item.path === '/' || item.path === '/access');

  return (
    <div className="support-app">
      <header className="site-chrome">
        <div className="content-width">
          <UsisUnifiedHeader searchId="support-search" searchLabel="Search learner support portal" />
          {!session ? (
            <nav className="kit-nav support-top-nav" aria-label="Support portal sections">
              <div className="kit-nav__grid">
                {guestNavItems.map((item) => {
                  const isActive =
                    item.path === '/'
                      ? location.pathname === '/'
                      : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/'}
                      className={`kit-nav__link ${isActive ? 'kit-nav__link--active' : ''}`}
                    >
                      {item.label}
                    </NavLink>
                  );
                })}
              </div>
            </nav>
          ) : null}
        </div>
      </header>

      <main className="page-frame support-main">
        <div className="content-width">
          {session ? (
            <UsisBreadcrumbBar
              rootLabel="Support Portal"
              currentLabel={currentSectionLabel}
              profileName={session.coordinatorName}
              profileRole={session.coordinatorRole || null}
              onLogout={handleLogout}
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
          <section className={session ? 'support-admin-shell' : 'support-guest-shell'}>
            {session ? (
              <UsisSideNav
                items={supportNavItems}
                onLogout={handleLogout}
                ariaLabel="Support portal sections"
                isMobileOpen={isMobileNavOpen}
                onMobileOpenChange={setIsMobileNavOpen}
                hideInternalMobileToggle
              />
            ) : null}
            <div className="support-content">
              <Routes>
                <Route path="/" element={<OverviewPage />} />
                <Route
                  path="/access"
                  element={
                    <AccessPage
                      session={session}
                      onLoginSuccess={(record) => {
                        storeSupportAccess(record);
                        setSession(record);
                      }}
                      onLogout={handleLogout}
                    />
                  }
                />
                <Route
                  path="/admin/clinic"
                  element={session ? <ClinicAdminPage /> : <Navigate to="/access" replace />}
                />
                <Route
                  path="/admin/guidance"
                  element={session ? <GuidanceAdminPage /> : <Navigate to="/access" replace />}
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </section>
        </div>
      </main>

      <UsisGlobalFooter />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <SupportShell />
    </BrowserRouter>
  );
}
