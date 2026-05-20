import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SystemConfig } from '../types';

interface PublicPortalProps {
  config: SystemConfig;
}

export const PublicPortal: React.FC<PublicPortalProps> = ({ config }) => {
  const navigate = useNavigate();

  const serviceCards = [
    {
      title: 'Parent and Student Inquiry',
      desc: 'Check learner payment history, receipt references, and posted obligations from the public inquiry window.',
      action: 'Open Parent Portal',
      icon: 'person_search',
      path: '/parent'
    },
    {
      title: 'Adviser Collection Monitoring',
      desc: 'Review section-based collections and payment standing for adviser reporting and follow-up.',
      action: 'Open Adviser Desk',
      icon: 'supervisor_account',
      path: '/adviser'
    }
  ];

  return (
    <div className="section-shell animate-fade-in pb-12">
      <div className="mx-auto max-w-5xl">
      <div className="section-shell__header text-center">
        <p className="section-shell__eyebrow">SPTA Public Services</p>
        <h2>{config.schoolName || 'Leon National High School'}</h2>
        <p className="section-shell__description">
          Public inquiry and adviser monitoring workspace for SPTA records.
        </p>
      </div>

      <div className="section-grid">
        <article className="notice-box">
          <strong>Service Scope</strong>
          <span>Inquiry desk, adviser records access, and receipt verification</span>
        </article>
        <article className="notice-box">
          <strong>School Year</strong>
          <span>{config.schoolYear || 'Current School Year'}</span>
        </article>
        <article className="notice-box">
          <strong>Reminder</strong>
          <span>Please prepare learner name, section, or LRN before starting a search.</span>
        </article>
      </div>

      <div className="section-grid mt-5">
        {serviceCards.map((card) => (
          <article key={card.title} className="portal-panel">
            <div className="portal-panel__header">
              <h2>{card.title}</h2>
            </div>
            <div className="portal-panel__body">
              <p className="text-slate-600">{card.desc}</p>
              <button
                onClick={() => navigate(card.path)}
                className="m3-btn-primary mt-4 inline-flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">{card.icon}</span>
                {card.action}
              </button>
            </div>
          </article>
        ))}
      </div>
      </div>
    </div>
  );
};
