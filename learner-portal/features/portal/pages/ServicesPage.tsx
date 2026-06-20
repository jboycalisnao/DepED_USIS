import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { LearnerPortalAccessRecord } from '../../auth/services/learnerAccess';
import { hasMerchControlCredential } from '../services/learnerMerchControlService';
import { loadActiveIdOrderPeriod, loadLearnerIdServiceAvailability } from '../services/learnerIdService';
import { buildLearnerServicesCatalog } from './services/servicesCatalog';
import usisIcon from '../../../../common/assets/USIS_Icon.png';

export function ServicesPage({ session }: { session: LearnerPortalAccessRecord }) {
  const [hasMerchControl, setHasMerchControl] = useState(false);
  const [canRequestId, setCanRequestId] = useState(false);
  const [isIdPublished, setIsIdPublished] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const [allowed, activePeriod, availability] = await Promise.all([
          hasMerchControlCredential({ learnerId: session.learnerId, learnerLrn: session.lrn }),
          loadActiveIdOrderPeriod(),
          loadLearnerIdServiceAvailability(),
        ]);
        if (!cancelled) setHasMerchControl(allowed);
        if (!cancelled) setCanRequestId(Boolean(activePeriod?.id));
        if (!cancelled) setIsIdPublished(Boolean(availability.isPublished));
      } catch {
        if (!cancelled) setHasMerchControl(false);
        if (!cancelled) setCanRequestId(false);
        if (!cancelled) setIsIdPublished(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [session.learnerId, session.lrn]);

  const learnerServicesCatalog = buildLearnerServicesCatalog({ canRequestId, hasMerchControl, isIdPublished });

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
          card.isDisabled ? (
            <div
              key={card.path}
              className="learner-services-card learner-services-card--link learner-services-card--disabled"
              role="listitem"
              aria-disabled="true"
            >
              <div className="learner-services-card__top" aria-hidden="true" />
              <div className="learner-services-card__body">
                <div className="learner-services-card__icon-wrap" aria-hidden="true">
                  <img src={usisIcon} alt="" className="learner-services-card__icon" />
                </div>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
                <span className="learner-services-card__action">{card.actionLabel}</span>
                {card.disabledMessage ? <span className="learner-services-card__disabled-note">{card.disabledMessage}</span> : null}
              </div>
            </div>
          ) : (
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
          )
        ))}
      </div>
    </section>
  );
}
