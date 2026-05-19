export function OverviewPage() {
  return (
    <section className="support-page">
      <header className="support-page__header">
        <h2>School Learner Support Services</h2>
        <p>
          The Support portal centralizes learner welfare services for school-based intervention,
          health assistance, child protection case handling, and coordinated referrals.
        </p>
      </header>
      <article className="support-note-box">
        <strong>Portal scope</strong>
        <span>
          This subsystem is for authorized school personnel managing learner-support records and
          service workflows across Guidance, Clinic, Child Protection, and related support units.
        </span>
      </article>
      <div className="support-card-grid">
        <article className="support-card">
          <h3>Guidance</h3>
          <p>Counseling records, case notes, intervention plans, and learner follow-up documentation.</p>
        </article>
        <article className="support-card">
          <h3>Clinic</h3>
          <p>Clinic visit logs, first-aid encounters, health observations, and medical referral notes.</p>
        </article>
        <article className="support-card">
          <h3>Child Protection</h3>
          <p>Incident intake, case progression, actions taken, and policy compliance records.</p>
        </article>
        <article className="support-card">
          <h3>Support Services</h3>
          <p>Cross-unit referrals, coordinated intervention tracking, and future learner-support programs.</p>
        </article>
      </div>
    </section>
  );
}
