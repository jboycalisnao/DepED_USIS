import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/ui/AppLayout';
import { AdminLayout } from './features/admin/components/AdminLayout';
import { RequireCoordinatorAccess } from './features/auth/components/RequireCoordinatorAccess';
import { LoginPage } from './features/auth/pages/LoginPage';
import { CredentialsPage } from './features/access/pages/CredentialsPage';
import { CodeRegistryPage } from './features/access/pages/CodeRegistryPage';
import { RegistryPage } from './features/access/pages/RegistryPage';
import { RequireRegistrationAccess } from './features/registration/components/RequireRegistrationAccess';
import { RegistrationCredentialsPage } from './features/registration/pages/RegistrationCredentialsPage';
import { RegistrationPortalPage } from './features/registration/pages/RegistrationPortalPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireCoordinatorAccess />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="/admin/credentials" replace />} />
              <Route path="credentials" element={<CredentialsPage />} />
              <Route path="codes" element={<CodeRegistryPage />} />
              <Route path="registry" element={<RegistryPage />} />
            </Route>
          </Route>
          <Route path="/registration" element={<RegistrationPortalPage />} />
          <Route element={<RequireRegistrationAccess />}>
            <Route path="/registration/credentials" element={<RegistrationCredentialsPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
