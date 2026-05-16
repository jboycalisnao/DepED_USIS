import React from 'react';
import { useLocation } from 'react-router-dom';
import { useStore } from '../store';
import { RegistrarHeader } from './shell/RegistrarHeader';
import { RegistrarFooter } from './shell/RegistrarFooter';
import { RegistrarSideNav } from './layout/RegistrarSideNav';
import { registrarNavItems } from './layout/nav/registrarNavItems';

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
      <RegistrarHeader
        actions={
          <>
            {registrarAccess?.coordinatorName && (
              <div className="registrar-user" title={registrarAccess.coordinatorRole || 'Signed-in user'}>
                <span className="material-symbols-outlined" aria-hidden="true">
                  account_circle
                </span>
                <div>
                  <span>Signed in</span>
                  <strong>{registrarAccess.coordinatorName}</strong>
                </div>
              </div>
            )}
          </>
        }
      />

      <main className="page-frame registrar-main">
        <div className="content-width">
          <section className="registrar-page-intro" aria-label="Current registrar page">
            <p className="registrar-breadcrumb">
              <span className="registrar-breadcrumb__root">Admin Panel</span>
              <span className="registrar-breadcrumb__sep" aria-hidden="true">
                /
              </span>
              <span className="registrar-breadcrumb__current">{currentSection.label}</span>
            </p>
          </section>
          <div className="registrar-layout">
            <RegistrarSideNav items={registrarNavItems} onLogout={logout} />
            <div className="registrar-content">{children}</div>
          </div>
        </div>
      </main>

      <RegistrarFooter />
    </div>
  );
};

export default Layout;
