import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/ui/AppLayout';
import { ApplicationStartPage } from './features/admissions/application/ApplicationStartPage';
import { AdmissionPortalPage } from './features/admissions/portal/AdmissionPortalPage';
import { PortalStatusPage } from './features/admissions/portal/components/PortalStatusPage';
import { RequireSpPortalAdmin } from './features/admin/components/RequireSpPortalAdmin';
import { AdminPanelPage } from './features/admin/pages/AdminPanelPage';
import { UsisPortalGate } from '../common/components/UsisPortalGate';

export default function App() {
  return (
    <BrowserRouter>
      <UsisPortalGate moduleKey="sp_portal" />
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/admissions/region-vi/iloilo/302345" replace />} />
          <Route
            path="/admissions/:regionSlug/:divisionSlug/:schoolId"
            element={<AdmissionPortalPage />}
          />
          <Route
            path="/admissions/:regionSlug/:divisionSlug/:schoolId/application"
            element={<ApplicationStartPage />}
          />
          <Route path="/application/start" element={<Navigate to="/admissions/region-vi/iloilo/302345/application" replace />} />
          <Route path="/admin/login" element={<Navigate to="/application/start" replace />} />
          <Route element={<RequireSpPortalAdmin />}>
            <Route path="/admin" element={<AdminPanelPage />} />
          </Route>
          <Route
            path="*"
            element={
              <PortalStatusPage
                eyebrow="Invalid Route"
                title="Admissions portal not found."
                message="Please check the region, division, and school ID in the URL."
              />
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
