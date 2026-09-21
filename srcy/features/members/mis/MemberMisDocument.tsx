import React from 'react';
import leonNhsSeal from '../../../../common/assets/rsz_leon_nhs_-_sealblue.png';
import rcyEmblem from '../../../../common/assets/RCY Emblem.png';
import rcyTypeMark from '../../../assets/RCY Type Mark.png';
import usisWhiteLogo from '../../../assets/USIS White.png';
import leonNhsWhiteSeal from '../../../assets/Leon NHS - Seal(White Outline).png';
import {
  calculateAge,
  type SrcyMemberRecord,
} from '../services/srcyMembershipService';
import { type SrcyDomRecord } from '../services/srcyDomService';

export type MemberMisHistoryItem = {
  domNumber: string;
  schoolYear?: string;
  validFrom: string;
  validUntil: string;
  domStatus: string;
};

export type MemberMisTrainingItem = {
  date: string;
  description: string;
  validityPeriod: string;
  status: string;
};

export type MemberMisDocumentProps = {
  member: SrcyMemberRecord;
  attachedDom?: SrcyDomRecord | null;
  domHistory?: MemberMisHistoryItem[];
  trainings?: MemberMisTrainingItem[];
  generatedBy?: string;
};

const MIN_TABLE_ROWS = 4;

export const MemberMisDocument = React.forwardRef<HTMLDivElement, MemberMisDocumentProps>(
  ({ member, attachedDom, domHistory = [], trainings = [], generatedBy = 'Authorized Staff' }, ref) => {
    const age = calculateAge(member.birthdate);
    const schoolYear = attachedDom?.schoolYear
      ? attachedDom.schoolYear.startsWith('S.Y.')
        ? attachedDom.schoolYear
        : `S.Y. ${attachedDom.schoolYear}`
      : 'Current Term';

    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
    const formattedTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const displayHistory: MemberMisHistoryItem[] =
      domHistory.length > 0
        ? domHistory
        : attachedDom
        ? [
            {
              domNumber: attachedDom.domNumber,
              schoolYear: attachedDom.schoolYear,
              validFrom: attachedDom.validFrom,
              validUntil: attachedDom.validUntil,
              domStatus: attachedDom.status,
            },
          ]
        : [];

    // Pad arrays to guarantee exactly at least 4 rows for each table
    const historyRows: (MemberMisHistoryItem | null)[] = [...displayHistory];
    while (historyRows.length < MIN_TABLE_ROWS) {
      historyRows.push(null);
    }

    const trainingRows: (MemberMisTrainingItem | null)[] = [...trainings];
    while (trainingRows.length < MIN_TABLE_ROWS) {
      trainingRows.push(null);
    }

    return (
      <div className="srcy-mis-sheet" ref={ref}>
        <div className="srcy-mis-main">
          {/* Official Header */}
          <header className="srcy-mis-header">
          <div className="srcy-mis-branding">
            <img
              src={leonNhsSeal}
              alt="Leon National High School Seal"
              className="srcy-mis-logo"
            />
            <img
              src={rcyEmblem}
              alt="Philippine Red Cross Youth Emblem"
              className="srcy-mis-logo"
            />
            <img
              src={rcyTypeMark}
              alt="Leon NHS Senior Red Cross Youth Council"
              className="srcy-mis-type-mark"
            />
          </div>

          <div className="srcy-mis-doc-box">
            <div className="srcy-mis-doc-label">DOCUMENT NO:</div>
            <div className="srcy-mis-doc-no">SRCY-F001</div>
            <div className="srcy-mis-doc-meta">Issue No.: 1</div>
            <div className="srcy-mis-doc-meta">Version: 1</div>
            <div className="srcy-mis-doc-meta">Date of Effectivity: 09-16-2026</div>
          </div>
        </header>

        <hr className="srcy-mis-divider" />

        <h1 className="srcy-mis-title">MEMBER INFORMATION SHEET (MIS)</h1>

        {/* Card 1: Academic & MAAB Benefit Header Card */}
        <section className="srcy-mis-card">
          <div className="srcy-mis-card__header">
            <div className="srcy-mis-card__title">
              <span className="material-symbols-outlined" aria-hidden="true">
                verified_user
              </span>
              <span>Accreditation &amp; Benefit Coverage</span>
            </div>
            <span className="srcy-mis-sy-badge">School Year: {schoolYear}</span>
          </div>
          <div className="srcy-mis-card__body">
            <div className="srcy-mis-maab-bar">
              <div>
                <div className="srcy-mis-maab-title">
                  MAAB ID: {member.maabId ? member.maabId : 'NOT ASSIGNED'}
                </div>
                <div className="srcy-mis-maab-sub">
                  Membership Accident Assistance Benefit &bull; Philippine Red Cross
                </div>
              </div>
            </div>

            <div className="srcy-mis-grid">
              <div className="srcy-mis-item">
                <span className="srcy-mis-label">Attached DOM Batch</span>
                <span className="srcy-mis-value">
                  {attachedDom ? (
                    <strong>
                      {attachedDom.domNumber} &bull; {attachedDom.title}
                    </strong>
                  ) : (
                    'Unassigned DOM'
                  )}
                </span>
              </div>
              <div className="srcy-mis-item">
                <span className="srcy-mis-label">Membership Validity</span>
                <span className="srcy-mis-value">
                  {attachedDom ? (
                    `${attachedDom.validFrom} to ${attachedDom.validUntil}`
                  ) : (
                    <span style={{ color: '#ce1126' }}>Pending Active Batch</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Card 2: Personal & Contact Information Card */}
        <section className="srcy-mis-card">
          <div className="srcy-mis-card__header">
            <div className="srcy-mis-card__title">
              <span className="material-symbols-outlined" aria-hidden="true">
                person
              </span>
              <span>Learner &amp; Personal Profile</span>
            </div>
          </div>
          <div className="srcy-mis-card__body">
            <div className="srcy-mis-grid">
              <div className="srcy-mis-item">
                <span className="srcy-mis-label">Name</span>
                <span className="srcy-mis-value">
                  <strong>{member.fullName}</strong>
                </span>
              </div>
              <div className="srcy-mis-item">
                <span className="srcy-mis-label">Age</span>
                <span className="srcy-mis-value">
                  {age !== null ? `${age} years old` : '-'}
                  {member.birthdate ? ` (${member.birthdate})` : ''}
                </span>
              </div>
              <div className="srcy-mis-item srcy-mis-item--full">
                <span className="srcy-mis-label">Complete Address</span>
                <span className="srcy-mis-value">{member.address || '-'}</span>
              </div>
              <div className="srcy-mis-item">
                <span className="srcy-mis-label">Contact Number</span>
                <span className="srcy-mis-value">{member.contactNo || '-'}</span>
              </div>
              <div className="srcy-mis-item">
                <span className="srcy-mis-label">Grade and Section</span>
                <span className="srcy-mis-value">
                  {[member.gradeLevel, member.section].filter(Boolean).join(' - ') || '-'}
                </span>
              </div>
              <div className="srcy-mis-item">
                <span className="srcy-mis-label">Learner Reference No. (LRN)</span>
                <span className="srcy-mis-value">{member.learnerLrn || '-'}</span>
              </div>
              <div className="srcy-mis-item">
                <span className="srcy-mis-label">Emergency Contact</span>
                <span className="srcy-mis-value">{member.emergencyContact || '-'}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Card 3: Membership Information (DOM History) */}
        <section className="srcy-mis-card">
          <div className="srcy-mis-card__header">
            <div className="srcy-mis-card__title">
              <span className="material-symbols-outlined" aria-hidden="true">
                history_edu
              </span>
              <span>Membership Information</span>
            </div>
          </div>
          <div className="srcy-mis-card__body" style={{ padding: 0 }}>
            <table className="srcy-mis-table">
              <thead>
                <tr>
                  <th style={{ width: '28%' }}>DOM ID</th>
                  <th style={{ width: '22%' }}>School Year</th>
                  <th style={{ width: '32%' }}>Validity Period</th>
                  <th style={{ width: '18%' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {historyRows.map((item, index) => {
                  if (!item) {
                    return (
                      <tr key={`empty-dom-${index}`} className="srcy-mis-row--placeholder">
                        <td className="srcy-mis-cell--placeholder">&nbsp;</td>
                        <td className="srcy-mis-cell--placeholder">&nbsp;</td>
                        <td className="srcy-mis-cell--placeholder">&nbsp;</td>
                        <td className="srcy-mis-cell--placeholder">&nbsp;</td>
                      </tr>
                    );
                  }

                  const statusLower = (item.domStatus || '').toLowerCase();
                  const pillClass =
                    statusLower === 'active'
                      ? 'srcy-mis-pill--active'
                      : statusLower === 'pending'
                      ? 'srcy-mis-pill--pending'
                      : 'srcy-mis-pill--expired';

                  return (
                    <tr key={`${item.domNumber}-${index}`}>
                      <td>
                        <strong>{item.domNumber}</strong>
                      </td>
                      <td>{item.schoolYear || '-'}</td>
                      <td>
                        {item.validFrom && item.validUntil
                          ? `${item.validFrom} to ${item.validUntil}`
                          : '-'}
                      </td>
                      <td>
                        <span className={`srcy-mis-pill ${pillClass}`}>
                          {item.domStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Card 4: Trainings */}
        <section className="srcy-mis-card">
          <div className="srcy-mis-card__header">
            <div className="srcy-mis-card__title">
              <span className="material-symbols-outlined" aria-hidden="true">
                model_training
              </span>
              <span>Trainings</span>
            </div>
          </div>
          <div className="srcy-mis-card__body" style={{ padding: 0 }}>
            <table className="srcy-mis-table">
              <thead>
                <tr>
                  <th style={{ width: '22%' }}>Date</th>
                  <th style={{ width: '42%' }}>Description</th>
                  <th style={{ width: '22%' }}>Validity Period</th>
                  <th style={{ width: '14%' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {trainingRows.map((t, idx) => {
                  if (!t) {
                    return (
                      <tr key={`empty-training-${idx}`} className="srcy-mis-row--placeholder">
                        <td className="srcy-mis-cell--placeholder">&nbsp;</td>
                        <td className="srcy-mis-cell--placeholder">&nbsp;</td>
                        <td className="srcy-mis-cell--placeholder">&nbsp;</td>
                        <td className="srcy-mis-cell--placeholder">&nbsp;</td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={idx}>
                      <td>{t.date}</td>
                      <td>
                        <strong>{t.description}</strong>
                      </td>
                      <td>{t.validityPeriod}</td>
                      <td>
                        <span
                          className={`srcy-mis-pill ${
                            t.status === 'Completed'
                              ? 'srcy-mis-pill--active'
                              : 'srcy-mis-pill--pending'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Institutional Footer */}
      <footer className="srcy-mis-footer">
          <div className="srcy-mis-footer__left">
            <img
              src={leonNhsWhiteSeal}
              alt="Leon NHS Seal"
              className="srcy-mis-footer-seal"
            />
            <img
              src={usisWhiteLogo}
              alt="USIS - Unified School Information System"
              className="srcy-mis-footer-usis-logo"
            />
          </div>

          <div className="srcy-mis-footer__divider" />

          <div className="srcy-mis-footer__right">
            <div className="srcy-mis-footer-notice">
              **This system is an independent system from other Red Cross/Red Cross Youth system**
            </div>
            <div className="srcy-mis-footer-meta">
              Generate using Leon NHS &ndash; Unified School Information System (USIS) &ndash; SRCY Module
            </div>
            <div className="srcy-mis-footer-meta">
              by {generatedBy} on {formattedDate} {formattedTime}
            </div>
          </div>
        </footer>
      </div>
    );
  },
);

MemberMisDocument.displayName = 'MemberMisDocument';
