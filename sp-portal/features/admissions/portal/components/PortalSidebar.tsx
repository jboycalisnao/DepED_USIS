import type { AdmissionPortal } from '../types';

type PortalSidebarProps = {
  portal: AdmissionPortal;
};

const statusLabels = {
  open: 'Admissions Open',
  closed: 'Admissions Closed',
  inactive: 'Inactive',
};

export function PortalSidebar({ portal }: PortalSidebarProps) {
  const isOpen = portal.status === 'open';

  return (
    <aside className="portal-sidebar" aria-label="SP Portal actions and contact information">
      <section className="portal-panel">
        <div className="portal-panel__header">
          <h2>SP Portal Links</h2>
        </div>
        <div className="portal-panel__body portal-link-stack">
          <a
            className="portal-side-button portal-side-button--blue"
            aria-disabled={!isOpen}
            href={isOpen ? portal.applicationUrl : undefined}
          >
            Online Application
          </a>
          <a className="portal-side-button portal-side-button--red" href="#bulletins">
            Admission Notices
          </a>
          <a className="portal-side-button portal-side-button--yellow" href="#requirements">
            Requirements
          </a>
          <a className="portal-side-button portal-side-button--blue" href="#programs">
            Programs Offered
          </a>
        </div>
      </section>

      <section className="portal-panel">
        <div className="portal-panel__header">
          <h2>Portal Status</h2>
        </div>
        <div className="portal-panel__body">
          <span className={`status-badge status-badge--${portal.status}`}>{statusLabels[portal.status]}</span>
          <dl className="sidebar-details">
            <div>
              <dt>School</dt>
              <dd>{portal.schoolName}</dd>
            </div>
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
        </div>
      </section>

      <section className="portal-panel" id="contact">
        <div className="portal-panel__header">
          <h2>Contact Info</h2>
        </div>
        <div className="portal-panel__body">
          <h3>{portal.contact.office}</h3>
          <dl className="sidebar-details">
            <div>
              <dt>Email</dt>
              <dd>{portal.contact.email}</dd>
            </div>
            <div>
              <dt>Contact Number</dt>
              <dd>{portal.contact.phone}</dd>
            </div>
            <div>
              <dt>Office Hours</dt>
              <dd>{portal.contact.officeHours}</dd>
            </div>
            <div>
              <dt>Address</dt>
              <dd>{portal.contact.address}</dd>
            </div>
          </dl>
        </div>
      </section>
    </aside>
  );
}
