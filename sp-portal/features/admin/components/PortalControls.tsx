import type { AdminPortalRecord, AdminPortalStatus } from '../utils/adminWorkspace';

type PortalControlsProps = {
  isSaving: boolean;
  onStatusChange: (portalId: string, status: AdminPortalStatus) => void;
  portals: AdminPortalRecord[];
};

const statusLabels: Record<AdminPortalStatus, string> = {
  closed: 'Closed',
  inactive: 'Inactive',
  open: 'Open',
};

export function PortalControls({ isSaving, onStatusChange, portals }: PortalControlsProps) {
  if (portals.length === 0) {
    return (
      <div className="application-locked-panel">
        <strong>No portal record found.</strong>
        <span>Create or migrate the school portal record before accepting online applications.</span>
      </div>
    );
  }

  return (
    <div className="admin-control-list">
      {portals.map((portal) => {
        const isOpen = portal.status === 'open';

        return (
          <article className="info-card admin-control-card" key={portal.id}>
            <div className="info-card__content">
              <div className="admin-control-card__header">
                <div>
                  <p className="info-card__eyebrow">{portal.schoolId}</p>
                  <h3>{portal.schoolName}</h3>
                </div>
                <span className={`status-badge status-badge--${portal.status}`}>
                  {statusLabels[portal.status]}
                </span>
              </div>
              <div className="admin-toggle-row">
                <div>
                  <strong>Sign-up page</strong>
                  <span>{isOpen ? 'Applicants can sign in and create accounts.' : 'New applicant account creation is disabled.'}</span>
                </div>
                <label className="admin-switch">
                  <input
                    type="checkbox"
                    checked={isOpen}
                    disabled={isSaving}
                    onChange={(event) => onStatusChange(portal.id, event.target.checked ? 'open' : 'closed')}
                  />
                  <span className="admin-switch__track" />
                </label>
              </div>
              <div className="admin-control-card__actions">
                <button
                  className="secondary-button"
                  disabled={isSaving || portal.status === 'inactive'}
                  type="button"
                  onClick={() => onStatusChange(portal.id, 'inactive')}
                >
                  Mark Inactive
                </button>
                <button
                  className="secondary-button"
                  disabled={isSaving || portal.status === 'closed'}
                  type="button"
                  onClick={() => onStatusChange(portal.id, 'closed')}
                >
                  Close Sign-up
                </button>
                <button
                  className="portal-button"
                  disabled={isSaving || portal.status === 'open'}
                  type="button"
                  onClick={() => onStatusChange(portal.id, 'open')}
                >
                  Open Sign-up
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
