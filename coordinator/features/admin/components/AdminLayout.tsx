import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  clearStoredCoordinatorAccess,
  getStoredCoordinatorAccess,
} from '@/features/auth/utils/coordinatorAccess';

const adminLinks = [
  { label: 'Credentials', path: '/admin/credentials' },
  { label: 'Registry', path: '/admin/registry' },
  { label: 'Code Registry', path: '/admin/codes' },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const access = getStoredCoordinatorAccess();
  const contextValue = (value: string, fallback: string) =>
    access?.isSuperAdmin ? 'Superadmin' : value || fallback;

  const handleLogout = () => {
    clearStoredCoordinatorAccess();
    navigate('/login', { replace: true });
  };

  return (
    <section className="admin-shell">
      <div className="admin-shell__header">
        <div className="admin-shell__heading">
          <p className="page-intro__eyebrow">Coordinator Admin</p>
          <h1 className="admin-shell__title">Credential Generator and Registry</h1>
        </div>
        <div className="admin-shell__context">
          <dl className="admin-context-box">
            <div>
              <dt>Region</dt>
              <dd>{contextValue(access?.region || '', 'Region unavailable')}</dd>
            </div>
            <div>
              <dt>Division</dt>
              <dd>{contextValue(access?.division || '', 'Division unavailable')}</dd>
            </div>
            <div>
              <dt>School ID</dt>
              <dd>{contextValue(access?.schoolId || '', 'School ID unavailable')}</dd>
            </div>
            <div>
              <dt>School Name</dt>
              <dd>{contextValue(access?.schoolName || '', 'School unavailable')}</dd>
            </div>
          </dl>
          <button className="admin-shell__logout" type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      <nav className="admin-tabs" aria-label="Coordinator admin sections">
        {adminLinks.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            className={({ isActive }) => `admin-tabs__link${isActive ? ' admin-tabs__link--active' : ''}`}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </section>
  );
}
