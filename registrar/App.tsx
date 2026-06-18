
import React, { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './views/Dashboard';
import LearnerList from './views/LearnerList';
import BulkImport from './views/BulkImport';
import SectionManagement from './views/SectionManagement';
import Settings from './views/Settings';
import Credentials from './views/Credentials';
import CredentialDetailPage from './views/credentials/CredentialDetailPage';
import AdviserLearnersPage from './views/adviser-learners/AdviserLearnersPage';
import Landing from './views/Landing';
import PublicEnrollmentSubmissionsPage from './features/registrar/public-enrollment/admin/components/PublicEnrollmentSubmissionsPage';
import PublicEnrollmentSubmissionDetailsPage from './features/registrar/public-enrollment/admin/components/PublicEnrollmentSubmissionDetailsPage';
import PublicEnrollmentSubmissionEditPage from './features/registrar/public-enrollment/admin/components/PublicEnrollmentSubmissionEditPage';
import PublicEnrollmentPriorLearnerEditPage from './features/registrar/public-enrollment/admin/components/PublicEnrollmentPriorLearnerEditPage';
import PublicEnrollmentSectioningPage from './features/registrar/public-enrollment/admin/components/PublicEnrollmentSectioningPage';
import EnrollmentKioskPage from './features/registrar/public-enrollment/kiosk/EnrollmentKioskPage';
import PublicEnrollmentPage from './features/registrar/public-enrollment/components/PublicEnrollmentPage';
import EnrollmentAnnouncementsPage from './features/registrar/enrollment-announcements/pages/EnrollmentAnnouncementsPage';
import { useStore } from './store';
import { UsisPortalGate } from '../common/components/UsisPortalGate';

const AuthenticatedRouter: React.FC = () => {
  const location = useLocation();
  const isKioskRoute = location.pathname === '/enroll/kiosk';
  const isPublicEnrollmentRoute = location.pathname === '/public-enrollment';
  const isSectioningRoute = location.pathname === '/enroll/sectioning';

  if (isKioskRoute) {
    return (
      <Routes>
        <Route path="/enroll/kiosk" element={<EnrollmentKioskPage />} />
        <Route path="*" element={<Navigate to="/enroll/kiosk" replace />} />
      </Routes>
    );
  }

  if (isPublicEnrollmentRoute) {
    return (
      <Routes>
        <Route path="/public-enrollment" element={<PublicEnrollmentPage />} />
        <Route path="*" element={<Navigate to="/public-enrollment" replace />} />
      </Routes>
    );
  }

  if (isSectioningRoute) {
    return (
      <Routes>
        <Route path="/enroll/sectioning" element={<PublicEnrollmentSectioningPage />} />
        <Route path="*" element={<Navigate to="/enroll/sectioning" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/learners" element={<LearnerList />} />
        <Route path="/my-section-learners" element={<AdviserLearnersPage />} />
        <Route path="/public-enrollment" element={<PublicEnrollmentPage />} />
        <Route path="/enroll" element={<PublicEnrollmentSubmissionsPage />} />
        <Route path="/enroll/:id" element={<PublicEnrollmentSubmissionDetailsPage />} />
        <Route path="/enroll/:id/edit" element={<PublicEnrollmentSubmissionEditPage />} />
        <Route path="/enroll/sectioning" element={<PublicEnrollmentSectioningPage />} />
        <Route path="/enroll/prior-learner/:learnerId/edit" element={<PublicEnrollmentPriorLearnerEditPage />} />
        <Route path="/announcements" element={<EnrollmentAnnouncementsPage />} />
        <Route path="/sections" element={<SectionManagement />} />
        <Route path="/import" element={<BulkImport />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/credentials" element={<Credentials />} />
        <Route path="/credentials/:learnerId" element={<CredentialDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
};

const App: React.FC = () => {
  const { isAuthenticated, refreshData } = useStore();
  const hasForcedRefreshRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      hasForcedRefreshRef.current = false;
      return;
    }

    if (hasForcedRefreshRef.current) return;
    hasForcedRefreshRef.current = true;
    void refreshData(true);
  }, [isAuthenticated, refreshData]);

  if (!isAuthenticated) {
    return (
      <BrowserRouter>
        <UsisPortalGate moduleKey="registrar" />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/public-enrollment" element={<PublicEnrollmentPage />} />
          <Route path="/enroll/sectioning" element={<PublicEnrollmentSectioningPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <UsisPortalGate moduleKey="registrar" />
      <AuthenticatedRouter />
    </BrowserRouter>
  );
};

export default App;
