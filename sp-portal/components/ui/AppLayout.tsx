import { Outlet, useLocation } from 'react-router-dom';
import { SiteFooter } from './SiteFooter';
import spPortalHeaderLogo from '../../../common/assets/SP-Portal_Header_Logo.png';

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
          <div className="brand-header">
            <div className="brand-header__utility">
              <span>Department of Education</span>
              <span>DepED USIS - SP Portal</span>
            </div>
            <div className="brand-header__main">
              <div className="brand-header__identity">
                <img className="brand-header__logo" src={spPortalHeaderLogo} alt="DepED USIS SP Portal header logo" />
              </div>
              <form
                className="brand-header__search"
                role="search"
                onSubmit={(event) => event.preventDefault()}
              >
                <label htmlFor="portal-search" className="sr-only">
                  Search SP Portal
                </label>
                <input id="portal-search" type="search" placeholder="Keywords" />
                <button type="submit">Search</button>
              </form>
            </div>
          </div>
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
