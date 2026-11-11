import { Outlet } from 'react-router-dom';
import '../../../styles/modules/ia-scc-admin.css';

export function SccFunctionPage() {
  return (
    <section className="section-shell integrated-admin-function ia-scc-page">
      <div className="integrated-admin-function__header">
        <h2>School Coordinating Council (SCC) Administration</h2>
      </div>
      <Outlet />
    </section>
  );
}
