import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  UsisSearchableSelect,
} from '../../../../common/components/ui/UsisSearchableSelect';
import { MaabIdInput } from '../custom-components/MaabIdInput';
import {
  computeMemberStatusFromDom,
  getDomRecordStatusSummary,
  isDomExpired,
  loadSrcyDomRecords,
  type SrcyDomRecord,
} from '../services/srcyDomService';
import {
  renewSrcyMember,
  type SrcyMemberRecord,
} from '../services/srcyMembershipService';

type MemberRenewModalProps = {
  member: SrcyMemberRecord | null;
  onClose: () => void;
  onRenewed: (newMember: SrcyMemberRecord) => void;
};

export function MemberRenewModal({
  member,
  onClose,
  onRenewed,
}: MemberRenewModalProps) {
  const [domBatches, setDomBatches] = useState<SrcyDomRecord[]>([]);
  const [selectedDomId, setSelectedDomId] = useState<string>('');
  const [gradeLevel, setGradeLevel] = useState<string>('');
  const [section, setSection] = useState<string>('');
  const [councilRole, setCouncilRole] = useState<string>('Member');
  const [maabId, setMaabId] = useState<string>('');
  const [joinedAt, setJoinedAt] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    void loadSrcyDomRecords()
      .then((records) => {
        setDomBatches(records);
        // Find an unexpired DOM batch to pre-select
        const activeDom = records.find((d) => !isDomExpired(d));
        if (activeDom) {
          setSelectedDomId(activeDom.id);
          if (activeDom.validFrom) {
            setJoinedAt(activeDom.validFrom);
          }
        }
      })
      .catch(() => setDomBatches([]));
  }, []);

  useEffect(() => {
    if (member) {
      setGradeLevel(member.gradeLevel || '');
      setSection(member.section || '');
      setCouncilRole(member.councilRole || 'Member');
      setMaabId(member.maabId || '');
      setJoinedAt(new Date().toISOString().slice(0, 10));
      setNotes('');
      setErrorMsg('');
    }
  }, [member]);

  const domOptions = useMemo(() => {
    return domBatches
      .filter((d) => !isDomExpired(d))
      .map((d) => {
        const sy = d.schoolYear ? (d.schoolYear.startsWith('S.Y.') ? d.schoolYear : `S.Y. ${d.schoolYear}`) : '';
        return {
          label: sy ? `${d.domNumber} (${sy})` : d.domNumber,
          value: d.id,
        };
      });
  }, [domBatches]);

  const selectedDom = useMemo(() => {
    return domBatches.find((d) => d.id === selectedDomId) || null;
  }, [domBatches, selectedDomId]);

  const prevDom = useMemo(() => {
    if (!member?.domId) return null;
    return domBatches.find((d) => d.id === member.domId) || null;
  }, [member, domBatches]);

  if (!member) return null;

  const derivedStatus = computeMemberStatusFromDom(selectedDom);
  const prevDomSummary = getDomRecordStatusSummary(prevDom);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDomId) {
      setErrorMsg('Please select a new Declaration of Members (DOM) batch.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const renewed = await renewSrcyMember(member, {
        domId: selectedDomId,
        gradeLevel,
        section,
        councilRole,
        maabId,
        joinedAt: joinedAt || new Date().toISOString().slice(0, 10),
        notes: notes.trim() ? notes : undefined,
      });

      onRenewed(renewed);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to renew member under new DOM.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="modal-overlay" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div
        className="modal-dialog modal-dialog--wide srcy-edit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-renew-title"
      >
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">SRCY Membership Renewal</p>
            <h3 id="member-renew-title">Renew Member: {member.fullName}</h3>
          </div>
          <button
            type="button"
            className="modal-dialog__close"
            onClick={onClose}
            aria-label="Close renewal modal"
          >
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="srcy-edit-modal__form">
          <div className="modal-dialog__body custom-scrollbar srcy-edit-modal__body">
            {errorMsg ? (
              <div className="notice-box notice-box--danger" style={{ marginBottom: '14px' }}>
                <strong>Renewal Error</strong>
                <span>{errorMsg}</span>
              </div>
            ) : null}

            {/* Previous Term Summary */}
            <div className="srcy-details-section" style={{ marginBottom: '16px' }}>
              <h4 className="srcy-details-section__title">Previous Membership Term</h4>
              <div className="srcy-details-grid">
                <div className="srcy-details-item">
                  <span className="srcy-details-label">Learner LRN</span>
                  <span className="srcy-details-value"><code>{member.learnerLrn}</code></span>
                </div>
                <div className="srcy-details-item">
                  <span className="srcy-details-label">Previous Role</span>
                  <span className="srcy-details-value">{member.councilRole || 'Member'}</span>
                </div>
                <div className="srcy-details-item">
                  <span className="srcy-details-label">Previous Batch</span>
                  <span className="srcy-details-value">
                    {prevDom ? prevDom.domNumber : 'Unassigned'}
                  </span>
                </div>
                <div className="srcy-details-item srcy-details-item--wide">
                  <span className="srcy-details-label">Previous Validity</span>
                  <span className="srcy-details-value">
                    {prevDom ? `${prevDom.validFrom} to ${prevDom.validUntil}` : '-'}
                  </span>
                </div>
                <div className="srcy-details-item">
                  <span className="srcy-details-label">Batch Status</span>
                  <span className="srcy-details-value">
                    <span className={`srcy-status-chip srcy-status-chip--${prevDomSummary.status.toLowerCase()}`}>
                      {prevDomSummary.status}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Renewal Details Form */}
            <div className="srcy-details-section">
              <h4 className="srcy-details-section__title">New Term Registration Details</h4>
              <div className="srcy-membership-form">
                <UsisSearchableSelect
                  ariaLabel="Select New Declaration of Members (DOM) Batch"
                  label="Select New Declaration of Members (DOM) Batch"
                  floatingLabel
                  forcePortalMenu
                  required
                  value={selectedDomId}
                  options={domOptions}
                  onChange={(selectedId) => {
                    setSelectedDomId(selectedId);
                    const matched = domBatches.find((d) => d.id === selectedId);
                    if (matched?.validFrom) {
                      setJoinedAt(matched.validFrom);
                    }
                  }}
                />

                {selectedDom ? (
                  <div className="srcy-details-item srcy-details-item--wide">
                    <span className="srcy-details-label">New DOM 1-Year Validity</span>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 2 }}>
                      <span className="srcy-details-value" style={{ fontWeight: 600 }}>
                        {selectedDom.validFrom} to {selectedDom.validUntil}
                      </span>
                      <span className={`srcy-status-chip srcy-status-chip--${derivedStatus.toLowerCase()}`}>
                        {derivedStatus}
                      </span>
                    </div>
                  </div>
                ) : null}

                <label className="floating-field">
                  <div className="floating-field__control">
                    <input
                      value={councilRole}
                      onChange={(e) => setCouncilRole(e.target.value)}
                      placeholder=" "
                    />
                    <span>Council Role for New Term</span>
                  </div>
                </label>

                <label className="floating-field">
                  <div className="floating-field__control">
                    <input
                      value={gradeLevel}
                      onChange={(e) => setGradeLevel(e.target.value)}
                      placeholder=" "
                    />
                    <span>Grade Level</span>
                  </div>
                </label>

                <label className="floating-field">
                  <div className="floating-field__control">
                    <input
                      value={section}
                      onChange={(e) => setSection(e.target.value)}
                      placeholder=" "
                    />
                    <span>Section</span>
                  </div>
                </label>

                <MaabIdInput
                  value={maabId}
                  onChange={(val) => setMaabId(val)}
                />

                <label className="floating-field">
                  <div className="floating-field__control">
                    <input
                      type="date"
                      value={joinedAt}
                      onChange={(e) => setJoinedAt(e.target.value)}
                      placeholder=" "
                    />
                    <span>Date of Renewal / Registration</span>
                  </div>
                </label>

                <label className="floating-field floating-field--full">
                  <div className="floating-field__control">
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder=" "
                    />
                    <span>Renewal Notes (Optional)</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="modal-dialog__actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={isSubmitting || !selectedDomId}
            >
              <span className="material-symbols-outlined" aria-hidden="true">autorenew</span>
              {isSubmitting ? 'Renewing...' : 'Confirm Renewal & Attach New DOM'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
