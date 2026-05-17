import React from 'react';
import { useLocation } from 'react-router-dom';
import { useStore } from '../store';
import { RegistrarHeader } from './shell/RegistrarHeader';
import { RegistrarFooter } from './shell/RegistrarFooter';
import { registrarNavItems } from './layout/nav/registrarNavItems';
import { UsisSideNav } from '../../common/components/UsisSideNav';
import { UsisBreadcrumbBar } from '../../common/components/UsisBreadcrumbBar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { logout, registrarAccess } = useStore();
  const location = useLocation();
  const isPathActive = (itemPath: string) =>
    itemPath === '/' ? location.pathname === '/' : location.pathname === itemPath || location.pathname.startsWith(`${itemPath}/`);

  const currentSection = registrarNavItems.find((item) => isPathActive(item.path)) || registrarNavItems[0];

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
            onLogout={logout}
          />
          <div className="registrar-layout">
            <UsisSideNav items={registrarNavItems} onLogout={logout} ariaLabel="Registrar sections" />
            <div className="registrar-content">{children}</div>
          </div>
        </div>
      </main>

      <RegistrarFooter />
    </div>
  );
};

export default Layout;
