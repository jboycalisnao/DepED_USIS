import { Navigate, Outlet } from 'react-router-dom';
import { getStoredRegistrationPortalAccess } from '../utils/registrationPortalAccess';

export function RequireRegistrationAccess() {
  const access = getStoredRegistrationPortalAccess();

  if (!access) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
