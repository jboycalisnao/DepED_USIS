import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ApplicationAccessPanel } from './components/ApplicationAccessModal';
import { ApplicationForm } from './components/ApplicationForm';
import { PortalStatusPage } from '../portal/components/PortalStatusPage';
import { useAdmissionPortal } from '../portal/hooks/useAdmissionPortal';

export function ApplicationStartPage() {
  const { regionSlug, divisionSlug, schoolId } = useParams();
  const { isLoading, portal } = useAdmissionPortal(regionSlug, divisionSlug, schoolId);
  const [accessEmail, setAccessEmail] = useState<string | null>(null);

  if (isLoading) {
    return <PortalStatusPage eyebrow="SP Application" title="Loading application form." message="Please wait." />;
  }

  if (!portal) {
    return (
      <PortalStatusPage
        eyebrow="Invalid Route"
        title="Application portal not found."
        message="Please return to the school admissions portal and open the application form again."
      />
    );
  }

  return (
    <div className="application-layout">
      <section className="portal-panel application-panel">
        <div className="portal-panel__header">
          <h1>Special Program Application</h1>
        </div>
        <div className="portal-panel__body">
          <p className="application-context">
            {portal.schoolName} - School ID {portal.schoolId} - {portal.divisionName} - {portal.regionName}
          </p>
          {accessEmail ? (
            portal.status === 'open' ? (
              <ApplicationForm portal={portal} />
            ) : (
              <div className="application-closed-panel">
                <strong>Applications are closed.</strong>
                <span>
                  You are signed in as {accessEmail}. New applications are not accepted while the school portal is
                  closed.
                </span>
              </div>
            )
          ) : (
            <ApplicationAccessPanel
              allowSignUp={portal.status === 'open'}
              schoolId={portal.schoolId}
              schoolName={portal.schoolName}
              onAccessGranted={setAccessEmail}
            />
          )}
        </div>
      </section>
    </div>
  );
}
