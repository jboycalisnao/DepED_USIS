import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import UsisPageLoader from '../../../../common/components/UsisPageLoader';
import {
  calculateAge,
  type SrcyMemberRecord,
} from '../services/srcyMembershipService';
import {
  getDomRecordStatusSummary,
  getMemberDomValiditySummary,
  type SrcyDomRecord,
} from '../services/srcyDomService';
import {
  fetchOrGetCachedMemberDetails,
  getCachedMemberDetails,
} from '../services/srcyMemberDetailsCache';

type MemberDetailsModalProps = {
  member: SrcyMemberRecord | null;
  onClose: () => void;
  onEdit: (member: SrcyMemberRecord) => void;
  onDelete: (member: SrcyMemberRecord) => void;
  onRenew?: (member: SrcyMemberRecord) => void;
  onGenerateMis?: (member: SrcyMemberRecord) => void;
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

export function MemberDetailsModal({
  member,
  onClose,
  onEdit,
  onDelete,
  onRenew,
  onGenerateMis,
}: MemberDetailsModalProps) {
  const cachedInitial = member ? getCachedMemberDetails(member.id) : null;
  const [activeTab, setActiveTab] = useState<'profile' | 'history'>('profile');
  const [domBatch, setDomBatch] = useState<SrcyDomRecord | null>(() => cachedInitial?.domBatch ?? null);
  const [allDoms, setAllDoms] = useState<SrcyDomRecord[]>(() => cachedInitial?.allDoms ?? []);
  const [history, setHistory] = useState<SrcyMemberRecord[]>(() => cachedInitial?.history ?? []);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(() => !cachedInitial);

  useEffect(() => {
    if (!member) {
      setDomBatch(null);
      setHistory([]);
      setIsLoadingHistory(false);
      return;
    }

    const cached = getCachedMemberDetails(member.id);
    if (cached) {
      setAllDoms(cached.allDoms);
      setHistory(cached.history);
      setDomBatch(cached.domBatch);
      setIsLoadingHistory(false);
      return;
    }

    setIsLoadingHistory(true);

    fetchOrGetCachedMemberDetails(member)
      .then((cachedRecord) => {
        setAllDoms(cachedRecord.allDoms);
        setHistory(cachedRecord.history);
        setDomBatch(cachedRecord.domBatch);
      })
      .catch(() => {
        setAllDoms([]);
        setHistory([member]);
      })
      .finally(() => {
        setIsLoadingHistory(false);
      });
  }, [member]);

  // Derive DOM details: DOM Number, Validity Date, and Status of the DOM
  const domHistoryList = useMemo(() => {
    if (!member) return [];

    // Primary: If member has membershipInfo JSON format, read directly from it!
    if (Array.isArray(member.membershipInfo) && member.membershipInfo.length > 0) {
      return member.membershipInfo.map((term, index) => {
        const matchingDom = term.domId ? allDoms.find((d) => d.id === term.domId) : null;
        const domNum = term.domNumber || matchingDom?.domNumber || 'DOM Record';
        const vf = term.validFrom || matchingDom?.validFrom || '';
        const vu = term.validUntil || matchingDom?.validUntil || '';
        const validityDate = vf && vu ? `${vf} to ${vu}` : (term.schoolYear ? `S.Y. ${term.schoolYear}` : 'No validity period');
        const status = term.status || (matchingDom ? getDomRecordStatusSummary(matchingDom).status : 'Active');
        const reason = matchingDom ? getDomRecordStatusSummary(matchingDom).reason : 'Recorded membership term';

        return {
          key: term.termId || `term-${term.domId}-${index}`,
          domNumber: domNum,
          validityDate,
          status,
          reason,
          isCurrent: term.domId === member.domId,
        };
      });
    }

    const seenDomKeys = new Set<string>();
    const items: {
      key: string;
      domNumber: string;
      validityDate: string;
      status: string;
      reason: string;
      isCurrent: boolean;
    }[] = [];

    // Ensure member's current DOM is included first if assigned
    if (member.domId) {
      const currentDom = allDoms.find((d) => d.id === member.domId);
      if (currentDom) {
        seenDomKeys.add(currentDom.id);
        const summary = getDomRecordStatusSummary(currentDom);
        items.push({
          key: currentDom.id,
          domNumber: currentDom.domNumber,
          validityDate: `${currentDom.validFrom} to ${currentDom.validUntil}`,
          status: summary.status,
          reason: summary.reason,
          isCurrent: true,
        });
      }
    }

    // Process all linked history records
    for (const record of history) {
      const domId = record.domId;
      const recDom = domId ? allDoms.find((d) => d.id === domId) : null;
      const domKey = recDom?.id || `unassigned-${record.id}`;

      if (seenDomKeys.has(domKey)) continue;
      seenDomKeys.add(domKey);

      if (recDom) {
        const summary = getDomRecordStatusSummary(recDom);
        items.push({
          key: domKey,
          domNumber: recDom.domNumber,
          validityDate: `${recDom.validFrom} to ${recDom.validUntil}`,
          status: summary.status,
          reason: summary.reason,
          isCurrent: member.domId === recDom.id,
        });
      } else {
        items.push({
          key: domKey,
          domNumber: 'Unassigned DOM',
          validityDate: 'No validity period',
          status: 'Expired',
          reason: 'No DOM batch attached',
          isCurrent: !member.domId,
        });
      }
    }

    return items;
  }, [member, history, allDoms]);

  if (!member) return null;

  const domSummary = getMemberDomValiditySummary(domBatch);
  const effectiveStatus = domSummary.status;
  const statusClass = `srcy-status-chip srcy-status-chip--${effectiveStatus.toLowerCase()}`;
  const calculatedAge = calculateAge(member.birthdate);

  return createPortal(
    <div className="modal-overlay" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div
        className="modal-dialog modal-dialog--wide srcy-details-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-details-title"
      >
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">SRCY Member Record</p>
            <h3 id="member-details-title">{member.fullName}</h3>
          </div>
          <button
            type="button"
            className="modal-dialog__close"
            onClick={onClose}
            aria-label="Close details"
          >
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>

        <div className="srcy-modal-tabs" role="tablist" aria-label="Member Record Views">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'profile'}
            className={`srcy-modal-tab ${activeTab === 'profile' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <span className="material-symbols-outlined" aria-hidden="true">badge</span>
            Member Profile
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'history'}
            className={`srcy-modal-tab ${activeTab === 'history' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <span className="material-symbols-outlined" aria-hidden="true">history</span>
            Membership History
            <span className="srcy-modal-tab__badge" title={`${domHistoryList.length} DOM record(s)`}>
              {domHistoryList.length || 1}
            </span>
          </button>
        </div>

        <div className="modal-dialog__body srcy-details-body">
          {isLoadingHistory ? (
            <UsisPageLoader variant="modal" message="Loading member record..." />
          ) : (
            <>
              <div className="srcy-details-meta-bar">
            <span className={statusClass} title={domSummary.reason}>{effectiveStatus}</span>
            <span className="srcy-details-meta-item">
              Council Role: <strong>{member.councilRole || 'Member'}</strong>
            </span>
            {member.learnerLrn ? (
              <span className="srcy-details-meta-item">
                LRN: <code>{member.learnerLrn}</code>
              </span>
            ) : null}
            {member.maabId ? (
              <span className="srcy-details-meta-item">
                MAAB ID: <strong>{member.maabId}</strong>
              </span>
            ) : null}
            {calculatedAge !== null ? (
              <span className="srcy-details-meta-item">
                Age: <strong>{calculatedAge} yrs old</strong>
              </span>
            ) : null}
            {domBatch ? (
              <span className="srcy-details-meta-item">
                DOM: <strong>{domBatch.domNumber}</strong>
              </span>
            ) : null}
          </div>

          {activeTab === 'profile' ? (
            <>
              {effectiveStatus === 'Inactive' && onRenew ? (
                <div className="srcy-details-renew-banner">
                  <div className="srcy-details-renew-banner__info">
                    <span className="material-symbols-outlined" aria-hidden="true">history_toggle_off</span>
                    <div>
                      <strong>Membership Expired / Inactive</strong>
                      <p>This member's previous DOM batch has expired. Select a new DOM batch to renew and register their next term.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="primary-button srcy-btn-renew"
                    onClick={() => onRenew(member)}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">autorenew</span>
                    Renew with New DOM
                  </button>
                </div>
              ) : null}

              <div className="srcy-details-section">
                <h4 className="srcy-details-section__title">Academic &amp; Council Details</h4>
                <div className="srcy-details-grid">
                  <div className="srcy-details-item">
                    <span className="srcy-details-label">Learner LRN</span>
                    <span className="srcy-details-value">{member.learnerLrn || '-'}</span>
                  </div>
                  <div className="srcy-details-item">
                    <span className="srcy-details-label">Grade Level</span>
                    <span className="srcy-details-value">{member.gradeLevel || '-'}</span>
                  </div>
                  <div className="srcy-details-item">
                    <span className="srcy-details-label">Section</span>
                    <span className="srcy-details-value">{member.section || '-'}</span>
                  </div>
                  <div className="srcy-details-item">
                    <span className="srcy-details-label">Council Role</span>
                    <span className="srcy-details-value">{member.councilRole || 'Member'}</span>
                  </div>
                  <div className="srcy-details-item">
                    <span className="srcy-details-label">MAAB ID No.</span>
                    <span className="srcy-details-value">{member.maabId || 'Not assigned'}</span>
                  </div>
                  <div className="srcy-details-item">
                    <span className="srcy-details-label">Date Joined</span>
                    <span className="srcy-details-value">{formatDate(member.joinedAt)}</span>
                  </div>
                  <div className="srcy-details-item">
                    <span className="srcy-details-label">Membership Status</span>
                    <span className="srcy-details-value">
                      <strong>{effectiveStatus}</strong>
                      <span style={{ display: 'block', color: 'var(--deped-muted)', fontSize: 12 }}>
                        {domSummary.reason}
                      </span>
                    </span>
                  </div>
                  <div className="srcy-details-item srcy-details-item--wide">
                    <span className="srcy-details-label">Declaration of Member (DOM) Batch</span>
                    <span className="srcy-details-value">
                      {domBatch ? `${domBatch.domNumber} - ${domBatch.title}` : 'Unassigned'}
                    </span>
                  </div>
                  <div className="srcy-details-item">
                    <span className="srcy-details-label">DOM 1-Year Validity</span>
                    <span className="srcy-details-value">
                      {domBatch ? `${domBatch.validFrom} to ${domBatch.validUntil}` : '-'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="srcy-details-section">
                <h4 className="srcy-details-section__title">Personal &amp; Contact Information</h4>
                <div className="srcy-details-grid">
                  <div className="srcy-details-item">
                    <span className="srcy-details-label">Birthdate</span>
                    <span className="srcy-details-value">{member.birthdate ? formatDate(member.birthdate) : '-'}</span>
                  </div>
                  <div className="srcy-details-item">
                    <span className="srcy-details-label">Calculated Age</span>
                    <span className="srcy-details-value">{calculatedAge !== null ? `${calculatedAge} yrs old` : '-'}</span>
                  </div>
                  <div className="srcy-details-item">
                    <span className="srcy-details-label">Contact Number</span>
                    <span className="srcy-details-value">{member.contactNo || '-'}</span>
                  </div>
                  <div className="srcy-details-item srcy-details-item--wide">
                    <span className="srcy-details-label">Email Address</span>
                    <span className="srcy-details-value">{member.email || '-'}</span>
                  </div>
                  <div className="srcy-details-item">
                    <span className="srcy-details-label">Record Created</span>
                    <span className="srcy-details-value">{formatDate(member.createdAt)}</span>
                  </div>
                  <div className="srcy-details-item srcy-details-item--full">
                    <span className="srcy-details-label">Complete Address</span>
                    <span className="srcy-details-value">{member.address || '-'}</span>
                  </div>
                  <div className="srcy-details-item srcy-details-item--full">
                    <span className="srcy-details-label">Emergency Contact (ICE)</span>
                    <span className="srcy-details-value">{member.emergencyContact || '-'}</span>
                  </div>
                </div>
              </div>

              {member.notes ? (
                <div className="srcy-details-section">
                  <h4 className="srcy-details-section__title">Registration Notes</h4>
                  <div className="srcy-details-notes">
                    <p>{member.notes}</p>
                  </div>
                </div>
              ) : null}

              <div className="srcy-details-section">
                <h4 className="srcy-details-section__title">DOM &amp; Membership History</h4>
                <div className="srcy-history-snapshot">
                  <div className="srcy-history-snapshot__info">
                    <span className="srcy-history-snapshot__title">
                      {domHistoryList.length} DOM {domHistoryList.length === 1 ? 'Record' : 'Records'} on File
                    </span>
                    <span className="srcy-history-snapshot__desc">
                      {domBatch
                        ? `Current: ${domBatch.domNumber} • Validity: ${domBatch.validFrom} to ${domBatch.validUntil}`
                        : 'No DOM batch currently assigned.'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="srcy-history-snapshot__btn"
                    onClick={() => setActiveTab('history')}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }} aria-hidden="true">
                      history
                    </span>
                    View DOM History ({domHistoryList.length})
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="srcy-history-view">
              {isLoadingHistory ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--deped-muted)', fontSize: 13 }}>
                  Loading DOM details...
                </div>
              ) : domHistoryList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--deped-muted)', fontSize: 13 }}>
                  No DOM records found for this member.
                </div>
              ) : (
                <div className="srcy-history-table-wrap">
                  <table className="usis-table srcy-history-dom-table">
                    <thead>
                      <tr>
                        <th>DOM Number</th>
                        <th>Validity Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {domHistoryList.map((item) => (
                        <tr key={item.key} className={item.isCurrent ? 'srcy-history-row--current' : ''}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <strong className="srcy-history-dom-number">{item.domNumber}</strong>
                              {item.isCurrent ? (
                                <span className="srcy-history-pill--current">
                                  <span
                                    className="material-symbols-outlined"
                                    style={{ fontSize: 13 }}
                                    aria-hidden="true"
                                  >
                                    check_circle
                                  </span>
                                  Current
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td>
                            <span className="srcy-history-validity-text">{item.validityDate}</span>
                          </td>
                          <td>
                            <span
                              className={`srcy-status-chip srcy-status-chip--${item.status.toLowerCase()}`}
                              title={item.reason}
                            >
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
            </>
          )}
        </div>

        <div className="modal-dialog__actions">
          {isLoadingHistory ? (
            <button type="button" className="secondary-button" onClick={onClose}>
              Close
            </button>
          ) : (
            <>
              {effectiveStatus === 'Inactive' && onRenew ? (
                <button
                  type="button"
                  className="primary-button srcy-btn-renew"
                  onClick={() => onRenew(member)}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">autorenew</span>
                  Renew Member
                </button>
              ) : null}
              <button
                type="button"
                className="secondary-button srcy-btn-danger"
                onClick={() => onDelete(member)}
              >
                <span className="material-symbols-outlined" aria-hidden="true">delete</span>
                Delete
              </button>
              {onGenerateMis ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => onGenerateMis(member)}
                  title="Generate Member Information Sheet (MIS)"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">assignment_ind</span>
                  Generate MIS
                </button>
              ) : null}
              <button
                type="button"
                className="secondary-button"
                onClick={() => onEdit(member)}
              >
                <span className="material-symbols-outlined" aria-hidden="true">edit</span>
                Edit Member
              </button>
              <button type="button" className="primary-button" onClick={onClose}>
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
