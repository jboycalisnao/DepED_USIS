import { NavLink } from 'react-router-dom';
import { coordinatorRoutes } from '../config/routes';

export function CoordinatorNav() {
  return (
    <nav className="kit-nav" aria-label="Coordinator sections">
      <div className="kit-nav__grid">
        {coordinatorRoutes.filter((route) => route.showInNav).map((route) => (
          <NavLink
            key={route.path}
            to={route.path}
            className={({ isActive }) =>
              `kit-nav__link${isActive ? ' kit-nav__link--active' : ''}`
            }
          >
            {route.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
