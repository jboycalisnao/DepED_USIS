import { Outlet } from 'react-router-dom';
import './styles/coordinator-pages.css';

export function CoordinatorFunctionPage() {
  return (
    <section className="section-shell integrated-admin-function">
      <div className="integrated-admin-function__header">
        <h2>Coordinator Portal Functions</h2>
      </div>
      <Outlet />
    </section>
  );
}
