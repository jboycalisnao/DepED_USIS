import React from 'react';
import { NavLink } from 'react-router-dom';
import { SystemConfig } from '../../types';
import { UsisUnifiedHeader } from '../../../common/header/UsisUnifiedHeader';
import { UsisGlobalFooter } from '../../../common/footer/UsisGlobalFooter';

interface PublicLayoutProps {
  children: React.ReactNode;
  config: SystemConfig;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen flex-col bg-slate-100 text-slate-900">
      <header className="site-chrome">
        <div className="content-width">
          <UsisUnifiedHeader />
          <nav className="kit-nav" aria-label="SPTA portal sections">
            <div className="kit-nav__grid">
              <NavLink to="/" end className={({ isActive }) => `kit-nav__link ${isActive ? 'kit-nav__link--active' : ''}`}>Overview</NavLink>
              <NavLink to="/parent" className={({ isActive }) => `kit-nav__link ${isActive ? 'kit-nav__link--active' : ''}`}>Parent</NavLink>
              <NavLink to="/adviser" className={({ isActive }) => `kit-nav__link ${isActive ? 'kit-nav__link--active' : ''}`}>Adviser</NavLink>
              <NavLink to="/access" className={({ isActive }) => `kit-nav__link ${isActive ? 'kit-nav__link--active' : ''}`}>Access</NavLink>
            </div>
          </nav>
        </div>
      </header>
      <main className="page-frame flex-1">
        <div className="content-width p-4 md:p-8">
        {children}
        </div>
      </main>
      <UsisGlobalFooter />
    </div>
  );
};
