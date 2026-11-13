import React from 'react';
import { UsisDocumentLetterhead } from '../../../../common/components/UsisDocumentLetterhead';
import type { SccServiceRequest } from '../../../types';
import {
  LEON_NHS_PRIVACY_CLAUSES,
  LEON_NHS_PRIVACY_CONTRACT_INTRO,
} from '../constants/dataPrivacyTerms';

export interface SccEmailRequestDocumentProps {
  request: SccServiceRequest;
  adviserName?: string;
  schoolId?: string;
  schoolName?: string;
  showFrame?: boolean;
  className?: string;
}

const formatRequestStatus = (status: SccServiceRequest['status']): string => {
  switch (status) {
    case 'provisioned':
      return 'Provisioned / Active';
    case 'approved':
      return 'Approved by Coordinator';
    case 'under_review':
      return 'Under Review';
    case 'rejected':
      return 'Rejected';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Pending Review';
  }
};

const formatDateTime = (iso?: string): string => {
  if (!iso) return 'N/A';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatShortDate = (iso?: string): string => {
  if (!iso) return 'N/A';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Two-page auto-filled institutional Email Account Request Form wrapped in the shared USIS letterhead:
 * - Page 1 of 2: Request details, mailbox configuration, operational justification, and endorsements.
 * - Page 2 of 2: Data Privacy Contract, Leon NHS Data Privacy Terms, and Requesting Party signature block.
 */
export function SccEmailRequestDocument({
  request,
  adviserName,
  schoolId = '301446',
  schoolName = 'Leon National High School',
  showFrame = true,
  className = '',
}: SccEmailRequestDocumentProps) {
  const rawAlias = (request.details?.requestedMailboxAlias || '')
    .trim()
    .toLowerCase()
    .replace(/@leonnhs\.edu\.ph$/i, '');
  const desiredEmail = rawAlias ? `${rawAlias}@leonnhs.edu.ph` : 'N/A';
  const notificationEmail = (request.details?.notificationEmail || '').trim() || 'N/A';
  const assignedEmail = request.provisionedData?.assignedEmail?.trim() || '';
  const resolvedAdviser = (adviserName || '').trim() || 'Designated Teacher Adviser';
  const signatoryName =
    (request.details?.dataPrivacySignatory || '').trim() || request.requesterName;
  const signedTimestamp = request.details?.dataPrivacySignedAt || request.createdAt;
  const isPrivacyAccepted = Boolean(request.details?.dataPrivacyAccepted);

  return (
    <div className="scc-email-doc-pages">
      {/* Page 1: Request Details & Endorsements */}
      <UsisDocumentLetterhead
        documentTitle="EMAIL ACCOUNT REQUEST FORM"
        documentNo="USIS-SCC-F001"
        issueNo="1"
        revisionNo="1"
        dateOfEffectivity="June 8, 2026"
        issuedBy="ICT / SCC"
        pageNo="Page 1 of 2"
        showFrame={showFrame}
        className={className}
        bodyClassName="scc-email-doc"
      >
        {/* Filing & Control Strip */}
        <table className="scc-email-doc__table scc-email-doc__table--meta">
          <tbody>
            <tr>
              <th scope="row">Tracking No.</th>
              <td className="scc-email-doc__strong">{request.trackingNumber}</td>
              <th scope="row">Date Submitted</th>
              <td>{formatDateTime(request.createdAt)}</td>
            </tr>
            <tr>
              <th scope="row">Priority Level</th>
              <td className="scc-email-doc__strong">{request.priority.toUpperCase()}</td>
              <th scope="row">Current Status</th>
              <td className="scc-email-doc__strong">{formatRequestStatus(request.status)}</td>
            </tr>
          </tbody>
        </table>

        {/* Section I: Organization & Requester */}
        <section className="scc-email-doc__section">
          <h2 className="scc-email-doc__section-title">I. Organization &amp; Requester Details</h2>
          <table className="scc-email-doc__table">
            <tbody>
              <tr>
                <th scope="row">Organization / Club</th>
                <td>
                  <strong>{request.organizationName}</strong> ({request.organizationAcronym})
                </td>
                <th scope="row">School / School ID</th>
                <td>
                  {schoolName} ({schoolId})
                </td>
              </tr>
              <tr>
                <th scope="row">Requested By</th>
                <td>
                  <strong>{request.requesterName}</strong> ({request.requesterPosition})
                </td>
                <th scope="row">Teacher Adviser</th>
                <td>{resolvedAdviser}</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Section II: Requested Mailbox Configuration */}
        <section className="scc-email-doc__section">
          <h2 className="scc-email-doc__section-title">II. Institutional Mailbox Specifications</h2>
          <table className="scc-email-doc__table">
            <tbody>
              <tr>
                <th scope="row">Service Requested</th>
                <td>{request.serviceTitle}</td>
                <th scope="row">Desired Domain Email</th>
                <td className="scc-email-doc__mono scc-email-doc__strong">{desiredEmail}</td>
              </tr>
              <tr>
                <th scope="row">Notification Email</th>
                <td className="scc-email-doc__mono">{notificationEmail}</td>
                <th scope="row">Request Title / Summary</th>
                <td>{request.title}</td>
              </tr>
              {assignedEmail ? (
                <tr>
                  <th scope="row">Provisioned Mailbox</th>
                  <td className="scc-email-doc__mono scc-email-doc__strong">{assignedEmail}</td>
                  <th scope="row">Provisioned Date</th>
                  <td>{formatShortDate(request.provisionedData?.provisionedAt || request.updatedAt)}</td>
                </tr>
              ) : null}
              {request.details?.customNotes ? (
                <tr>
                  <th scope="row">Additional Notes</th>
                  <td colSpan={3}>{request.details.customNotes}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>

        {/* Section III: Operational Justification */}
        <section className="scc-email-doc__section">
          <h2 className="scc-email-doc__section-title">III. Operational Justification &amp; Intended Use</h2>
          <div className="scc-email-doc__justification-box scc-email-doc__justification-box--tall">
            {request.justification || 'No operational justification stated.'}
          </div>
        </section>

        {/* Section IV: Request Certification & Institutional Endorsement */}
        <section className="scc-email-doc__section">
          <h2 className="scc-email-doc__section-title">
            IV. Request Certification &amp; Institutional Endorsement
          </h2>
          <p className="scc-email-doc__certification">
            I hereby certify that the information provided in this request is true and accurate, and that
            the executed Data Privacy Contract and Leon NHS Data Privacy Terms attached on Page 2 of 2
            form an integral part of this application.
          </p>

          <div className="scc-email-doc__signatories">
            <div className="scc-email-doc__sig-box">
              <span className="scc-email-doc__sig-role">Prepared &amp; Submitted By:</span>
              <div className="scc-email-doc__sig-line">{request.requesterName}</div>
              <span className="scc-email-doc__sig-sub">
                {request.requesterPosition}, {request.organizationAcronym}
              </span>
              <span className="scc-email-doc__sig-date">Date: {formatShortDate(request.createdAt)}</span>
            </div>

            <div className="scc-email-doc__sig-box">
              <span className="scc-email-doc__sig-role">Endorsed By (Teacher Adviser):</span>
              <div className="scc-email-doc__sig-line">{resolvedAdviser}</div>
              <span className="scc-email-doc__sig-sub">
                {request.adviserEndorsement ? 'Certified Endorsed in USIS Portal' : 'Organization Teacher Adviser'}
              </span>
              <span className="scc-email-doc__sig-date">
                Date: {request.adviserEndorsement ? formatShortDate(request.createdAt) : '________________'}
              </span>
            </div>

            <div className="scc-email-doc__sig-box">
              <span className="scc-email-doc__sig-role">Evaluated / Approved By:</span>
              <div className="scc-email-doc__sig-line">{request.reviewedBy || '\u00A0'}</div>
              <span className="scc-email-doc__sig-sub">School ICT / SCC Coordinator</span>
              <span className="scc-email-doc__sig-date">
                Date: {request.reviewedAt ? formatShortDate(request.reviewedAt) : '________________'}
              </span>
            </div>
          </div>
        </section>
      </UsisDocumentLetterhead>

      {/* Page 2: Data Privacy Contract & Leon NHS Data Privacy Terms */}
      <UsisDocumentLetterhead
        documentTitle="EMAIL ACCOUNT REQUEST FORM"
        documentNo="USIS-SCC-F001"
        issueNo="1"
        revisionNo="1"
        dateOfEffectivity="June 8, 2026"
        issuedBy="ICT / SCC"
        pageNo="Page 2 of 2"
        showFrame={showFrame}
        className={className}
        bodyClassName="scc-email-doc scc-email-doc--page2"
      >
        <table className="scc-email-doc__table scc-email-doc__table--meta">
          <tbody>
            <tr>
              <th scope="row">Reference Tracking No.</th>
              <td className="scc-email-doc__strong">{request.trackingNumber}</td>
              <th scope="row">Requested Mailbox</th>
              <td className="scc-email-doc__mono scc-email-doc__strong">{desiredEmail}</td>
            </tr>
            <tr>
              <th scope="row">Organization / Club</th>
              <td>
                <strong>{request.organizationName}</strong> ({request.organizationAcronym})
              </td>
              <th scope="row">Requesting Party</th>
              <td className="scc-email-doc__strong">{signatoryName}</td>
            </tr>
          </tbody>
        </table>

        <section className="scc-email-doc__section">
          <h2 className="scc-email-doc__section-title">
            V. Data Privacy Contract &amp; Leon National High School Data Privacy Terms
          </h2>
          <div className="scc-email-doc__privacy-box scc-email-doc__privacy-box--full">
            <p className="scc-email-doc__privacy-intro scc-email-doc__privacy-intro--full">
              {LEON_NHS_PRIVACY_CONTRACT_INTRO}
            </p>
            <ol className="scc-email-doc__privacy-list scc-email-doc__privacy-list--full">
              {LEON_NHS_PRIVACY_CLAUSES.map((clause) => (
                <li key={clause.title}>
                  <strong>{clause.title}:</strong> {clause.body}
                </li>
              ))}
            </ol>

            <div className="scc-email-doc__conforme scc-email-doc__conforme--full">
              <p className="scc-email-doc__conforme-title">
                CONFORME, UNDERTAKING &amp; ACKNOWLEDGMENT OF THE REQUESTING PARTY
              </p>
              <p className="scc-email-doc__conforme-text scc-email-doc__conforme-text--full">
                I, <strong>{signatoryName}</strong>, acting in my official capacity as{' '}
                <strong>{request.requesterPosition}</strong> of{' '}
                <strong>
                  {request.organizationName} ({request.organizationAcronym})
                </strong>
                , hereby affirm that I have carefully read, understood, and voluntarily accept this Data
                Privacy Contract and the Leon National High School Data Privacy Terms governing the
                issuance and operation of institutional mailbox{' '}
                <strong className="scc-email-doc__mono">{desiredEmail}</strong>. I assume full
                accountability for compliance with Republic Act No. 10173 (Data Privacy Act of 2012),
                R.A. 10175, DepEd Child Protection policies, and USIS ICT security directives.
              </p>

              {isPrivacyAccepted ? (
                <p className="scc-email-doc__econsent-note">
                  Electronically accepted via USIS SCC Portal by <strong>{signatoryName}</strong> on{' '}
                  {formatDateTime(signedTimestamp)}.
                </p>
              ) : null}

              <div className="scc-email-doc__conforme-sig-row scc-email-doc__conforme-sig-row--full">
                <div className="scc-email-doc__sig-inline">
                  <div className="scc-email-doc__sig-line">{signatoryName}</div>
                  <span className="scc-email-doc__sig-sub">
                    Signature over Printed Name of Requesting Party
                  </span>
                  <span className="scc-email-doc__sig-date">
                    {request.requesterPosition}, {request.organizationAcronym}
                  </span>
                </div>
                <div className="scc-email-doc__sig-inline">
                  <div className="scc-email-doc__sig-line">
                    {isPrivacyAccepted ? formatShortDate(signedTimestamp) : '\u00A0'}
                  </div>
                  <span className="scc-email-doc__sig-sub">Date Signed</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </UsisDocumentLetterhead>
    </div>
  );
}
export default SccEmailRequestDocument;
