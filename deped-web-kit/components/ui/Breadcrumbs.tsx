import { Link, useLocation } from 'react-router-dom';
import { kitRoutes } from '@/features/navigation/config/routes';

export function Breadcrumbs() {
  const location = useLocation();
  const currentRoute = kitRoutes.find((route) => route.path === location.pathname);

  return (
    <nav className="mt-[18px] px-[var(--page-inset)]" aria-label="Breadcrumb">
      <ol className="m-0 flex list-none flex-wrap gap-[10px] p-0 text-[0.95rem] text-deped-muted">
        <li className="flex items-center">
          <Link className="hover:text-deped-blue" to="/overview">
            DepED-Web-Kit
          </Link>
        </li>
        {currentRoute && currentRoute.path !== '/overview' ? (
          <li
            aria-current="page"
            className="flex items-center before:mr-[10px] before:content-['>']"
          >
            {currentRoute.label}
          </li>
        ) : null}
      </ol>
    </nav>
  );
}
