import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ApplicationAccessPanel } from './components/ApplicationAccessModal';
import { ApplicationForm } from './components/ApplicationForm';
import { PortalStatusPage } from '../portal/components/PortalStatusPage';
import { useAdmissionPortal } from '../portal/hooks/useAdmissionPortal';
import { PortalSeo } from '../../../components/ui/PortalSeo';

export function ApplicationStartPage() {
  const { regionSlug, divisionSlug, schoolId } = useParams();
  const { isLoading, portal } = useAdmissionPortal(regionSlug, divisionSlug, schoolId);
  const [accessEmail, setAccessEmail] = useState<string | null>(null);
  const canonicalPath =
    regionSlug && divisionSlug && schoolId
      ? `/admissions/${regionSlug}/${divisionSlug}/${schoolId}/application`
      : '/admissions/region-vi/iloilo/302345/application';

  if (isLoading) {
    return (
      <>
        <PortalSeo
          title="Loading application form | DepED USIS"
          description="Loading the school admissions application form."
          canonicalPath={canonicalPath}
          robots="noindex,nofollow"
        />
        <PortalStatusPage eyebrow="SP Application" title="Loading application form." message="Please wait." />
      </>
    );
  }

  if (!portal) {
    return (
      <>
        <PortalSeo
          title="Application portal not found | DepED USIS"
          description="The requested school admissions application page could not be found."
          canonicalPath={canonicalPath}
          robots="noindex,nofollow"
        />
        <PortalStatusPage
          eyebrow="Invalid Route"
          title="Application portal not found."
          message="Please return to the school admissions portal and open the application form again."
        />
      </>
    );
  }

  const pageTitle = `${portal.schoolName} application form | School portal`;
  const pageDescription = `Apply through the school portal for ${portal.schoolName}. Review eligibility, sign in, and continue the Special Program application process.`;

  return (
    <div className="application-layout">
      <PortalSeo
        title={pageTitle}
        description={pageDescription}
        canonicalPath={canonicalPath}
        robots="noindex,nofollow"
      />
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
