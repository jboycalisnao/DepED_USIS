import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useStore } from '../store';
import { RegistrarHeader } from './shell/RegistrarHeader';
import { RegistrarFooter } from './shell/RegistrarFooter';
import { registrarNavItems } from './layout/nav/registrarNavItems';
import { UsisSideNav } from '../../common/components/UsisSideNav';
import { UsisBreadcrumbBar } from '../../common/components/UsisBreadcrumbBar';
import { resolveCoordinatorDepartmentAccess } from '../../common/auth/coordinatorDepartmentAccess';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { logout, registrarAccess } = useStore();
  const location = useLocation();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [departmentLabel, setDepartmentLabel] = useState(
    registrarAccess?.departmentName?.trim() ? registrarAccess.departmentName : 'Not Assigned',
  );
  const isPathActive = (itemPath: string) =>
    itemPath === '/' ? location.pathname === '/' : location.pathname === itemPath || location.pathname.startsWith(`${itemPath}/`);

  const currentSection = registrarNavItems.find((item) => isPathActive(item.path)) || registrarNavItems[0];

  useEffect(() => {
    let cancelled = false;
    const syncDepartment = async () => {
      const current = registrarAccess?.departmentName?.trim();
      if (current) {
        setDepartmentLabel(current);
        return;
      }
      if (!registrarAccess?.userId) return;
      const resolved = await resolveCoordinatorDepartmentAccess(registrarAccess.userId);
      const next = String(resolved.departmentName || '').trim() || 'Not Assigned';
      if (!cancelled) setDepartmentLabel(next);
    };
    void syncDepartment();
    return () => {
      cancelled = true;
    };
  }, [registrarAccess?.userId, registrarAccess?.departmentName]);

  return (
    <div className="registrar-shell">
      <RegistrarHeader />

      <main className="page-frame registrar-main">
        <div className="content-width">
          <UsisBreadcrumbBar
            rootLabel="Admin Panel"
            currentLabel={currentSection.label}
            profileName={registrarAccess?.coordinatorName || null}
            profileRole={registrarAccess?.coordinatorRole || 'School Coordinator'}
            profileSubtitle={`Department: ${departmentLabel}`}
            onLogout={logout}
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
          <div className="registrar-layout">
            <UsisSideNav
              items={registrarNavItems}
              onLogout={logout}
              ariaLabel="Registrar sections"
              isMobileOpen={isMobileNavOpen}
              onMobileOpenChange={setIsMobileNavOpen}
              hideInternalMobileToggle
            />
            <div className="registrar-content">{children}</div>
          </div>
        </div>
      </main>

      <RegistrarFooter />
    </div>
  );
};

export default Layout;
