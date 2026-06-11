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
import { PortalSeo } from '../../../../components/ui/PortalSeo';

export function AdmissionPortalPage() {
  const { regionSlug, divisionSlug, schoolId } = useParams();
  const { isLoading, portal, error } = useAdmissionPortal(regionSlug, divisionSlug, schoolId);
  const canonicalPath =
    regionSlug && divisionSlug && schoolId
      ? `/admissions/${regionSlug}/${divisionSlug}/${schoolId}`
      : '/admissions/region-vi/iloilo/302345';

  if (isLoading) {
    return (
      <>
        <PortalSeo
          title="Loading school portal | DepED USIS"
          description="Loading the school admissions portal."
          canonicalPath={canonicalPath}
          robots="noindex,nofollow"
        />
        <PortalStatusPage eyebrow="SP Portal" title="Loading admissions portal." message="Please wait." />
      </>
    );
  }

  if (!portal) {
    return (
      <>
        <PortalSeo
          title="Admissions portal not found | DepED USIS"
          description="The requested school admissions portal could not be found."
          canonicalPath={canonicalPath}
          robots="noindex,nofollow"
        />
        <PortalStatusPage
          eyebrow="Invalid Route"
          title="Admissions portal not found."
          message="Please check the region, division, and school ID in the URL."
        />
      </>
    );
  }

  if (portal.status === 'inactive') {
    return (
      <>
        <PortalSeo
          title={`${portal.schoolName} school portal | Inactive`}
          description={`${portal.schoolName} admissions portal is currently inactive.`}
          canonicalPath={canonicalPath}
          robots="noindex,nofollow"
        />
        <PortalStatusPage
          eyebrow="Inactive Portal"
          title="This school admission portal is currently inactive."
          message="Please contact the school for official admission updates."
        />
      </>
    );
  }

  const portalDescription = [
    `Official school admissions portal for ${portal.schoolName}.`,
    `View notices, requirements, grade levels, and application guidance for ${portal.divisionName}, ${portal.regionName}.`,
  ].join(' ');
  const portalUrl = canonicalPath;
  const portalTelephone = portal.contact.phone.toLowerCase().includes('announcement') ? undefined : portal.contact.phone;
  const portalEmail = portal.contact.email.toLowerCase().includes('announcement') ? undefined : portal.contact.email;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'School',
    name: portal.schoolName,
    url: typeof window === 'undefined' ? portalUrl : `${window.location.origin}${portalUrl}`,
    description: portalDescription,
    address: {
      '@type': 'PostalAddress',
      streetAddress: portal.contact.address,
    },
    email: portalEmail,
    telephone: portalTelephone,
  };

  return (
    <>
      <PortalSeo
        title={`${portal.schoolName} school portal | Special Program admissions`}
        description={portalDescription}
        canonicalPath={canonicalPath}
        structuredData={structuredData}
      />
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
