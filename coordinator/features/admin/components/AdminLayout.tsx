import { useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  clearStoredCoordinatorAccess,
  getStoredCoordinatorAccess,
} from '@/features/auth/utils/coordinatorAccess';
import { CoordinatorSideNav } from '../layout/CoordinatorSideNav';
import { coordinatorNavItems } from '../layout/nav/coordinatorNavItems';

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const access = getStoredCoordinatorAccess();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const isPathActive = (itemPath: string) =>
    location.pathname === itemPath || location.pathname.startsWith(`${itemPath}/`);

  const currentSection = coordinatorNavItems.find((item) => isPathActive(item.path)) || coordinatorNavItems[0];
  const profileInitials = useMemo(() => {
    const sourceName = String(access?.coordinatorName || '').trim();
    if (!sourceName) return 'U';
    const tokens = sourceName.split(/\s+/).slice(0, 2);
    return tokens.map((token) => token.charAt(0).toUpperCase()).join('');
  }, [access?.coordinatorName]);

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

  const handleLogout = () => {
    clearStoredCoordinatorAccess();
    navigate('/login', { replace: true });
  };

  return (
    <section className="coordinator-admin-shell">
      <section className="coordinator-page-intro" aria-label="Current coordinator page">
        <p className="coordinator-breadcrumb">
          <span className="coordinator-breadcrumb__root">Coordinator Portal</span>
          <span className="coordinator-breadcrumb__sep" aria-hidden="true">
            /
          </span>
          <span className="coordinator-breadcrumb__current">{currentSection.label}</span>
        </p>
        <div className="coordinator-profile-menu" ref={profileMenuRef}>
          <button
            type="button"
            className="coordinator-profile-trigger"
            aria-haspopup="menu"
            aria-expanded={isProfileOpen}
            onClick={() => setIsProfileOpen((current) => !current)}
          >
            <span className="coordinator-profile-trigger__avatar" aria-hidden="true">
              {profileInitials}
            </span>
          </button>
          {isProfileOpen ? (
            <div className="coordinator-profile-popover" role="menu" aria-label="Coordinator profile menu">
              <div className="coordinator-profile-popover__avatar" aria-hidden="true">
                {profileInitials}
              </div>
              <p className="coordinator-profile-popover__name">{access?.coordinatorName || 'Coordinator'}</p>
              <p className="coordinator-profile-popover__meta">{access?.coordinatorRole || 'School USIS Coordinator'}</p>
              <p className="coordinator-profile-popover__meta">{access?.schoolId || 'N/A'} • {access?.schoolName || 'USIS School'}</p>
              <div className="coordinator-profile-popover__divider" />
              <button type="button" className="coordinator-profile-popover__logout" onClick={handleLogout}>
                <span className="material-symbols-outlined" aria-hidden="true">
                  logout
                </span>
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <div className="coordinator-admin-layout">
        <CoordinatorSideNav items={coordinatorNavItems} onLogout={handleLogout} />
        <div className="coordinator-admin-content">
          <Outlet />
        </div>
      </div>
    </section>
  );
}
