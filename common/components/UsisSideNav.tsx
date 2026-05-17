import React from 'react';
import { NavLink } from 'react-router-dom';

export type UsisSideNavItem = {
  icon: string;
  iconType?: 'material' | 'fa';
  label: string;
  path: string;
};

type UsisSideNavProps = {
  items: UsisSideNavItem[];
  onLogout: () => void;
  ariaLabel?: string;
  activePath?: string;
  onItemSelect?: (path: string) => void;
};

export function UsisSideNav({
  items,
  onLogout,
  ariaLabel = 'Subsystem sections',
  activePath,
  onItemSelect,
}: UsisSideNavProps) {
  const isButtonMode = typeof onItemSelect === 'function';

  return (
    <aside className="usis-side-nav" aria-label={ariaLabel}>
      <nav className="usis-side-nav__menu">
        {items.map((item) => {
          if (isButtonMode) {
            const isActive = (activePath || '') === item.path;
            return (
              <button
                key={item.path}
                type="button"
                className={`usis-side-nav__link usis-side-nav__link-button ${isActive ? 'usis-side-nav__link--active' : ''}`}
                onClick={() => onItemSelect(item.path)}
              >
                {item.iconType === 'fa' ? (
                  <i className={`fa-solid ${item.icon} usis-side-nav__icon`} aria-hidden="true" />
                ) : (
                  <span className="material-symbols-outlined usis-side-nav__icon" aria-hidden="true">
                    {item.icon}
                  </span>
                )}
                {item.label}
              </button>
            );
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `usis-side-nav__link ${isActive ? 'usis-side-nav__link--active' : ''}`}
            >
              {item.iconType === 'fa' ? (
                <i className={`fa-solid ${item.icon} usis-side-nav__icon`} aria-hidden="true" />
              ) : (
                <span className="material-symbols-outlined usis-side-nav__icon" aria-hidden="true">
                  {item.icon}
                </span>
              )}
              {item.label}
            </NavLink>
          );
        })}
      </nav>
      <div className="usis-side-nav__footer">
        <button className="usis-side-nav__logout" type="button" onClick={onLogout}>
          <svg viewBox="0 0 24 24" aria-hidden="true" className="usis-side-nav__logout-icon">
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
