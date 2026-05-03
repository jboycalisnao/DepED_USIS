
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../store';
import { RegistrarHeader } from './shell/RegistrarHeader';
import { RegistrarFooter } from './shell/RegistrarFooter';
import { SchoolYearDropdown } from './ui/SchoolYearDropdown';
import { registrarSchoolIdentity } from '../config/schoolIdentity';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { activeSchoolYear, setSchoolYear, schoolYears, refreshData, logout } = useStore();
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
            {activeSchoolYear.isLocked && (
              <div className="registrar-status registrar-status--locked">
                <span className="material-symbols-outlined" aria-hidden="true">lock</span>
                <strong>Read-Only Archive</strong>
              </div>
            )}
            <SchoolYearDropdown
              activeSchoolYear={activeSchoolYear}
              schoolYears={schoolYears}
              onChange={setSchoolYear}
            />
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
            <div className="registrar-school-identity">
              <p className="page-intro__eyebrow">Registrar Workspace</p>
              <h2>{registrarSchoolIdentity.schoolName}</h2>
              <dl aria-label="School identity">
                <div>
                  <dt>School ID</dt>
                  <dd>{registrarSchoolIdentity.schoolId}</dd>
                </div>
                <div>
                  <dt>Division</dt>
                  <dd>{registrarSchoolIdentity.division}</dd>
                </div>
                <div>
                  <dt>Region</dt>
                  <dd>{registrarSchoolIdentity.region}</dd>
                </div>
              </dl>
            </div>
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
