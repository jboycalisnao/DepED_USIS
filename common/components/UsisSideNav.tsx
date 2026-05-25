import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

export type UsisSideNavItem = {
  icon: string;
  iconType?: 'material' | 'fa';
  label: string;
  path: string;
  children?: UsisSideNavItem[];
};

type UsisSideNavProps = {
  items: UsisSideNavItem[];
  onLogout: () => void;
  ariaLabel?: string;
  activePath?: string;
  onItemSelect?: (path: string) => void;
  isMobileOpen?: boolean;
  onMobileOpenChange?: (isOpen: boolean) => void;
  hideInternalMobileToggle?: boolean;
};

export function UsisSideNav({
  items,
  onLogout,
  ariaLabel = 'Subsystem sections',
  activePath,
  onItemSelect,
  isMobileOpen: controlledMobileOpen,
  onMobileOpenChange,
  hideInternalMobileToggle = false,
}: UsisSideNavProps) {
  const isButtonMode = typeof onItemSelect === 'function';
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const isControlled = typeof controlledMobileOpen === 'boolean';
  const isMobileOpen = isControlled ? controlledMobileOpen : internalMobileOpen;
  const setIsMobileOpen = (next: boolean | ((current: boolean) => boolean)) => {
    const computed = typeof next === 'function' ? next(isMobileOpen) : next;
    if (!isControlled) {
      setInternalMobileOpen(computed);
    }
    onMobileOpenChange?.(computed);
  };

  const handleItemSelect = (path: string) => {
    onItemSelect?.(path);
    setIsMobileOpen(false);
  };

  const isPathActive = (itemPath: string) =>
    (activePath || '') === itemPath ||
    (activePath || '').startsWith(`${itemPath}/`) ||
    (typeof window !== 'undefined' &&
      (window.location.pathname === itemPath || window.location.pathname.startsWith(`${itemPath}/`)));

  return (
    <>
      {!hideInternalMobileToggle ? (
        <button
          type="button"
          className="usis-side-nav__mobile-toggle"
          aria-label={isMobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isMobileOpen}
          onClick={() => setIsMobileOpen((current) => !current)}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            menu
          </span>
        </button>
      ) : null}
      {isMobileOpen ? (
        <button
          type="button"
          className="usis-side-nav__mobile-backdrop"
          aria-label="Close navigation menu"
          onClick={() => setIsMobileOpen(false)}
        />
      ) : null}
      <aside
        className={`usis-side-nav ${isMobileOpen ? 'usis-side-nav--mobile-open' : ''}`}
        aria-label={ariaLabel}
      >
        <nav className="usis-side-nav__menu">
          {items.map((item) => {
            if (item.children?.length) {
              const hasActiveChild = item.children.some((child) => isPathActive(child.path));
              return (
                <details
                  key={item.path}
                  className={`usis-side-nav__group ${hasActiveChild ? 'usis-side-nav__group--active' : ''}`}
                  open={hasActiveChild ? true : undefined}
                >
                  <summary className="usis-side-nav__group-summary">
                    {item.iconType === 'fa' ? (
                      <i className={`fa-solid ${item.icon} usis-side-nav__icon`} aria-hidden="true" />
                    ) : (
                      <span className="material-symbols-outlined usis-side-nav__icon" aria-hidden="true">
                        {item.icon}
                      </span>
                    )}
                    <span>{item.label}</span>
                    <span className="material-symbols-outlined usis-side-nav__group-chevron" aria-hidden="true">
                      expand_more
                    </span>
                  </summary>
                  <div className="usis-side-nav__group-items">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={({ isActive }) =>
                          `usis-side-nav__link usis-side-nav__link--nested ${isActive ? 'usis-side-nav__link--active' : ''}`
                        }
                        onClick={() => setIsMobileOpen(false)}
                      >
                        {child.iconType === 'fa' ? (
                          <i className={`fa-solid ${child.icon} usis-side-nav__icon`} aria-hidden="true" />
                        ) : (
                          <span className="material-symbols-outlined usis-side-nav__icon" aria-hidden="true">
                            {child.icon}
                          </span>
                        )}
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                </details>
              );
            }

            if (isButtonMode) {
              const isActive = (activePath || '') === item.path;
              return (
                <button
                  key={item.path}
                  type="button"
                  className={`usis-side-nav__link usis-side-nav__link-button ${isActive ? 'usis-side-nav__link--active' : ''}`}
                  onClick={() => handleItemSelect(item.path)}
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
                onClick={() => setIsMobileOpen(false)}
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
          <button
            className="usis-side-nav__logout"
            type="button"
            onClick={() => {
              setIsMobileOpen(false);
              onLogout();
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="usis-side-nav__logout-icon">
              <path d="M3 4.5h10v15H3v-15Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M13 12h8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="m18 8 4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
