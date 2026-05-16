import { Outlet, useLocation } from 'react-router-dom';
import { SiteFooter } from './SiteFooter';
import { UsisUnifiedHeader } from '../../../common/header/UsisUnifiedHeader';

function PortalNav() {
  const location = useLocation();
  const routeMatch = location.pathname.match(/^\/admissions\/([^/]+)\/([^/]+)\/([^/]+)/);
  const [, regionSlug, divisionSlug, schoolId] = routeMatch || [];
  const portalBase =
    regionSlug && divisionSlug && schoolId
      ? `/admissions/${regionSlug}/${divisionSlug}/${schoolId}`
      : '/admissions/region-vi/iloilo/302345';
  const isPortalLanding = location.pathname === portalBase;

  const navItems = [
    { hash: 'admissions', label: 'Admissions' },
    { hash: 'bulletins', label: 'Bulletins' },
    { hash: 'requirements', label: 'Requirements' },
    { hash: 'contact', label: 'Contact' },
  ];

  return (
    <nav className="kit-nav" aria-label="SP Portal sections">
      <div className="kit-nav__grid">
        {navItems.map((item) => (
          <a
            className={`kit-nav__link ${item.hash === 'admissions' ? 'kit-nav__link--active' : ''}`}
            href={`${isPortalLanding ? '' : portalBase}#${item.hash}`}
            key={item.hash}
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

export function AppLayout() {
  return (
    <>
      <header className="site-chrome">
        <div className="content-width">
          <UsisUnifiedHeader searchId="portal-search" searchLabel="Search SP Portal" />
          <PortalNav />
        </div>
      </header>
      <main className="page-frame">
        <div className="content-width">
          <Outlet />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
