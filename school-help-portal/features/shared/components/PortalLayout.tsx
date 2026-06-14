import { NavLink, Outlet } from 'react-router-dom';
import { UsisGlobalFooter } from '../../../../common/footer/UsisGlobalFooter';
import { UsisUnifiedHeader } from '../../../../common/header/UsisUnifiedHeader';

const navItems = [
  { label: 'Information', to: '/' },
  { label: 'Submit Ticket', to: '/submit-ticket' },
  { label: 'Admin', to: '/admin' },
];

export function PortalLayout() {
  return (
    <div className="school-help-portal-app">
      <header className="site-chrome">
        <div className="content-width">
          <UsisUnifiedHeader homeHref="/" />
          <nav className="kit-nav school-help-portal-nav" aria-label="School Help Portal sections">
            <div className="kit-nav__grid">
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to} className={({ isActive }) => `kit-nav__link${isActive ? ' kit-nav__link--active' : ''}`}>
                  {item.label}
                </NavLink>
              ))}
            </div>
          </nav>
        </div>
      </header>

      <main className="page-frame school-help-portal-main">
        <div className="content-width school-help-portal-content">
          <Outlet />
        </div>
      </main>

      <UsisGlobalFooter />
    </div>
  );
}
