import { useMemo, useState } from 'react';
import { BrowserRouter, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { UsisUnifiedHeader } from '../common/header/UsisUnifiedHeader';
import { UsisGlobalFooter } from '../common/footer/UsisGlobalFooter';
import { EnrollmentFormPage } from './features/enrollment-form/components/EnrollmentFormPage';
import InformationVerificationUpdatePage from './features/enrollment-form/components/verification/InformationVerificationUpdatePage';
import { SubmissionConfirmationPage } from './features/portal/components/SubmissionConfirmationPage';
import { SubmissionStatusPage } from './features/portal/components/SubmissionStatusPage';
import { UsisPortalGate } from '../common/components/UsisPortalGate';
import '../registrar/styles/publicEnrollment.css';
const ENROLLMENT_BASENAME = '/enrollment';

function resolveEnrollmentBasename(pathname: string): string {
  return pathname === ENROLLMENT_BASENAME || pathname.startsWith(`${ENROLLMENT_BASENAME}/`)
    ? ENROLLMENT_BASENAME
    : '';
}

const navItems: Array<{ path: string; label: string; matchPrefix?: string }> = [
  { path: '/enrollment-form', label: 'Enrollment Form' },
  { path: '/submission-status', label: 'Submission Status', matchPrefix: '/submission-status' },
];

function EnrollmentShell() {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');

  const activeRoute = useMemo(() => location.pathname, [location.pathname]);

  return (
    <div className="enrollment-app">
      <UsisPortalGate moduleKey="enrollment" />
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
        <Route path="/enrollment-form/verify/:submissionId" element={<InformationVerificationUpdatePage />} />
        <Route path="/requirements" element={<Navigate to="/enrollment-form" replace />} />
        <Route path="/submission-confirmation" element={<SubmissionConfirmationPage />} />
        <Route path="/submission-status/login" element={<Navigate to="/submission-status" replace />} />
        <Route path="/submission-status" element={<SubmissionStatusPage />} />
        <Route path="*" element={<Navigate to="/enrollment-form" replace />} />
      </Routes>

      <UsisGlobalFooter />
    </div>
  );
}

export default function App() {
  const basename = resolveEnrollmentBasename(window.location.pathname);

  return (
    <BrowserRouter basename={basename}>
      <EnrollmentShell />
    </BrowserRouter>
  );
}
