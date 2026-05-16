import React from 'react';
import { NavLink } from 'react-router-dom';
import { RegistrarNavItem } from './nav/registrarNavItems';

type RegistrarSideNavProps = {
  items: RegistrarNavItem[];
  onLogout: () => void;
};

export function RegistrarSideNav({ items, onLogout }: RegistrarSideNavProps) {
  return (
    <aside className="registrar-side-nav" aria-label="Registrar sections">
      <nav className="registrar-side-nav__menu">
        {items.map((item) => {
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `registrar-side-nav__link ${isActive ? 'registrar-side-nav__link--active' : ''}`}
            >
              <span className="material-symbols-outlined" aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          );
        })}
      </nav>
      <div className="registrar-side-nav__footer">
        <button className="registrar-side-nav__logout" type="button" onClick={onLogout}>
          <svg viewBox="0 0 24 24" aria-hidden="true" className="registrar-logout-icon">
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
