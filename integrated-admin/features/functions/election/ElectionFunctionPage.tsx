import { Outlet } from 'react-router-dom';

export function ElectionFunctionPage() {
  return (
    <section className="section-shell integrated-admin-function">
      <div className="integrated-admin-function__header">
        <h2>Election Functions</h2>
      </div>
      <Outlet />
    </section>
  );
}
