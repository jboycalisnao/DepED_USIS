import { useState, useEffect, useMemo, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import type {
  SrcyTrainingDraft,
  SrcyTrainingRecord,
  SrcyTrainingStatus,
} from '../services/srcyTrainingService';
import {
  UsisSearchableSelect,
  type UsisSearchableSelectOption,
} from '../../../../common/components/ui/UsisSearchableSelect';

type TrainingFormModalProps = {
  open: boolean;
  training: SrcyTrainingRecord | null;
  existingTrainings?: SrcyTrainingRecord[];
  activeSchoolYear?: string;
  onClose: () => void;
  onSaved: (saved: SrcyTrainingRecord) => void;
  onSaveError: (error: string) => void;
  saveAction: (draft: SrcyTrainingDraft, id?: string) => Promise<SrcyTrainingRecord>;
};

const statusOptions: SrcyTrainingStatus[] = ['Completed', 'Scheduled', 'In Progress', 'Archived'];

const statusSelectOptions: UsisSearchableSelectOption[] = statusOptions.map((st) => ({
  label: st,
  value: st,
}));

const VALIDITY_PRESETS = [
  '1 Year (Active Term)',
  '1 Year (Term Covered)',
  'Permanent / Lifetime',
  '2 Years',
  '6 Months',
];

export function TrainingFormModal({
  open,
  training,
  existingTrainings = [],
  activeSchoolYear = '',
  onClose,
  onSaved,
  onSaveError,
  saveAction,
}: TrainingFormModalProps) {
  const [draft, setDraft] = useState<Partial<SrcyTrainingDraft>>({
    title: '',
    description: '',
    trainingDate: new Date().toISOString().slice(0, 10),
    validityPeriod: '1 Year (Active Term)',
    status: 'Completed',
    venue: '',
    facilitator: '',
    schoolYear: '',
  });
  const [hasValidityPeriod, setHasValidityPeriod] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const schoolYearOptions = useMemo<UsisSearchableSelectOption[]>(() => {
    const currentYear = new Date().getFullYear();
    const defaultYears = [
      activeSchoolYear,
      `${currentYear + 1}-${currentYear + 2}`,
      `${currentYear}-${currentYear + 1}`,
      `${currentYear - 1}-${currentYear}`,
      `${currentYear - 2}-${currentYear - 1}`,
    ].filter(Boolean);
    const set = new Set(defaultYears);
    existingTrainings.forEach((t) => {
      if (t.schoolYear?.trim()) set.add(t.schoolYear.trim());
    });
    return Array.from(set).map((sy) => ({ label: sy, value: sy }));
  }, [existingTrainings, activeSchoolYear]);

  useEffect(() => {
    if (training) {
      const isPermanent =
        !training.validityPeriod ||
        training.validityPeriod.toLowerCase() === 'no expiration' ||
        training.validityPeriod.toLowerCase().includes('permanent') ||
        training.validityPeriod.toLowerCase().includes('lifetime');

      setHasValidityPeriod(!isPermanent);
      setDraft({
        title: training.title,
        description: training.description,
        trainingDate: training.trainingDate,
        validityPeriod: training.validityPeriod || (isPermanent ? 'No Expiration' : '1 Year (Active Term)'),
        status: training.status,
        venue: training.venue,
        facilitator: training.facilitator,
        schoolYear: training.schoolYear,
      });
    } else if (open) {
      const today = new Date().toISOString().slice(0, 10);
      const currentYear = new Date().getFullYear();
      const fallbackSy = `${currentYear}-${currentYear + 1}`;
      const effectiveSy = activeSchoolYear?.trim() || fallbackSy;

      setHasValidityPeriod(true);
      setDraft({
        title: '',
        description: '',
        trainingDate: today,
        validityPeriod: '1 Year (Active Term)',
        status: 'Completed',
        venue: 'Leon NHS School Campus',
        facilitator: 'SRCY Council Adviser / Certified Instructor',
        schoolYear: effectiveSy,
      });
    }
  }, [training, open, activeSchoolYear]);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.title?.trim()) {
      onSaveError('Training course title is required.');
      return;
    }
    if (!draft.trainingDate) {
      onSaveError('Training conducted date is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const resolvedValidity = hasValidityPeriod
        ? (draft.validityPeriod?.trim() || '1 Year (Active Term)')
        : 'No Expiration';

      const completeDraft: SrcyTrainingDraft = {
        title: draft.title.trim(),
        description: draft.description?.trim() || '',
        trainingDate: draft.trainingDate,
        validityPeriod: resolvedValidity,
        status: (draft.status as SrcyTrainingStatus) || 'Completed',
        venue: draft.venue?.trim() || '',
        facilitator: draft.facilitator?.trim() || '',
        schoolYear: draft.schoolYear?.trim() || '',
        schoolId: '',
        createdBy: '',
      };

      const result = await saveAction(completeDraft, training?.id);
      onSaved(result);
      onClose();
    } catch (err: any) {
      onSaveError(err?.message || 'Failed to save training record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="modal-overlay" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div
        className="modal-dialog srcy-training-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="training-form-title"
      >
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">SRCY Council Trainings</p>
            <h3 id="training-form-title">
              {training ? 'Edit Training Record' : 'Record Council Training'}
            </h3>
          </div>
          <button
            type="button"
            className="modal-dialog__close"
            onClick={onClose}
            aria-label="Close dialog"
            disabled={isSubmitting}
          >
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-dialog__body srcy-training-form-body">
            <div className="srcy-membership-form">
              {/* Training Title */}
              <label className="floating-field srcy-membership-form__full">
                <div className="floating-field__control">
                  <input
                    value={draft.title || ''}
                    onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder=" "
                    required
                    autoFocus
                  />
                  <span>Training Title / Course Name *</span>
                </div>
              </label>

              {/* Training Date */}
              <label className="floating-field">
                <div className="floating-field__control">
                  <input
                    type="date"
                    value={draft.trainingDate || ''}
                    onChange={(e) => setDraft((prev) => ({ ...prev, trainingDate: e.target.value }))}
                    placeholder=" "
                    required
                  />
                  <span>Conducted Date *</span>
                </div>
              </label>

              {/* School Year */}
              <UsisSearchableSelect
                id="training-school-year"
                label="School Year"
                floatingLabel
                options={schoolYearOptions}
                value={draft.schoolYear || ''}
                onChange={(val) => setDraft((prev) => ({ ...prev, schoolYear: val }))}
              />

              {/* Validity Period Configuration & Field */}
              <div className="srcy-membership-form__full srcy-validity-config-box">
                <div className="srcy-validity-config-header">
                  <label className="srcy-validity-toggle-label">
                    <input
                      type="checkbox"
                      className="srcy-validity-toggle-input"
                      checked={hasValidityPeriod}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setHasValidityPeriod(checked);
                        if (!checked) {
                          setDraft((prev) => ({ ...prev, validityPeriod: 'No Expiration' }));
                        } else if (!draft.validityPeriod || draft.validityPeriod === 'No Expiration') {
                          setDraft((prev) => ({ ...prev, validityPeriod: '1 Year (Active Term)' }));
                        }
                      }}
                    />
                    <span>This training has a Validity Period / Expiration</span>
                  </label>

                  <span
                    className={`srcy-validity-state-badge ${
                      hasValidityPeriod ? 'srcy-validity-state-badge--active' : ''
                    }`}
                  >
                    {hasValidityPeriod ? 'Certification Expires' : 'Lifetime / Permanent'}
                  </span>
                </div>

                {hasValidityPeriod ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <label className="floating-field">
                      <div className="floating-field__control">
                        <input
                          id="training-validity-input"
                          value={draft.validityPeriod === 'No Expiration' ? '' : (draft.validityPeriod || '')}
                          onChange={(e) => setDraft((prev) => ({ ...prev, validityPeriod: e.target.value }))}
                          placeholder=" "
                          required={hasValidityPeriod}
                        />
                        <span>Edit Validity Period / Coverage *</span>
                      </div>
                      <small>
                        Edit the exact validity duration or date range (e.g. &ldquo;1 Year (Active Term)&rdquo;, &ldquo;2 Years&rdquo;, or &ldquo;2026-09-12 to 2027-09-11&rdquo;). This directly reflects in the member&apos;s MIS.
                      </small>
                    </label>

                    <div className="srcy-training-presets">
                      <span style={{ fontSize: 11, color: 'var(--deped-muted)', fontWeight: 700 }}>Quick Presets:</span>
                      {VALIDITY_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          className={`srcy-training-preset-btn ${
                            draft.validityPeriod === preset ? 'srcy-training-preset-btn--active' : ''
                          }`}
                          onClick={() => setDraft((prev) => ({ ...prev, validityPeriod: preset }))}
                        >
                          {preset}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="srcy-training-preset-btn"
                        title="Auto-calculate 1 year from training date"
                        onClick={() => {
                          if (draft.trainingDate) {
                            const d = new Date(draft.trainingDate);
                            if (!isNaN(d.getTime())) {
                              const end = new Date(d);
                              end.setFullYear(end.getFullYear() + 1);
                              end.setDate(end.getDate() - 1);
                              const endIso = end.toISOString().slice(0, 10);
                              setDraft((prev) => ({ ...prev, validityPeriod: `${draft.trainingDate} to ${endIso}` }));
                            }
                          }
                        }}
                      >
                        +1 Year from Date
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="srcy-validity-permanent-hint">
                    <span className="material-symbols-outlined">
                      verified
                    </span>
                    <span>
                      Training is marked as <strong>No Expiration (Permanent)</strong>. The Member Information Sheet (MIS) will display <em>No Expiration</em>.
                    </span>
                  </div>
                )}
              </div>


              {/* Status */}
              <UsisSearchableSelect
                id="training-status-select"
                label="Status *"
                floatingLabel
                options={statusSelectOptions}
                value={draft.status || 'Completed'}
                onChange={(val) => setDraft((prev) => ({ ...prev, status: val as SrcyTrainingStatus }))}
              />

              {/* Venue */}
              <label className="floating-field">
                <div className="floating-field__control">
                  <input
                    value={draft.venue || ''}
                    onChange={(e) => setDraft((prev) => ({ ...prev, venue: e.target.value }))}
                    placeholder=" "
                  />
                  <span>Venue / Location</span>
                </div>
              </label>

              {/* Facilitator */}
              <label className="floating-field srcy-membership-form__full">
                <div className="floating-field__control">
                  <input
                    value={draft.facilitator || ''}
                    onChange={(e) => setDraft((prev) => ({ ...prev, facilitator: e.target.value }))}
                    placeholder=" "
                  />
                  <span>Trainer / Facilitator / Sponsoring Chapter</span>
                </div>
              </label>

              {/* Description */}
              <label className="floating-field srcy-membership-form__full">
                <div className="floating-field__control">
                  <textarea
                    rows={3}
                    style={{ resize: 'vertical', minHeight: 72 }}
                    value={draft.description || ''}
                    onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder=" "
                  />
                  <span>Training Description / Objectives / Syllabus</span>
                </div>
              </label>
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
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined spinner-spin" aria-hidden="true">
                    progress_activity
                  </span>
                  Saving...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined" aria-hidden="true">
                    save
                  </span>
                  {training ? 'Update Training' : 'Save Training'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
