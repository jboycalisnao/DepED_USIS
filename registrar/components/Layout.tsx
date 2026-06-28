import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { RegistrarHeader } from './shell/RegistrarHeader';
import { RegistrarFooter } from './shell/RegistrarFooter';
import { registrarNavItems } from './layout/nav/registrarNavItems';
import { UsisSideNav } from '../../common/components/UsisSideNav';
import { UsisBreadcrumbBar } from '../../common/components/UsisBreadcrumbBar';
import { resolveCoordinatorDepartmentAccess } from '../../common/auth/coordinatorDepartmentAccess';
import { resolveAdviserLinkedSections } from '../views/adviser-learners/utils/adviserLearnerAccess';
import AdviserRegistrarNoticeModal from './AdviserRegistrarNoticeModal';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { logout, registrarAccess, sections, activeSchoolYear } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [departmentLabel, setDepartmentLabel] = useState(
    registrarAccess?.departmentName?.trim() ? registrarAccess.departmentName : 'Not Assigned',
  );
  const isPathActive = (itemPath: string) =>
    itemPath === '/' ? location.pathname === '/' : location.pathname === itemPath || location.pathname.startsWith(`${itemPath}/`);

  const currentSection = registrarNavItems.find((item) => isPathActive(item.path)) || registrarNavItems[0];
  const isAdviserLearnersRoute = location.pathname === '/my-section-learners' || location.pathname.startsWith('/my-section-learners/');
  const adviserLinkedSections = resolveAdviserLinkedSections(
    sections,
    registrarAccess?.coordinatorName || '',
    registrarAccess?.coordinatorUsername || '',
    activeSchoolYear,
  );
  const isAdviserScopedAccess =
    registrarAccess?.coordinatorRole === 'school_usis_coordinator' &&
    adviserLinkedSections.length > 0;
  const isEnrollmentRoute = location.pathname === '/enroll' || location.pathname.startsWith('/enroll/');
  const [isAdviserNoticeOpen, setIsAdviserNoticeOpen] = useState(isAdviserScopedAccess);
  const adviserClassNames = useMemo(
    () => adviserLinkedSections.map((section) => section.name).join(', '),
    [adviserLinkedSections],
  );
  const visibleNavItems = isAdviserScopedAccess
    ? registrarNavItems.filter((item) => item.path === '/learners' || item.path === '/enroll')
    : registrarNavItems.filter((item) => item.path !== '/my-section-learners' || adviserLinkedSections.length > 0);

  useEffect(() => {
    let cancelled = false;
    const syncDepartment = async () => {
      const current = registrarAccess?.departmentName?.trim();
      if (current) {
        setDepartmentLabel(current);
        return;
      }
      if (!registrarAccess?.userId) return;
      const resolved = await resolveCoordinatorDepartmentAccess(registrarAccess.userId);
      const next = String(resolved.departmentName || '').trim() || 'Not Assigned';
      if (!cancelled) setDepartmentLabel(next);
    };
    void syncDepartment();
    return () => {
      cancelled = true;
    };
  }, [registrarAccess?.userId, registrarAccess?.departmentName]);

  useEffect(() => {
    setIsAdviserNoticeOpen(isAdviserScopedAccess);
  }, [isAdviserScopedAccess]);

  useEffect(() => {
    if (!isAdviserScopedAccess || isAdviserNoticeOpen || location.pathname === '/learners' || isEnrollmentRoute) {
      return;
    }
    navigate('/learners', { replace: true });
  }, [isAdviserNoticeOpen, isAdviserScopedAccess, isEnrollmentRoute, location.pathname, navigate]);

  const handleContinueToAdviserView = () => {
    setIsAdviserNoticeOpen(false);
    if (isEnrollmentRoute) {
      return;
    }
    if (location.pathname !== '/learners') {
      navigate('/learners', { replace: true });
    }
  };

  return (
    <div className="registrar-shell">
      <RegistrarHeader />

      <main className="page-frame registrar-main">
        <div className="content-width">
          <UsisBreadcrumbBar
            rootLabel="Admin Panel"
            currentLabel={currentSection.label}
            profileName={registrarAccess?.coordinatorName || null}
            profileRole={registrarAccess?.coordinatorRole || 'School Coordinator'}
            profileSubtitle={`Department: ${departmentLabel}`}
            onLogout={logout}
            leftActions={
              <button
                type="button"
                className="usis-side-nav__mobile-toggle usis-side-nav__mobile-toggle--inline"
                aria-label={isMobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={isMobileNavOpen}
                onClick={() => setIsMobileNavOpen((current) => !current)}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  menu
                </span>
              </button>
            }
          />
          <div className="registrar-layout">
            <UsisSideNav
              items={visibleNavItems}
              onLogout={logout}
              ariaLabel="Registrar sections"
              isMobileOpen={isMobileNavOpen}
              onMobileOpenChange={setIsMobileNavOpen}
              hideInternalMobileToggle
            />
            <div className={`registrar-content${isAdviserLearnersRoute ? ' registrar-content--adviser-learners' : ''}`}>{!isAdviserNoticeOpen ? children : null}</div>
          </div>
        </div>
      </main>

      <RegistrarFooter />
      <AdviserRegistrarNoticeModal
        open={isAdviserNoticeOpen}
        advisoryClassNames={adviserClassNames || 'your advisory class'}
        onContinue={handleContinueToAdviserView}
      />
    </div>
  );
};

export default Layout;
