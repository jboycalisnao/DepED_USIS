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
          <h2>Services Guide</h2>
          <p>Browse available learner services in order and select any service to open its page.</p>
        </header>
      </div>

      <div className="learner-services-list" role="list" aria-label="Learner services guide">
        {learnerServicesCatalog.map((card, index) => {
          const orderNumber = String(index + 1).padStart(2, '0');
          return card.isDisabled ? (
            <div
              key={card.path}
              className="learner-services-card learner-services-card--horizontal learner-services-card--disabled"
              role="listitem"
              aria-disabled="true"
            >
              <div className="learner-services-card__order" aria-hidden="true">
                <span className="learner-services-card__order-number">{orderNumber}</span>
              </div>
              <div className="learner-services-card__icon-wrap" aria-hidden="true">
                <img src={usisIcon} alt="" className="learner-services-card__icon" />
              </div>
              <div className="learner-services-card__content">
                <div className="learner-services-card__title-row">
                  <h3>{card.title}</h3>
                  {card.disabledMessage ? (
                    <span className="learner-services-card__disabled-note">{card.disabledMessage}</span>
                  ) : null}
                </div>
                <p>{card.description}</p>
              </div>
              <div className="learner-services-card__action-wrap">
                <span className="learner-services-card__action">{card.actionLabel}</span>
              </div>
            </div>
          ) : (
            <Link
              key={card.path}
              to={card.path}
              className="learner-services-card learner-services-card--horizontal learner-services-card--link"
              role="listitem"
            >
              <div className="learner-services-card__order" aria-hidden="true">
                <span className="learner-services-card__order-number">{orderNumber}</span>
              </div>
              <div className="learner-services-card__icon-wrap" aria-hidden="true">
                <img src={usisIcon} alt="" className="learner-services-card__icon" />
              </div>
              <div className="learner-services-card__content">
                <div className="learner-services-card__title-row">
                  <h3>{card.title}</h3>
                </div>
                <p>{card.description}</p>
              </div>
              <div className="learner-services-card__action-wrap">
                <span className="learner-services-card__action">
                  {card.actionLabel}
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
