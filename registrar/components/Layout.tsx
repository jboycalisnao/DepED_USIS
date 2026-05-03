
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../store';
import { RegistrarHeader } from './shell/RegistrarHeader';
import { RegistrarFooter } from './shell/RegistrarFooter';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { activeSchoolYear, setSchoolYear, schoolYears, connectionError, refreshData, logout } = useStore();
  const location = useLocation();

  const menuItems = [
    { label: 'Dashboard', path: '/', icon: 'dashboard' },
    { label: 'Learners', path: '/learners', icon: 'groups' },
    { label: 'Enrollment', path: '/enroll', icon: 'app_registration' },
    { label: 'Section/s', path: '/sections', icon: 'meeting_room' },
    { label: 'Bulk Import', path: '/import', icon: 'upload_file' },
    { label: 'Settings', path: '/settings', icon: 'settings' },
  ];

  const currentSection = menuItems.find((item) => item.path === location.pathname) || menuItems[0];

  return (
    <>
      <RegistrarHeader
        actions={
          <>
            <div className="registrar-status" data-state={connectionError ? 'offline' : 'online'}>
              <span aria-hidden="true" />
              <strong>{connectionError ? 'Local Mode' : 'Online'}</strong>
            </div>
            {activeSchoolYear.isLocked && (
              <div className="registrar-status registrar-status--locked">
                <span className="material-symbols-outlined" aria-hidden="true">lock</span>
                <strong>Read-Only Archive</strong>
              </div>
            )}
            <label className="registrar-year">
              <span>School Year</span>
              <select value={activeSchoolYear.id} onChange={(event) => setSchoolYear(event.target.value)}>
                {schoolYears.map((schoolYear) => (
                  <option key={schoolYear.id} value={schoolYear.id}>
                    {schoolYear.label} {schoolYear.isLocked ? '(Locked)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <button className="registrar-icon-button" type="button" onClick={() => refreshData(true)} aria-label="Refresh registrar data">
              <span className="material-symbols-outlined" aria-hidden="true">refresh</span>
            </button>
            <button className="registrar-signout" type="button" onClick={logout}>
              <span className="material-symbols-outlined" aria-hidden="true">logout</span>
              Sign Out
            </button>
          </>
        }
      >
        <nav className="kit-nav" aria-label="Registrar sections">
          <div className="kit-nav__grid">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path} className={`kit-nav__link ${isActive ? 'kit-nav__link--active' : ''}`}>
                  <span className="material-symbols-outlined" aria-hidden="true">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </RegistrarHeader>

      <main className="page-frame registrar-main">
        <div className="content-width">
          <section className="registrar-page-intro" aria-label="Current registrar section">
            <p className="page-intro__eyebrow">Registrar Workspace</p>
            <div>
              <h1>{currentSection.label}</h1>
              <p>SY {activeSchoolYear.label}</p>
            </div>
          </section>
          <div className="registrar-content">
            {children}
          </div>
        </div>
      </main>

      <RegistrarFooter />
    </>
  );
};

export default Layout;
