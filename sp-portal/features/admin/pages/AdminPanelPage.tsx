import { ApplicationTable } from '../components/ApplicationTable';
import { AdminSummary } from '../components/AdminSummary';
import { PortalControls } from '../components/PortalControls';
import { useSpPortalAdminWorkspace } from '../hooks/useSpPortalAdminWorkspace';
import { clearSpPortalAdminAccess, getStoredSpPortalAdminAccess } from '../utils/spPortalAdminAccess';

export function AdminPanelPage() {
  const access = getStoredSpPortalAdminAccess();
  const {
    applications,
    error,
    isLoading,
    isSaving,
    notice,
    portals,
    refresh,
    setApplicationStatus,
    setPortalStatus,
    stats,
  } = useSpPortalAdminWorkspace(access);

  return (
    <div className="application-layout">
      <section className="portal-panel application-panel">
        <div className="portal-panel__header">
          <h1>SP Portal Admin Panel</h1>
        </div>
        <div className="portal-panel__body">
          <p className="application-context">
            {access?.coordinatorName} - {access?.coordinatorRole} - {access?.schoolName}
          </p>

          <div className="admin-toolbar">
            <div>
              <p className="page-intro__eyebrow">Admissions Management</p>
              <h2>Applications and Sign-up Control</h2>
            </div>
            <div className="admin-toolbar__actions">
              <button className="secondary-button" disabled={isLoading || isSaving} type="button" onClick={() => void refresh()}>
                Refresh
              </button>
              <button className="portal-button" type="button" onClick={() => {
                clearSpPortalAdminAccess();
                window.location.href = '/application/start';
              }}>
                Sign Out
              </button>
            </div>
          </div>

          {error ? <p className="application-access__feedback">{error}</p> : null}
          {notice ? <p className="application-feedback">{notice}</p> : null}

          {isLoading ? (
            <div className="application-locked-panel">
              <strong>Loading workspace.</strong>
              <span>Please wait while the SP Portal records are loaded.</span>
            </div>
          ) : (
            <div className="admin-workspace">
              <AdminSummary stats={stats} />

              <section className="admin-section">
                <div className="admin-section__header">
                  <p className="page-intro__eyebrow">Portal Settings</p>
                  <h2>Sign-up Page Access</h2>
                </div>
                <PortalControls isSaving={isSaving} portals={portals} onStatusChange={setPortalStatus} />
              </section>

              <section className="admin-section">
                <div className="admin-section__header">
                  <p className="page-intro__eyebrow">Application Registry</p>
                  <h2>Submitted Applications</h2>
                </div>
                <ApplicationTable
                  applications={applications}
                  isSaving={isSaving}
                  onStatusChange={setApplicationStatus}
                />
              </section>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
