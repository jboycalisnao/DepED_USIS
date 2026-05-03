import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { getStoredCoordinatorAccess } from '../utils/coordinatorAccess';

export function RequireCoordinatorAccess() {
  const location = useLocation();
  const access = getStoredCoordinatorAccess();

  if (!access) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
