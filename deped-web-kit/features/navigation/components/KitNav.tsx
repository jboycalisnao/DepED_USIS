import { NavLink } from 'react-router-dom';
import { kitRoutes } from '../config/routes';

export function KitNav() {
  return (
    <nav
      className="border-b border-[var(--deped-line)] px-[var(--page-inset)]"
      aria-label="DepED Web Kit sections"
    >
      <div className="flex flex-wrap items-center gap-5 py-5 md:gap-10 lg:gap-16">
        {kitRoutes.map((route) => (
          <NavLink
            key={route.path}
            to={route.path}
            className={({ isActive }) =>
              [
                'inline-flex items-center text-[0.98rem] font-bold tracking-[0.02em] uppercase transition-colors',
                isActive ? 'text-deped-blue' : 'text-[#8a8a8a] hover:text-deped-blue',
              ].join(' ')
            }
          >
            <strong>{route.label}</strong>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
