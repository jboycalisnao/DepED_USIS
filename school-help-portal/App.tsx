import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { UsisPortalGate } from '../common/components/UsisPortalGate';
import { PortalLayout } from './features/shared/components/PortalLayout';
import { AdminPage } from './features/admin/pages/AdminPage';
import { InformationPage } from './features/information/pages/InformationPage';
import { SubmitTicketPage } from './features/tickets/pages/SubmitTicketPage';

export default function App() {
  return (
    <BrowserRouter>
      <UsisPortalGate moduleKey="school_help_portal" />
      <Routes>
        <Route element={<PortalLayout />}>
          <Route index element={<InformationPage />} />
          <Route path="/information" element={<Navigate to="/" replace />} />
          <Route path="/help" element={<Navigate to="/" replace />} />
          <Route path="/submit-ticket" element={<SubmitTicketPage />} />
          <Route path="/ticket" element={<Navigate to="/submit-ticket" replace />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
