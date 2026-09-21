import React, { useEffect, useState } from 'react';
import {
  EnrollmentRecord,
  EnrollmentStatus,
  LEARNER_STATUS_OPTIONS,
  normalizeLearnerStatus,
  resolveEffectiveLearnerStatus,
  Student,
} from '../../types';
import {
  UsisSearchableSelect,
  UsisSearchableSelectOption,
} from '../../../common/components/ui/UsisSearchableSelect';

interface LearnerStatusModalProps {
  student: Student | null;
  activeSchoolYearLabel: string;
  sectionName?: string;
  isOpen: boolean;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (learnerId: string, updates: Partial<Student>) => Promise<{ error?: string }>;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

const COMMON_DROPOUT_REASONS = [
  'Family / Personal Concern',
  'Employment / Financial Necessity',
  'Relocation / Transferred Residence',
  'Illness / Health Issue',
  'Accessibility / Distance to School',
  'Lack of Personal Interest',
  'Early Marriage / Pregnancy',
  'Other Reason',
];

const DROPOUT_REASON_OPTIONS: UsisSearchableSelectOption[] = COMMON_DROPOUT_REASONS.map((reason) => ({
  label: reason,
  value: reason,
}));

const getTodayDateString = () => new Date().toISOString().split('T')[0];

export const LearnerStatusModal: React.FC<LearnerStatusModalProps> = ({
  student,
  activeSchoolYearLabel,
  sectionName,
  isOpen,
  loading = false,
  onClose,
  onSubmit,
  onSuccess,
  onError,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<EnrollmentStatus>(EnrollmentStatus.ENROLLED);
  const [effectiveDate, setEffectiveDate] = useState<string>(getTodayDateString());
  const [transferDestination, setTransferDestination] = useState<string>('');
  const [dropoutReason, setDropoutReason] = useState<string>(COMMON_DROPOUT_REASONS[0]);
  const [remarks, setRemarks] = useState<string>('');
  const [disableLoginCredentials, setDisableLoginCredentials] = useState<boolean>(false);
  const [initialLoginDisabled, setInitialLoginDisabled] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const currentStatus = student
    ? resolveEffectiveLearnerStatus(student, activeSchoolYearLabel)
    : EnrollmentStatus.ENROLLED;

  useEffect(() => {
    if (student && isOpen) {
      const initialStatus = resolveEffectiveLearnerStatus(student, activeSchoolYearLabel);
      setSelectedStatus(initialStatus);
      setEffectiveDate(getTodayDateString());
      setTransferDestination('');
      setDropoutReason(COMMON_DROPOUT_REASONS[0]);
      setRemarks('');
      setIsSubmitting(false);

      const currentlyDisabled =
        (student.loginStatus || '').trim().toLowerCase() === 'inactive' ||
        (student.loginStatus || '').trim().toLowerCase() === 'disabled';
      setInitialLoginDisabled(currentlyDisabled);
      setDisableLoginCredentials(
        initialStatus === EnrollmentStatus.TRANSFER_OUT ||
        initialStatus === EnrollmentStatus.DROP_OUT ||
        initialStatus === EnrollmentStatus.WITHDRAWN
          ? true
          : currentlyDisabled
      );
    }
  }, [student, isOpen, activeSchoolYearLabel]);

  if (!isOpen || !student) return null;

  const isChangingFromTransferOrDrop =
    currentStatus === EnrollmentStatus.TRANSFER_OUT || currentStatus === EnrollmentStatus.DROP_OUT;
  const isFormUnchanged = selectedStatus === currentStatus && disableLoginCredentials === initialLoginDisabled;

  const handleSelectStatus = (statusOption: EnrollmentStatus) => {
    setSelectedStatus(statusOption);
    if (
      statusOption === EnrollmentStatus.TRANSFER_OUT ||
      statusOption === EnrollmentStatus.DROP_OUT ||
      statusOption === EnrollmentStatus.WITHDRAWN
    ) {
      setDisableLoginCredentials(true);
    } else if (statusOption === EnrollmentStatus.ENROLLED) {
      setDisableLoginCredentials(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormUnchanged) {
      onClose();
      return;
    }

    setIsSubmitting(true);
    try {
      // Build remarks/detail based on target status
      let statusDetails = '';
      if (selectedStatus === EnrollmentStatus.TRANSFER_OUT) {
        statusDetails = transferDestination.trim()
          ? `Transferred to: ${transferDestination.trim()}`
          : 'Transferred out';
      } else if (selectedStatus === EnrollmentStatus.DROP_OUT) {
        statusDetails = `Reason: ${dropoutReason}${remarks.trim() ? ` - ${remarks.trim()}` : ''}`;
      } else if (isChangingFromTransferOrDrop && selectedStatus === EnrollmentStatus.ENROLLED) {
        statusDetails = remarks.trim()
          ? `Re-enrolled: ${remarks.trim()}`
          : `Re-enrolled from ${currentStatus}`;
      } else if (remarks.trim()) {
        statusDetails = remarks.trim();
      }

      // Update enrollment history
      const existingHistory: EnrollmentRecord[] = Array.isArray(student.enrollments) ? [...student.enrollments] : [];
      const currentSyNormalized = activeSchoolYearLabel.trim().toLowerCase();

      let matchedHistory = false;
      const nextHistory = existingHistory.map((entry) => {
        const entrySyNormalized = String(entry.schoolYear || '').trim().toLowerCase();
        if (entrySyNormalized === currentSyNormalized || (!matchedHistory && existingHistory.length === 1)) {
          matchedHistory = true;
          return {
            ...entry,
            status: selectedStatus,
            submissionPayload: {
              ...(entry.submissionPayload || {}),
              statusChangeDate: effectiveDate,
              statusChangePrevious: currentStatus,
              statusChangeNote: statusDetails,
              statusChangedAt: new Date().toISOString(),
            },
          };
        }
        return entry;
      });

      if (!matchedHistory) {
        nextHistory.push({
          id: crypto.randomUUID(),
          schoolYear: activeSchoolYearLabel,
          gradeLevel: student.enrollments?.[0]?.gradeLevel || ('Grade 7' as any),
          section: sectionName || student.enrollments?.[0]?.section || 'Unassigned',
          enrollmentDate: effectiveDate,
          status: selectedStatus,
          submissionPayload: {
            statusChangeDate: effectiveDate,
            statusChangePrevious: currentStatus,
            statusChangeNote: statusDetails,
            statusChangedAt: new Date().toISOString(),
          },
        });
      }

      const result = await onSubmit(student.id, {
        status: selectedStatus,
        enrollments: nextHistory,
        loginStatus: disableLoginCredentials ? 'Inactive' : 'Active',
      });

      if (result?.error) {
        onError?.(result.error);
        return;
      }

      const successMsg = `Status for ${student.lastName}, ${student.firstName} updated to ${selectedStatus}.`;
      onSuccess?.(successMsg);
      onClose();
    } catch (err: any) {
      onError?.(err?.message || 'Failed to update learner status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />

      <article
        className="modal-dialog modal-dialog--status-change"
        role="dialog"
        aria-modal="true"
        aria-labelledby="learner-status-dialog-title"
      >
        <header className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Learner Status Management</p>
            <h3 id="learner-status-dialog-title">Change Learner Status</h3>
            <div className="modal-record__meta">
              <span>{student.lastName}, {student.firstName} {student.middleName || ''}</span>
              <span className="mono">LRN: {student.lrn}</span>
              {sectionName ? <span>Section: {sectionName}</span> : null}
            </div>
          </div>
          <button
            type="button"
            className="modal-dialog__close"
            onClick={onClose}
            aria-label="Close status management modal"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="modal-dialog__body custom-scrollbar">
            {/* Current Status Banner */}
            <div className="status-change-banner">
              <div className="status-change-banner__current">
                <span className="status-change-banner__label">Current Status</span>
                <span className={`status-badge status-badge--${currentStatus.toLowerCase().replace(/\s+/g, '-')}`}>
                  {currentStatus}
                </span>
              </div>
              {isChangingFromTransferOrDrop && (
                <p className="status-change-banner__hint">
                  This learner is currently recorded as <strong>{currentStatus}</strong>. Selecting <strong>Enrolled</strong> will restore the student to active enrollment.
                </p>
              )}
            </div>

            {/* Target Status Selection */}
            <section className="status-change-section">
              <label className="status-change-section__title" id="target-status-label">
                Select New Status:
              </label>
              <div className="status-change-options" role="radiogroup" aria-labelledby="target-status-label">
                {LEARNER_STATUS_OPTIONS.map((statusOption) => {
                  const isSelected = selectedStatus === statusOption;
                  const tone = statusOption.toLowerCase().replace(/\s+/g, '-');
                  return (
                    <label
                      key={statusOption}
                      className={`status-change-option status-change-option--${tone} ${isSelected ? 'is-selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="learnerTargetStatus"
                        value={statusOption}
                        checked={isSelected}
                        onChange={() => handleSelectStatus(statusOption)}
                        className="sr-only"
                      />
                      <div className="status-change-option__check">
                        <span className="material-symbols-outlined">
                          {isSelected ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                      </div>
                      <div className="status-change-option__content">
                        <strong>{statusOption}</strong>
                        <span>
                          {statusOption === EnrollmentStatus.ENROLLED && 'Active attending learner in registry'}
                          {statusOption === EnrollmentStatus.TRANSFER_OUT && 'Transferred out to another school / division'}
                          {statusOption === EnrollmentStatus.DROP_OUT && 'Discontinued schooling / dropped out of school'}
                          {statusOption === EnrollmentStatus.WITHDRAWN && 'Formally withdrawn from school enrollment'}
                          {statusOption === EnrollmentStatus.GRADUATED && 'Completed academic program or grade level'}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </section>

            {/* Contextual fields for Transfer Out */}
            {selectedStatus === EnrollmentStatus.TRANSFER_OUT && (
              <div className="status-change-detail-box">
                <label className="floating-field">
                  <div className="floating-field__control">
                    <input
                      type="text"
                      placeholder=" "
                      value={transferDestination}
                      onChange={(e) => setTransferDestination(e.target.value)}
                    />
                    <span>Receiving School / Division / Destination</span>
                  </div>
                </label>
                <p className="status-change-helper">
                  Specify the name of the destination school or division where the learner is transferring.
                </p>
              </div>
            )}

            {/* Contextual fields for Drop Out */}
            {selectedStatus === EnrollmentStatus.DROP_OUT && (
              <div className="status-change-detail-box">
                <UsisSearchableSelect
                  ariaLabel="Primary Reason for Dropping Out"
                  label="Primary Reason for Dropping Out"
                  floatingLabel
                  allowTyping={false}
                  forcePortalMenu
                  options={DROPOUT_REASON_OPTIONS}
                  value={dropoutReason}
                  onChange={(val) => setDropoutReason(val || COMMON_DROPOUT_REASONS[0])}
                  placeholder="Select reason"
                />

                <label className="floating-field" style={{ marginTop: 12 }}>
                  <div className="floating-field__control">
                    <input
                      type="text"
                      placeholder=" "
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                    />
                    <span>Additional Remarks / Intervention Notes (Optional)</span>
                  </div>
                </label>
              </div>
            )}

            {/* Contextual fields when changing from Transfer Out / Drop Out back to Enrolled */}
            {isChangingFromTransferOrDrop && selectedStatus === EnrollmentStatus.ENROLLED && (
              <div className="status-change-detail-box status-change-detail-box--reinstatement">
                <label className="floating-field">
                  <div className="floating-field__control">
                    <input
                      type="text"
                      placeholder=" "
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                    />
                    <span>Re-enrollment Remarks / Justification</span>
                  </div>
                </label>
                <p className="status-change-helper">
                  Note any resumption details, remedial actions, or administrative notes for re-admitting the learner.
                </p>
              </div>
            )}

            {/* General Effective Date & Optional Remarks */}
            <div className="status-change-meta-fields">
              <label className="floating-field">
                <div className="floating-field__control">
                  <input
                    type="date"
                    placeholder=" "
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    required
                  />
                  <span>Effective Date</span>
                </div>
              </label>

              {selectedStatus !== EnrollmentStatus.DROP_OUT &&
                !(isChangingFromTransferOrDrop && selectedStatus === EnrollmentStatus.ENROLLED) && (
                  <label className="floating-field">
                    <div className="floating-field__control">
                      <input
                        type="text"
                        placeholder=" "
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                      />
                      <span>General Remarks / Reference (Optional)</span>
                    </div>
                  </label>
                )}
            </div>

            {/* Contextual USIS Credentials Option */}
            <div className="status-change-credential-option">
              <label className="status-change-checkbox-label">
                <input
                  type="checkbox"
                  checked={disableLoginCredentials}
                  onChange={(e) => setDisableLoginCredentials(e.target.checked)}
                />
                <span>
                  {selectedStatus === EnrollmentStatus.ENROLLED
                    ? 'Keep USIS login credentials disabled for this learner'
                    : 'Disable USIS login credentials for this learner'}
                </span>
              </label>
              <p className="status-change-helper">
                {disableLoginCredentials
                  ? 'The learner will be prevented from signing into the USIS Learner Portal and USIS Election System.'
                  : 'The learner will have active credentials to access the USIS Learner Portal.'}
              </p>
            </div>
          </div>

          <footer className="modal-dialog__actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              disabled={isSubmitting || loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="modal-dialog__blue"
              disabled={isSubmitting || loading || isFormUnchanged}
            >
              {isSubmitting ? 'Updating...' : `Update Status to ${selectedStatus}`}
            </button>
          </footer>
        </form>
      </article>
    </div>
  );
};

export default LearnerStatusModal;
