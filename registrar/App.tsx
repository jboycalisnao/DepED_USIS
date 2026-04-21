
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './views/Dashboard';
import LearnerList from './views/LearnerList';
import EnrollmentForm from './views/EnrollmentForm';
import BulkImport from './views/BulkImport';
import SectionManagement from './views/SectionManagement';
import Settings from './views/Settings';
import Landing from './views/Landing';
import { useStore } from './store';

const App: React.FC = () => {
  const { isAuthenticated } = useStore();

  if (!isAuthenticated) {
    return (
      <HashRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    );
  }

  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/learners" element={<LearnerList />} />
          <Route path="/enroll" element={<EnrollmentForm />} />
          <Route path="/sections" element={<SectionManagement />} />
          <Route path="/import" element={<BulkImport />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;
