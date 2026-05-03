import type { AdmissionPortal } from '../types';

type SchoolIdentityHeaderProps = {
  portal: AdmissionPortal;
};

const statusLabels = {
  open: 'Admissions Open',
  closed: 'Admissions Closed',
  inactive: 'Inactive',
};

export function SchoolIdentityHeader({ portal }: SchoolIdentityHeaderProps) {
  const isOpen = portal.status === 'open';

  return (
    <section className="portal-panel portal-hero" id="admissions">
      <div className="portal-panel__header">
        <h1>Official Admissions Portal</h1>
      </div>
      <div className="portal-panel__body portal-hero__content">
        <div className="portal-hero__heading">
          <p className="page-intro__eyebrow">School-based SP Portal</p>
          <h2>{portal.schoolName}</h2>
          <span className={`status-badge status-badge--${portal.status}`}>
            {statusLabels[portal.status]}
          </span>
        </div>
        <p>{portal.heroCopy}</p>
        <p>
          You are viewing: {portal.schoolName} - School ID {portal.schoolId} - {portal.divisionName} -{' '}
          {portal.regionName}
        </p>
        <dl className="portal-context">
          <div>
            <dt>School ID</dt>
            <dd>{portal.schoolId}</dd>
          </div>
          <div>
            <dt>Division</dt>
            <dd>{portal.divisionName}</dd>
          </div>
          <div>
            <dt>Region</dt>
            <dd>{portal.regionName}</dd>
          </div>
        </dl>
        <div className="portal-actions">
          <a className="portal-button" aria-disabled={!isOpen} href={isOpen ? portal.applicationUrl : undefined}>
            Proceed to Application Form
          </a>
          <a className="portal-link" href="#requirements">
            View Requirements
          </a>
        </div>
      </div>
    </section>
  );
}
