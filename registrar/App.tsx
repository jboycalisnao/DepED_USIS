
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './views/Dashboard';
import LearnerList from './views/LearnerList';
import BulkImport from './views/BulkImport';
import SectionManagement from './views/SectionManagement';
import Settings from './views/Settings';
import Credentials from './views/Credentials';
import Landing from './views/Landing';
import PublicEnrollmentSubmissionsPage from './features/registrar/public-enrollment/admin/components/PublicEnrollmentSubmissionsPage';
import { useStore } from './store';

const App: React.FC = () => {
  const { isAuthenticated } = useStore();

  if (!isAuthenticated) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/learners" element={<LearnerList />} />
          <Route path="/enroll" element={<PublicEnrollmentSubmissionsPage />} />
          <Route path="/sections" element={<SectionManagement />} />
          <Route path="/import" element={<BulkImport />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/credentials" element={<Credentials />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
};

export default App;
