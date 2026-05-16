import { NavLink } from 'react-router-dom';
import type { CoordinatorNavItem } from './nav/coordinatorNavItems';

type CoordinatorSideNavProps = {
  items: CoordinatorNavItem[];
  onLogout: () => void;
};

export function CoordinatorSideNav({ items, onLogout }: CoordinatorSideNavProps) {
  return (
    <aside className="coordinator-side-nav" aria-label="Coordinator sections">
      <nav className="coordinator-side-nav__menu">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `coordinator-side-nav__link ${isActive ? 'coordinator-side-nav__link--active' : ''}`
            }
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              {item.icon}
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="coordinator-side-nav__footer">
        <button className="coordinator-side-nav__logout" type="button" onClick={onLogout}>
          <span className="material-symbols-outlined" aria-hidden="true">
            logout
          </span>
          Logout
        </button>
      </div>
    </aside>
  );
}
