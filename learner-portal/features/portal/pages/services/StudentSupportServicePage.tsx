import { ComingSoonModalCard } from '../../components/ui/ComingSoonModalCard';

export function StudentSupportServicePage() {
  return (
    <section className="section-shell">
      <div className="portal-panel learner-tab-panel">
        <header className="portal-panel__header learner-tab-header">
          <h2>Student Support</h2>
          <p>Access guidance referrals and learner support service channels.</p>
        </header>
      </div>
      <ComingSoonModalCard message="Student support access and referral workflows will appear on this page." />
    </section>
  );
}
