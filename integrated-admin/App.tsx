import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { UsisUnifiedHeader } from '../common/header/UsisUnifiedHeader';
import { UsisGlobalFooter } from '../common/footer/UsisGlobalFooter';
import { IntegratedAdminLoginPage } from './features/auth/pages/IntegratedAdminLoginPage';

function IntegratedAdminShell() {
  return (
    <div className="integrated-admin-app">
      <header className="site-chrome">
        <div className="content-width">
          <UsisUnifiedHeader searchId="integrated-admin-search" searchLabel="Search integrated admin portal" />
        </div>
      </header>

      <main className="page-frame integrated-admin-main">
        <div className="content-width">
          <Routes>
            <Route path="/" element={<IntegratedAdminLoginPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
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
