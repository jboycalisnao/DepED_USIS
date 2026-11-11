import React, { useState } from 'react';
import type { SccSession, SccServiceKey } from '../../../types';
import { SCC_DIGITAL_SERVICES } from '../constants';
import { CreateServiceRequestModal } from '../../requests/modals/CreateServiceRequestModal';

interface SccServicesCatalogPageProps {
  session: SccSession;
}

export function SccServicesCatalogPage({ session }: SccServicesCatalogPageProps) {
  const [selectedService, setSelectedService] = useState<SccServiceKey | null>(null);

  return (
    <div className="scc-page-container">
      <div className="scc-page-header">
        <div>
          <h2 className="scc-page-title">Digital Services Catalog</h2>
          <p className="scc-page-subtitle">
            Explore and request institutional digital services provisioned by the School ICT Coordinator and Division IT.
          </p>
        </div>
      </div>

      <div className="scc-catalog-grid">
        {SCC_DIGITAL_SERVICES.map((srv) => (
          <article key={srv.key} className="scc-catalog-card">
            <div className="scc-catalog-card__header">
              <div className="scc-catalog-card__icon-wrap">
                <span className="material-symbols-outlined scc-catalog-card__icon">{srv.icon}</span>
              </div>
              <div className="scc-catalog-card__meta">
                <span className="scc-pill scc-pill--subtle">{srv.category}</span>
                <span className="scc-catalog-card__sla">Turnaround: {srv.slaTurnaround}</span>
              </div>
            </div>

            <h3 className="scc-catalog-card__title">{srv.title}</h3>
            <p className="scc-catalog-card__desc">{srv.description}</p>

            <div className="scc-catalog-card__section">
              <span className="scc-catalog-card__label">Requirements & Eligibility:</span>
              <ul className="scc-req-list">
                {srv.requirements.map((req, idx) => (
                  <li key={idx} className="scc-req-item">
                    <span className="material-symbols-outlined scc-check-icon">check</span>
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="scc-catalog-card__deliverable">
              <span className="scc-catalog-card__label">Deliverable:</span>
              <p className="scc-deliverable-text">{srv.sampleDeliverable}</p>
            </div>

            <div className="scc-catalog-card__actions">
              <button
                type="button"
                className="scc-btn scc-btn--primary scc-btn--full"
                onClick={() => setSelectedService(srv.key)}
              >
                <span className="material-symbols-outlined">send</span>
                Request This Service
              </button>
            </div>
          </article>
        ))}
      </div>

      {selectedService ? (
        <CreateServiceRequestModal
          isOpen={Boolean(selectedService)}
          session={session}
          initialServiceKey={selectedService}
          onClose={() => setSelectedService(null)}
          onCreated={() => {
            setSelectedService(null);
          }}
        />
      ) : null}
    </div>
  );
}
