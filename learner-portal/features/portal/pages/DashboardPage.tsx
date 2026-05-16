import type { LearnerPortalAccessRecord } from '../../auth/services/learnerAccess';

type DashboardPageProps = {
  session: LearnerPortalAccessRecord;
};

export function DashboardPage({ session }: DashboardPageProps) {
  return (
    <section className="section-shell">
      <div className="portal-panel learner-tab-panel">
        <header className="portal-panel__header learner-tab-header">
          <h2>Dashboard</h2>
          <p>View quick learner updates and portal notices.</p>
        </header>
      </div>
      <nav className="enrollment-status-breadcrumb" aria-label="Learner dashboard breadcrumb">
        <span>{new Date().getFullYear()}-{new Date().getFullYear() + 1}</span>
        <span>/</span>
        <span>Learner Portal</span>
        <span>/</span>
        <span>Dashboard</span>
      </nav>
      <header className="enrollment-status-hero" role="banner">
        <div className="enrollment-status-hero__shape enrollment-status-hero__shape--left" aria-hidden="true" />
        <div className="enrollment-status-hero__shape enrollment-status-hero__shape--right" aria-hidden="true" />
        <h2>Welcome back, {session.learnerName}!</h2>
        <p>Always stay updated with your learner records and service requests.</p>
      </header>

      <article className="notice-box learner-hint__box">
        <strong>Session Access</strong>
        <span>Signed in as {session.username} (LRN: {session.lrn || 'N/A'}).</span>
      </article>
    </section>
  );
}
