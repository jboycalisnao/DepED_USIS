import { Navigate, Outlet } from 'react-router-dom';
import { getStoredSpPortalAdminAccess } from '../utils/spPortalAdminAccess';

export function RequireSpPortalAdmin() {
  const access = getStoredSpPortalAdminAccess();

  if (!access) {
    return <Navigate to="/application/start" replace />;
  }

  return <Outlet />;
}
