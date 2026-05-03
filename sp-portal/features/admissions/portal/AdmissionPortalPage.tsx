import { useParams } from 'react-router-dom';
import { AdmissionTimeline } from './components/AdmissionTimeline';
import { ApplicationProcess } from './components/ApplicationProcess';
import { BulletinBoard } from './components/BulletinBoard';
import { PortalStatusPage } from './components/PortalStatusPage';
import { PortalSidebar } from './components/PortalSidebar';
import { PrivacyNotice } from './components/PrivacyNotice';
import { ProgramOfferings } from './components/ProgramOfferings';
import { RequirementsChecklist } from './components/RequirementsChecklist';
import { SchoolIdentityHeader } from './components/SchoolIdentityHeader';
import { useAdmissionPortal } from './hooks/useAdmissionPortal';

export function AdmissionPortalPage() {
  const { regionSlug, divisionSlug, schoolId } = useParams();
  const { isLoading, portal, error } = useAdmissionPortal(regionSlug, divisionSlug, schoolId);

  if (isLoading) {
    return <PortalStatusPage eyebrow="SP Portal" title="Loading admissions portal." message="Please wait." />;
  }

  if (!portal) {
    return (
      <PortalStatusPage
        eyebrow="Invalid Route"
        title="Admissions portal not found."
        message="Please check the region, division, and school ID in the URL."
      />
    );
  }

  if (portal.status === 'inactive') {
    return (
      <PortalStatusPage
        eyebrow="Inactive Portal"
        title="This school admission portal is currently inactive."
        message="Please contact the school for official admission updates."
      />
    );
  }

  return (
    <>
      {error ? <p className="portal-data-note">{error}</p> : null}
      <div className="portal-layout">
        <div className="portal-main-column">
          <SchoolIdentityHeader portal={portal} />
          <AdmissionTimeline timeline={portal.timeline} isClosed={portal.status === 'closed'} />
          <BulletinBoard bulletins={portal.bulletins} />
          <ProgramOfferings offerings={portal.offerings} />
          <RequirementsChecklist requirements={portal.requirements} />
          <ApplicationProcess />
          <PrivacyNotice />
        </div>
        <PortalSidebar portal={portal} />
      </div>
    </>
  );
}
