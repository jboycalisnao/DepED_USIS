import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { UsisUnifiedHeader } from '../common/header/UsisUnifiedHeader';
import { UsisGlobalFooter } from '../common/footer/UsisGlobalFooter';
import UsisPageLoader from '../common/components/UsisPageLoader';
import { UsisSideNav, type UsisSideNavItem } from '../common/components/UsisSideNav';
import { UsisBreadcrumbBar } from '../common/components/UsisBreadcrumbBar';
import { UsisAlertModal } from '../common/components/UsisAlertModal';
import { UsisPortalGate } from '../common/components/UsisPortalGate';
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
import { IdOrdersPage } from './features/functions/merchandise/id-orders/pages/IdOrdersPage';
import { MerchOrderPaymentPage } from './features/functions/merchandise/MerchOrderPaymentPage';
import { MerchOrderCountsPage } from './features/functions/merchandise/MerchOrderCountsPage';
import { PortalControlsPage } from './features/functions/portal-controls/pages/PortalControlsPage';
import { LearnerPortalNotificationsPage } from './features/functions/portal-controls/pages/LearnerPortalNotificationsPage';
import { LearnerPortalImportantDatesPage } from './features/functions/portal-controls/pages/LearnerPortalImportantDatesPage';
import { ElectionFunctionPage } from './features/functions/election/ElectionFunctionPage';
import { ElectionAdminConsolePage } from './features/functions/election/ElectionAdminConsolePage';
import { HelpDeskTicketsPage } from './features/functions/help-desk/pages/HelpDeskTicketsPage';
import { SccFunctionPage } from './features/functions/scc/SccFunctionPage';
import { SccAdminDashboardPage } from './features/functions/scc/pages/SccAdminDashboardPage';
import { SccServiceRequestsAdminPage } from './features/functions/scc/pages/SccServiceRequestsAdminPage';
import { SccOrganizationsAdminPage } from './features/functions/scc/pages/SccOrganizationsAdminPage';
import { SccGoogleAccountsAdminPage } from './features/functions/scc/pages/SccGoogleAccountsAdminPage';
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
  '/functions/id-orders': 'ia.merch.id_orders',
  '/functions/order-payment': 'ia.merch.payment',
  '/functions/order-counts': 'ia.merch.order_counts',
  '/functions/portal-controls': 'ia.portal_controls',
  '/functions/portal-controls/controls': 'ia.portal_controls',
  '/functions/portal-controls/learner-portal': 'ia.portal_controls',
  '/functions/portal-controls/important-dates': 'ia.portal_controls',
  '/functions/election/admin-console': 'ia.election.admin_console',
  '/functions/election/dashboard': 'ia.election.dashboard',
  '/functions/election/candidates': 'ia.election.candidates',
  '/functions/election/voters': 'ia.election.voters',
  '/functions/election/organization': 'ia.election.organization',
  '/functions/election/settings': 'ia.election.settings',
  '/functions/scc/dashboard': 'ia.scc.dashboard',
  '/functions/scc/requests': 'ia.scc.service_requests',
  '/functions/scc/organizations': 'ia.scc.organizations',
  '/functions/scc/google-accounts': 'ia.scc.google_accounts',
};

function parseSystemRole(rawRole: string): {
  label: string;
  scopeText: string;
  tone: 'blue' | 'purple' | 'green';
} {
  const normalized = String(rawRole || '').trim().toLowerCase();

  const acronyms: Record<string, string> = {
    usis: 'USIS',
    ict: 'ICT',
    id: 'ID',
    it: 'IT',
    spta: 'SPTA',
    srcy: 'SRCY',
    deped: 'DepEd',
  };

  if (!normalized || normalized === 'school_usis_coordinator') {
    return {
      label: 'School USIS Coordinator',
      scopeText: 'School Access Authority',
      tone: 'blue',
    };
  }

  if (normalized === 'system_admin' || normalized === 'superadmin' || normalized === 'super_admin') {
    return {
      label: 'System Administrator',
      scopeText: 'Full System Authority',
      tone: 'purple',
    };
  }

  if (normalized === 'division_usis_coordinator' || normalized === 'division_coordinator') {
    return {
      label: 'Division USIS Coordinator',
      scopeText: 'Division Access Authority',
      tone: 'blue',
    };
  }

  if (normalized === 'regional_usis_coordinator' || normalized === 'regional_coordinator') {
    return {
      label: 'Regional USIS Coordinator',
      scopeText: 'Regional Access Authority',
      tone: 'blue',
    };
  }

  if (normalized === 'school_coordinator') {
    return {
      label: 'School Coordinator',
      scopeText: 'School Access Authority',
      tone: 'blue',
    };
  }

  const words = normalized
    .split(/[-_]+/)
    .map((word) => acronyms[word] || (word.charAt(0).toUpperCase() + word.slice(1)));

  return {
    label: words.join(' '),
    scopeText: 'Access Scope Authority',
    tone: 'blue',
  };
}

function IntegratedAdminOverview({
  session,
}: {
  session: IntegratedAdminAccessRecord;
}) {
  const roleInfo = parseSystemRole(session.role);

  return (
    <section className="section-shell integrated-admin-workspace">
      <article className="ia-workspace-card">
        {/* Institutional Tri-Color Accent Stripe */}
        <div className="ia-workspace-card__top-bar">
          <div className="ia-workspace-card__top-bar-blue" />
          <div className="ia-workspace-card__top-bar-red" />
          <div className="ia-workspace-card__top-bar-yellow" />
        </div>

        {/* Card Header */}
        <header className="ia-workspace-card__header">
          <div className="ia-workspace-card__title-group">
            <h2>Integrated Admin Workspace</h2>
            <p>Signed in as <strong>{session.coordinatorName}</strong></p>
          </div>
          <div className="ia-workspace-card__badge">
            <span className="ia-workspace-card__badge-dot" />
            <span>Connected • Active</span>
          </div>
        </header>

        {/* Card Body */}
        <div className="ia-workspace-card__body">
          <p className="ia-workspace-card__lead">
            This subsystem is connected to coordinator credentials and ready for module-level configuration work, registry maintenance, and portal controls.
          </p>

          {/* Institutional Metadata Grid */}
          <div className="ia-workspace-card__grid">
            <div className="ia-workspace-card__grid-item">
              <span className="ia-workspace-card__grid-label">Coordinator</span>
              <span className="ia-workspace-card__grid-value">{session.coordinatorName}</span>
              <span className="ia-workspace-card__grid-sub">Authenticated Operator</span>
            </div>

            <div className="ia-workspace-card__grid-item">
              <span className="ia-workspace-card__grid-label">System Role</span>
              <div className="ia-workspace-card__grid-value">
                <span className={`ia-role-pill ia-role-pill--${roleInfo.tone}`}>
                  <span className="ia-role-pill__dot" />
                  <span>{roleInfo.label}</span>
                </span>
              </div>
              <span className="ia-workspace-card__grid-sub">{roleInfo.scopeText}</span>
            </div>

            <div className="ia-workspace-card__grid-item">
              <span className="ia-workspace-card__grid-label">School / Entity</span>
              <span className="ia-workspace-card__grid-value">{session.schoolName}</span>
              <span className="ia-workspace-card__grid-sub">Target Administrative Scope</span>
            </div>

            <div className="ia-workspace-card__grid-item">
              <span className="ia-workspace-card__grid-label">Subsystem Status</span>
              <span className="ia-workspace-card__grid-value" style={{ color: '#027a48' }}>
                Operational
              </span>
              <span className="ia-workspace-card__grid-sub">Ready for Configuration</span>
            </div>
          </div>

          {/* Quick Functions Action Navigation */}
          <h3 className="ia-workspace-card__actions-header">Coordinator Portal Functions</h3>
          <div className="ia-workspace-card__actions-grid">
            <Link to="/functions/coordinator/teaching-non-teaching" className="ia-workspace-card__action-link">
              <div className="ia-workspace-card__action-title">
                <span>Teaching & Non-Teaching</span>
                <span className="ia-workspace-card__action-arrow">→</span>
              </div>
              <span className="ia-workspace-card__action-desc">
                Manage coordinator and personnel credential records
              </span>
            </Link>

            <Link to="/functions/coordinator/learner-credentials" className="ia-workspace-card__action-link">
              <div className="ia-workspace-card__action-title">
                <span>Learner-based Credentials</span>
                <span className="ia-workspace-card__action-arrow">→</span>
              </div>
              <span className="ia-workspace-card__action-desc">
                Issue and manage student portal passwords and credentials
              </span>
            </Link>

            <Link to="/functions/coordinator/departments" className="ia-workspace-card__action-link">
              <div className="ia-workspace-card__action-title">
                <span>Departments Registry</span>
                <span className="ia-workspace-card__action-arrow">→</span>
              </div>
              <span className="ia-workspace-card__action-desc">
                Organize school departments, assignments, and personnel
              </span>
            </Link>

            <Link to="/functions/portal-controls" className="ia-workspace-card__action-link">
              <div className="ia-workspace-card__action-title">
                <span>Portal Controls</span>
                <span className="ia-workspace-card__action-arrow">→</span>
              </div>
              <span className="ia-workspace-card__action-desc">
                Configure module maintenance gates and announcements
              </span>
            </Link>
          </div>
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
      { path: '/functions/id-orders', label: 'ID Orders', icon: 'badge' },
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
  {
    path: '/functions/portal-controls',
    label: 'Portal Controls',
    icon: 'tune',
    children: [
      { path: '/functions/portal-controls/controls', label: 'Controls', icon: 'tune' },
      { path: '/functions/portal-controls/learner-portal', label: 'Learner Portal', icon: 'campaign' },
      { path: '/functions/portal-controls/important-dates', label: 'Important Dates', icon: 'event' },
    ],
  },
  {
    path: '/functions/help-desk',
    label: 'Help Desk Admin',
    icon: 'support_agent',
  },
  {
    path: '/functions/election',
    label: 'Election',
    icon: 'how_to_vote',
    children: [
      { path: '/functions/election/dashboard', label: 'Dashboard', icon: 'dashboard' },
      { path: '/functions/election/candidates', label: 'Candidates', icon: 'badge' },
      { path: '/functions/election/voters', label: 'Voters', icon: 'groups' },
      { path: '/functions/election/organization', label: 'Organization', icon: 'account_tree' },
      { path: '/functions/election/settings', label: 'Settings', icon: 'settings' },
    ],
  },
  {
    path: '/functions/scc',
    label: 'SCC',
    icon: 'diversity_3',
    children: [
      { path: '/functions/scc/dashboard', label: 'Dashboard', icon: 'dashboard' },
      { path: '/functions/scc/requests', label: 'Service Requests', icon: 'inbox' },
      { path: '/functions/scc/organizations', label: 'Organizations & Rosters', icon: 'groups' },
      { path: '/functions/scc/google-accounts', label: 'Google Accounts', icon: 'manage_accounts' },
    ],
  },
];

const buildNavItemsWithIaAccessState = (
  items: UsisSideNavItem[],
  hasIaModule: boolean,
  allowedIaPages: string[],
  hasHelpAdminModule: boolean,
) => {
  const allowedSet = new Set(allowedIaPages);
  const isAllowedPath = (path: string) => {
    if (path === '/') return true;
    if (path === '/functions/help-desk') return hasHelpAdminModule;
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
    const hasHelpAdminModule = currentModules.includes('help_admin');
    return buildNavItemsWithIaAccessState(iaNavItems, hasIaModule, currentIaPages, hasHelpAdminModule);
  }, [currentIaPages, currentModules]);

  useEffect(() => {
    if (!session?.userId || !hasLoadedPageAccess) return;
    const hasHelpAdminModule = currentModules.includes('help_admin');
    if (location.pathname.startsWith('/functions/help-desk')) {
      if (!hasHelpAdminModule) {
        setNoAccessAlert({ open: true, message: 'No access: this account is not granted Help Admin access.' });
        navigate('/', { replace: true });
      }
      return;
    }
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
      <UsisPortalGate moduleKey="integrated_admin" />
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
                      <Route path="/functions/id-orders" element={<IdOrdersPage />} />
                      <Route path="/functions/order-payment" element={<MerchOrderPaymentPage />} />
                      <Route path="/functions/order-counts" element={<MerchOrderCountsPage />} />
                      <Route
                        path="/functions/help-desk"
                        element={
                          hasLoadedPageAccess && currentModules.includes('help_admin')
                            ? <HelpDeskTicketsPage session={session} />
                            : <UsisPageLoader message="Loading Help Desk page..." />
                        }
                      />
                      <Route path="/functions/grades-subjects/subjects" element={<SubjectsManagementPage />} />
                      <Route path="/functions/grades-subjects/grades" element={<GradesPage />} />
                      <Route path="/functions/grades-subjects/subject-management" element={<SubjectManagementPage />} />
                      <Route path="/functions/grades-subjects/time-slots" element={<TimeSlotsPage />} />
                      <Route path="/functions/portal-controls" element={<PortalControlsPage />} />
                      <Route path="/functions/portal-controls/controls" element={<PortalControlsPage />} />
                      <Route path="/functions/portal-controls/learner-portal" element={<LearnerPortalNotificationsPage />} />
                      <Route path="/functions/portal-controls/important-dates" element={<LearnerPortalImportantDatesPage />} />
                      <Route path="/functions/election" element={<ElectionFunctionPage />}>
                        <Route index element={<Navigate to="dashboard" replace />} />
                        <Route path="admin-console" element={<Navigate to="dashboard" replace />} />
                        <Route path="dashboard" element={<ElectionAdminConsolePage tab="dashboard" />} />
                        <Route path="candidates" element={<ElectionAdminConsolePage tab="candidates" />} />
                        <Route path="voters" element={<ElectionAdminConsolePage tab="voters" />} />
                        <Route path="organization" element={<ElectionAdminConsolePage tab="organization" />} />
                        <Route path="settings" element={<ElectionAdminConsolePage tab="settings" />} />
                      </Route>
                      <Route path="/functions/scc" element={<SccFunctionPage />}>
                        <Route index element={<Navigate to="dashboard" replace />} />
                        <Route path="dashboard" element={<SccAdminDashboardPage coordinatorName={session.coordinatorName} />} />
                        <Route path="requests" element={<SccServiceRequestsAdminPage coordinatorName={session.coordinatorName} />} />
                        <Route path="organizations" element={<SccOrganizationsAdminPage />} />
                        <Route path="google-accounts" element={<SccGoogleAccountsAdminPage />} />
                      </Route>
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
