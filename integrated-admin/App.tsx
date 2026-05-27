import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { UsisUnifiedHeader } from '../common/header/UsisUnifiedHeader';
import { UsisGlobalFooter } from '../common/footer/UsisGlobalFooter';
import UsisPageLoader from '../common/components/UsisPageLoader';
import { UsisSideNav, type UsisSideNavItem } from '../common/components/UsisSideNav';
import { UsisBreadcrumbBar } from '../common/components/UsisBreadcrumbBar';
import { IntegratedAdminLoginPage } from './features/auth/pages/IntegratedAdminLoginPage';
import {
  clearStoredIntegratedAdminAccess,
  getStoredIntegratedAdminAccess,
  resolveIntegratedAdminAccess,
  storeIntegratedAdminAccess,
  type IntegratedAdminAccessRecord,
} from './features/auth/services/integratedAdminAccess';
import {
  clearStoredCoordinatorAccess,
  storeCoordinatorAccess,
} from '../coordinator/features/auth/utils/coordinatorAccess';
import { CoordinatorFunctionPage } from './features/functions/coordinator/CoordinatorFunctionPage';
import { DepartmentsPage } from './features/functions/coordinator/departments/pages/DepartmentsPage';
import { LearnerBasedCredentialsPage } from './features/functions/coordinator/learner-credentials/LearnerBasedCredentialsPage';
import { TeachingNonTeachingCredentialsPage } from './features/functions/coordinator/pages/TeachingNonTeachingCredentialsPage';
import { SubjectsManagementPage } from './features/functions/grades-subjects/pages/SubjectsManagementPage';
import { SubjectManagementPage } from './features/functions/grades-subjects/subject-management/pages/SubjectManagementPage';
import { TimeSlotsPage } from './features/functions/grades-subjects/time-slots/pages/TimeSlotsPage';
import { MerchandiseControlPage } from './features/functions/merchandise/MerchandiseControlPage';
import { MerchOrderControlPage } from './features/functions/merchandise/MerchOrderControlPage';
import { MerchOrderPaymentPage } from './features/functions/merchandise/MerchOrderPaymentPage';
import { MerchOrderCountsPage } from './features/functions/merchandise/MerchOrderCountsPage';
import { resolveCoordinatorDepartmentAccess } from '../common/auth/coordinatorDepartmentAccess';

function IntegratedAdminOverview({
  session,
}: {
  session: IntegratedAdminAccessRecord;
}) {
  return (
    <section className="section-shell integrated-admin-workspace">
      <article className="portal-panel">
        <div className="portal-panel__header">
          <h2>Integrated Admin Workspace</h2>
          <p>Signed in as {session.coordinatorName}.</p>
        </div>
        <div className="portal-panel__body">
          <p>
            This subsystem is connected to coordinator credentials and ready for module-level configuration work.
          </p>
          <p>
            <strong>Role:</strong> {session.role}
          </p>
          <p>
            <strong>School:</strong> {session.schoolName}
          </p>
          <p>
            Open <strong>Coordinator Portal Functions</strong> to manage credentials and registry inside IA.
          </p>
        </div>
      </article>
    </section>
  );
}

const iaNavItems: UsisSideNavItem[] = [
  { path: '/', label: 'Overview', icon: 'dashboard' },
  {
    path: '/functions/coordinator',
    label: 'Coordinator',
    icon: 'admin_panel_settings',
    children: [
      { path: '/functions/coordinator/departments', label: 'Departments', icon: 'apartment' },
      { path: '/functions/coordinator/teaching-non-teaching', label: 'Teaching & Non-Teaching', icon: 'groups' },
      { path: '/functions/coordinator/learner-credentials', label: 'Learner-based Credentials', icon: 'school' },
    ],
  },
  {
    path: '/functions/merch',
    label: 'Merch',
    icon: 'inventory_2',
    children: [
      { path: '/functions/merchandise-control', label: 'Merchandise Control', icon: 'storefront' },
      { path: '/functions/merch-control', label: 'Orders', icon: 'shopping_bag' },
      { path: '/functions/order-payment', label: 'Payment', icon: 'payments' },
      { path: '/functions/order-counts', label: 'Order Counts', icon: 'monitoring' },
    ],
  },
  {
    path: '/functions/grades-subjects',
    label: 'Grades and Subjects',
    icon: 'menu_book',
    children: [
      { path: '/functions/grades-subjects/subjects', label: 'Subjects', icon: 'library_books' },
      { path: '/functions/grades-subjects/subject-management', label: 'Subject Management', icon: 'fact_check' },
      { path: '/functions/grades-subjects/time-slots', label: 'Time Slots', icon: 'schedule' },
    ],
  },
];

function IntegratedAdminShell() {
  const location = useLocation();
  const [session, setSession] = useState<IntegratedAdminAccessRecord | null>(() => {
    const stored = getStoredIntegratedAdminAccess();
    if (stored) {
      storeCoordinatorAccess(stored.coordinatorAccess);
    }
    return stored;
  });
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isRouteLoading, setIsRouteLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setLoginError(null);

    const result = await resolveIntegratedAdminAccess(username, password);
    if (result.record) {
      storeIntegratedAdminAccess(result.record);
      storeCoordinatorAccess(result.record.coordinatorAccess);
      setSession(result.record);
      setUsername('');
      setPassword('');
      setIsSubmitting(false);
      return;
    }

    setLoginError(result.error || 'Unable to process login.');
    setIsSubmitting(false);
  };

  const handleLogout = () => {
    clearStoredIntegratedAdminAccess();
    clearStoredCoordinatorAccess();
    setSession(null);
  };

  useEffect(() => {
    if (!session) return;
    storeCoordinatorAccess(session.coordinatorAccess);
  }, [session]);

  useEffect(() => {
    let cancelled = false;
    const syncDepartment = async () => {
      if (!session?.userId) return;
      const resolved = await resolveCoordinatorDepartmentAccess(session.userId);
      const nextDepartment = String(resolved.departmentName || '').trim();
      if (!nextDepartment || nextDepartment === (session.departmentName || '').trim()) return;
      const nextSession = {
        ...session,
        departmentName: nextDepartment,
        coordinatorAccess: {
          ...session.coordinatorAccess,
          departmentName: nextDepartment,
        },
      };
      if (!cancelled) {
        setSession(nextSession);
        storeIntegratedAdminAccess(nextSession);
        storeCoordinatorAccess(nextSession.coordinatorAccess);
      }
    };
    void syncDepartment();
    return () => {
      cancelled = true;
    };
  }, [session?.userId, session?.departmentName]);

  useEffect(() => {
    if (!session) return;
    setIsRouteLoading(true);
    const timer = window.setTimeout(() => setIsRouteLoading(false), 320);
    return () => window.clearTimeout(timer);
  }, [location.pathname, session]);

  const currentSectionLabel = useMemo(() => {
    if (location.pathname === '/') return 'Overview';
    for (const item of iaNavItems) {
      if (item.children?.length) {
        const child = item.children.find(
          (entry) =>
            location.pathname === entry.path || location.pathname.startsWith(`${entry.path}/`),
        );
        if (child) return child.label;
      }
      if (
        item.path === '/'
          ? location.pathname === '/'
          : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
      ) {
        return item.label;
      }
    }
    return 'Overview';
  }, [location.pathname]);

  return (
    <div className="integrated-admin-app">
      <header className="site-chrome">
        <div className="content-width">
          <UsisUnifiedHeader searchId="integrated-admin-search" searchLabel="Search integrated admin portal" />
        </div>
      </header>

      <main className="page-frame integrated-admin-main">
        <div className="content-width">
          {session ? (
            <>
              <UsisBreadcrumbBar
                rootLabel="Integrated Admin"
                currentLabel={currentSectionLabel}
                profileName={session.coordinatorName}
                profileRole="School Integrated Admin"
                profileSubtitle={`Department: ${session.departmentName?.trim() ? session.departmentName : 'Not Assigned'}`}
                onLogout={handleLogout}
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
              <section className="integrated-admin-shell">
                <UsisSideNav
                  items={iaNavItems}
                  onLogout={handleLogout}
                  ariaLabel="Integrated Admin sections"
                  isMobileOpen={isMobileNavOpen}
                  onMobileOpenChange={setIsMobileNavOpen}
                  hideInternalMobileToggle
                />
                <div className="integrated-admin-content">
                  {isRouteLoading ? (
                    <UsisPageLoader message="Loading Integrated Admin page..." />
                  ) : (
                    <Routes>
                      <Route path="/" element={<IntegratedAdminOverview session={session} />} />
                      <Route path="/functions/coordinator" element={<CoordinatorFunctionPage />}>
                        <Route index element={<Navigate to="teaching-non-teaching" replace />} />
                        <Route path="credentials" element={<Navigate to="../teaching-non-teaching" replace />} />
                        <Route path="registry" element={<Navigate to="../teaching-non-teaching" replace />} />
                        <Route path="departments" element={<DepartmentsPage />} />
                        <Route path="teaching-non-teaching" element={<TeachingNonTeachingCredentialsPage />} />
                        <Route path="learner-credentials" element={<LearnerBasedCredentialsPage />} />
                      </Route>
                      <Route path="/functions/merchandise-control" element={<MerchandiseControlPage />} />
                      <Route path="/functions/merch-control" element={<MerchOrderControlPage />} />
                      <Route path="/functions/order-payment" element={<MerchOrderPaymentPage />} />
                      <Route path="/functions/order-counts" element={<MerchOrderCountsPage />} />
                      <Route path="/functions/grades-subjects/subjects" element={<SubjectsManagementPage />} />
                      <Route path="/functions/grades-subjects/subject-management" element={<SubjectManagementPage />} />
                      <Route path="/functions/grades-subjects/time-slots" element={<TimeSlotsPage />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  )}
                </div>
              </section>
            </>
          ) : (
            <Routes>
              <Route
                path="*"
                element={
                  <IntegratedAdminLoginPage
                    username={username}
                    password={password}
                    isSubmitting={isSubmitting}
                    loginError={loginError}
                    onDismissNotice={() => setLoginError(null)}
                    onUsernameChange={setUsername}
                    onPasswordChange={setPassword}
                    onSubmit={handleSubmit}
                  />
                }
              />
            </Routes>
          )}
        </div>
      </main>

      <UsisGlobalFooter />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <IntegratedAdminShell />
    </BrowserRouter>
  );
}
