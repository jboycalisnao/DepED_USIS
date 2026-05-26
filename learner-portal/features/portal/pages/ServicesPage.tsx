import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { LearnerPortalAccessRecord } from '../../auth/services/learnerAccess';
import { hasMerchControlCredential } from '../services/learnerMerchControlService';
import { buildLearnerServicesCatalog } from './services/servicesCatalog';
import usisIcon from '../../../../common/assets/USIS_Icon.png';

export function ServicesPage({ session }: { session: LearnerPortalAccessRecord }) {
  const [hasMerchControl, setHasMerchControl] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const allowed = await hasMerchControlCredential({ learnerId: session.learnerId, learnerLrn: session.lrn });
        if (!cancelled) setHasMerchControl(allowed);
      } catch {
        if (!cancelled) setHasMerchControl(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [session.learnerId, session.lrn]);

  const learnerServicesCatalog = buildLearnerServicesCatalog(hasMerchControl);

  return (
    <section className="section-shell">
      <div className="portal-panel learner-tab-panel">
        <header className="portal-panel__header learner-tab-header">
          <h2>Services</h2>
          <p>Select a learner service to open its dedicated page.</p>
        </header>
      </div>

      <div className="learner-services-grid" role="list" aria-label="Learner services">
        {learnerServicesCatalog.map((card) => (
          <Link key={card.path} to={card.path} className="learner-services-card learner-services-card--link" role="listitem">
            <div className="learner-services-card__top" aria-hidden="true" />
            <div className="learner-services-card__body">
              <div className="learner-services-card__icon-wrap" aria-hidden="true">
                <img src={usisIcon} alt="" className="learner-services-card__icon" />
              </div>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
              <span className="learner-services-card__action">{card.actionLabel}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
