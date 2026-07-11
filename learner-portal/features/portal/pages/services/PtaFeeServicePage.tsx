import type { LearnerPortalAccessRecord } from '../../../auth/services/learnerAccess';
import { UsisComingSoonCard } from '../../../../../common/components/UsisComingSoonCard';

type PtaFeeServicePageProps = {
  session: LearnerPortalAccessRecord;
};

export function PtaFeeServicePage({ session }: PtaFeeServicePageProps) {
  return (
    <section className="section-shell">
      <div className="portal-panel learner-tab-panel">
        <header className="portal-panel__header learner-tab-header">
          <h2>PTA Fee</h2>
          <p>PTA fee services are temporarily unavailable while this module is being prepared.</p>
        </header>
      </div>

      <UsisComingSoonCard
        title="Coming Soon"
        message={`PTA fee services for ${session.learnerName || 'your account'} will be available here once the module is enabled.`}
      />
    </section>
  );
}
