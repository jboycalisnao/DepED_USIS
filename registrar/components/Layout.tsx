import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const isPathActive = (itemPath: string) =>
    itemPath === '/' ? location.pathname === '/' : location.pathname === itemPath || location.pathname.startsWith(`${itemPath}/`);

  const currentSection = registrarNavItems.find((item) => isPathActive(item.path)) || registrarNavItems[0];
  const profileInitials = useMemo(() => {
    const sourceName = String(registrarAccess?.coordinatorName || '').trim();
    if (!sourceName) return 'U';
    const tokens = sourceName.split(/\s+/).slice(0, 2);
    return tokens.map((token) => token.charAt(0).toUpperCase()).join('');
  }, [registrarAccess?.coordinatorName]);

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
    <div className="registrar-shell">
      <RegistrarHeader
        actions={
          <>
            {registrarAccess?.coordinatorName && (
              <div className="registrar-profile-menu" ref={profileMenuRef}>
                <button
                  type="button"
                  className="registrar-user registrar-user--button"
                  title={registrarAccess.coordinatorRole || 'Signed-in user'}
                  aria-haspopup="menu"
                  aria-expanded={isProfileOpen}
                  onClick={() => setIsProfileOpen((current) => !current)}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    account_circle
                  </span>
                  <div>
                    <span>Signed in</span>
                    <strong>{registrarAccess.coordinatorName}</strong>
                  </div>
                </button>

                {isProfileOpen ? (
                  <div className="registrar-profile-popover" role="menu" aria-label="Profile menu">
                    <div className="registrar-profile-popover__avatar" aria-hidden="true">
                      {profileInitials}
                    </div>
                    <p className="registrar-profile-popover__name">{registrarAccess.coordinatorName}</p>
                    <p className="registrar-profile-popover__meta">{registrarAccess.coordinatorRole || 'School Coordinator'}</p>
                    <div className="registrar-profile-popover__divider" />
                    <button type="button" className="registrar-profile-popover__logout" onClick={logout}>
                      <svg viewBox="0 0 24 24" aria-hidden="true" className="registrar-logout-icon">
                        <path d="M3 4.5h10v15H3v-15Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M13 12h8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        <path d="m18 8 4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Logout
                    </button>
                  </div>
                ) : null}
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
