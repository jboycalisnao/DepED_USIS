import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { UsisUnifiedHeader } from '../common/header/UsisUnifiedHeader';
import { UsisGlobalFooter } from '../common/footer/UsisGlobalFooter';
import UsisPageLoader from '../common/components/UsisPageLoader';
import { UsisSideNav, type UsisSideNavItem } from '../common/components/UsisSideNav';
import { UsisBreadcrumbBar } from '../common/components/UsisBreadcrumbBar';
import { UsisAlertModal } from '../common/components/UsisAlertModal';
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
import { GradesPage } from './features/functions/grades-subjects/pages/GradesPage';
import { SubjectManagementPage } from './features/functions/grades-subjects/subject-management/pages/SubjectManagementPage';
import { TimeSlotsPage } from './features/functions/grades-subjects/time-slots/pages/TimeSlotsPage';
import { MerchandiseControlPage } from './features/functions/merchandise/MerchandiseControlPage';
import { MerchOrderControlPage } from './features/functions/merchandise/MerchOrderControlPage';
import { MerchOrderPaymentPage } from './features/functions/merchandise/MerchOrderPaymentPage';
import { MerchOrderCountsPage } from './features/functions/merchandise/MerchOrderCountsPage';
import { resolveCoordinatorDepartmentAccess } from '../common/auth/coordinatorDepartmentAccess';
import { loadCoordinatorIaPageAccessMapFromSupabase, loadCoordinatorModuleAccessMapFromSupabase } from '../common/auth/moduleAccess';

const iaPathToPageKey: Record<string, string> = {
  '/functions/coordinator/departments': 'ia.coordinator.departments',
  '/functions/coordinator/teaching-non-teaching': 'ia.coordinator.teaching_non_teaching',
  '/functions/coordinator/learner-credentials': 'ia.coordinator.learner_credentials',
  '/functions/grades-subjects/subjects': 'ia.grades_subjects.subjects',
  '/functions/grades-subjects/grades': 'ia.grades_subjects.grades',
  '/functions/grades-subjects/subject-management': 'ia.grades_subjects.subject_management',
  '/functions/grades-subjects/time-slots': 'ia.grades_subjects.time_slots',
  '/functions/merchandise-control': 'ia.merch.merchandise_control',
  '/functions/merch-control': 'ia.merch.orders',
  '/functions/order-payment': 'ia.merch.payment',
  '/functions/order-counts': 'ia.merch.order_counts',
};

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
      { path: '/functions/grades-subjects/grades', label: 'Grades', icon: 'grading' },
      { path: '/functions/grades-subjects/subject-management', label: 'Subject Management', icon: 'fact_check' },
      { path: '/functions/grades-subjects/time-slots', label: 'Time Slots', icon: 'schedule' },
    ],
  },
];

const buildNavItemsWithIaAccessState = (
  items: UsisSideNavItem[],
  hasIaModule: boolean,
  allowedIaPages: string[],
) => {
  const allowedSet = new Set(allowedIaPages);
  const isAllowedPath = (path: string) => {
    if (path === '/') return true;
    const pageKey = iaPathToPageKey[path];
    if (!pageKey) return true;
    if (!hasIaModule) return false;
    if (allowedSet.size === 0) return false;
    return allowedSet.has(pageKey);
  };

  const mark = (source: UsisSideNavItem[]): UsisSideNavItem[] =>
    source
      .map((item) => {
        const nextChildren = item.children?.length ? mark(item.children) : undefined;
        const isAllowed = isAllowedPath(item.path);
        if (item.children?.length) {
          if (!nextChildren?.length) return null;
          return { ...item, children: nextChildren, disabled: false };
        }
        if (!isAllowed) return null;
        return { ...item, children: undefined, disabled: false };
      })
      .filter((item): item is UsisSideNavItem => Boolean(item));

  return mark(items);
};

function IntegratedAdminShell() {
  const location = useLocation();
  const navigate = useNavigate();
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
  const [currentModules, setCurrentModules] = useState<string[]>([]);
  const [currentIaPages, setCurrentIaPages] = useState<string[]>([]);
  const [hasLoadedPageAccess, setHasLoadedPageAccess] = useState(false);
  const [noAccessAlert, setNoAccessAlert] = useState<{ message: string; open: boolean }>({ message: '', open: false });

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

  useEffect(() => {
    let isMounted = true;
    const loadAccess = async () => {
      if (!session?.userId) return;
      try {
        const [moduleMap, pageMap] = await Promise.all([
          loadCoordinatorModuleAccessMapFromSupabase([session.userId]),
          loadCoordinatorIaPageAccessMapFromSupabase([session.userId]),
        ]);
        if (!isMounted) return;
        setCurrentModules(moduleMap[session.userId] || []);
        setCurrentIaPages(pageMap[session.userId] || []);
        setHasLoadedPageAccess(true);
      } catch {
        if (!isMounted) return;
        setCurrentModules([]);
        setCurrentIaPages([]);
        setHasLoadedPageAccess(true);
      }
    };
    void loadAccess();
    return () => {
      isMounted = false;
    };
  }, [session?.userId]);

  const visibleNavItems = useMemo(() => {
    const hasIaModule = currentModules.includes('ia');
    return buildNavItemsWithIaAccessState(iaNavItems, hasIaModule, currentIaPages);
  }, [currentIaPages, currentModules]);

  useEffect(() => {
    if (!session?.userId || !hasLoadedPageAccess) return;
    const requiredPageKey = iaPathToPageKey[location.pathname];
    if (!requiredPageKey) return;
    const hasIaModule = currentModules.includes('ia');
    if (!hasIaModule) {
      setNoAccessAlert({ open: true, message: 'No access: this account is not granted IA module access.' });
      navigate('/', { replace: true });
      return;
    }
    if (!currentIaPages.includes(requiredPageKey)) {
      setNoAccessAlert({ open: true, message: 'No access: this IA page is not granted for this account.' });
      navigate('/', { replace: true });
    }
  }, [currentIaPages, currentModules, hasLoadedPageAccess, location.pathname, navigate, session?.userId]);

  const currentSectionLabel = useMemo(() => {
    if (location.pathname === '/') return 'Overview';
    for (const item of visibleNavItems) {
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
  }, [location.pathname, visibleNavItems]);

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
                  items={visibleNavItems}
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
                      <Route path="/functions/grades-subjects/grades" element={<GradesPage />} />
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
      <UsisAlertModal
        open={noAccessAlert.open}
        title="No Access"
        message={noAccessAlert.message}
        tone="danger"
        onClose={() => setNoAccessAlert({ open: false, message: '' })}
      />
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
