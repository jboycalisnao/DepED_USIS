import { useMemo, useState } from 'react';
import { BrowserRouter, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { UsisUnifiedHeader } from '../common/header/UsisUnifiedHeader';
import { UsisGlobalFooter } from '../common/footer/UsisGlobalFooter';
import { EnrollmentFormPage } from './features/enrollment-form/components/EnrollmentFormPage';
import { RequirementsPage } from './features/portal/components/RequirementsPage';
import { SubmissionStatusLoginPage } from './features/portal/components/SubmissionStatusLoginPage';
import { SubmissionStatusPage } from './features/portal/components/SubmissionStatusPage';
import type { SubmissionStatusAccessRecord } from './features/enrollment-form/services/submissionStatusAuth';

const SUBMISSION_STATUS_SESSION_KEY = 'usis_enrollment_submission_status_session';

const navItems: Array<{ path: string; label: string; matchPrefix?: string }> = [
  { path: '/enrollment-form', label: 'Enrollment Form' },
  { path: '/requirements', label: 'Requirements' },
  { path: '/submission-status/login', label: 'Submission Status', matchPrefix: '/submission-status' },
];

function EnrollmentShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusSession, setStatusSession] = useState<SubmissionStatusAccessRecord | null>(() => {
    try {
      const stored = localStorage.getItem(SUBMISSION_STATUS_SESSION_KEY);
      return stored ? (JSON.parse(stored) as SubmissionStatusAccessRecord) : null;
    } catch {
      return null;
    }
  });

  const activeRoute = useMemo(() => location.pathname, [location.pathname]);

  const persistSession = (record: SubmissionStatusAccessRecord | null) => {
    setStatusSession(record);
    if (record) localStorage.setItem(SUBMISSION_STATUS_SESSION_KEY, JSON.stringify(record));
    else localStorage.removeItem(SUBMISSION_STATUS_SESSION_KEY);
  };

  return (
    <div className="enrollment-app">
      <header className="site-chrome">
        <div className="content-width">
          <UsisUnifiedHeader
            searchId="enrollment-search"
            searchLabel="Search enrollment portal"
            searchPlaceholder="Keywords"
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            onSearchSubmit={(event) => event.preventDefault()}
          />
          <nav className="kit-nav" aria-label="Enrollment portal sections">
            <div className="kit-nav__grid">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`kit-nav__link ${
                    activeRoute.startsWith(item.matchPrefix || item.path) ? 'kit-nav__link--active' : ''
                  }`}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </nav>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<Navigate to="/enrollment-form" replace />} />
        <Route path="/enrollment-form" element={<EnrollmentFormPage />} />
        <Route path="/requirements" element={<RequirementsPage />} />
        <Route
          path="/submission-status/login"
          element={
            <SubmissionStatusLoginPage
              onLogin={(record) => {
                persistSession(record);
                navigate('/submission-status', { replace: true });
              }}
            />
          }
        />
        <Route
          path="/submission-status"
          element={
            statusSession ? (
              <SubmissionStatusPage
                access={statusSession}
                onLogout={() => {
                  persistSession(null);
                  navigate('/submission-status/login', { replace: true });
                }}
              />
            ) : (
              <Navigate to="/submission-status/login" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/enrollment-form" replace />} />
      </Routes>

      <UsisGlobalFooter />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <EnrollmentShell />
    </BrowserRouter>
  );
}
