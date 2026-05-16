import { NavLink } from 'react-router-dom';
import type { LearnerNavItem } from './nav/learnerNavItems';

type LearnerSideNavProps = {
  items: LearnerNavItem[];
  onLogout: () => void;
};

export function LearnerSideNav({ items, onLogout }: LearnerSideNavProps) {
  return (
    <aside className="learner-side-nav" aria-label="Learner portal sections">
      <nav className="learner-side-nav__menu">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => `learner-side-nav__link ${isActive ? 'learner-side-nav__link--active' : ''}`}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              {item.icon}
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="learner-side-nav__footer">
        <button className="learner-side-nav__logout" type="button" onClick={onLogout}>
          <svg viewBox="0 0 24 24" aria-hidden="true" className="learner-logout-icon">
            <path d="M3 4.5h10v15H3v-15Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M13 12h8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="m18 8 4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Logout
        </button>
      </div>
    </aside>
  );
}
