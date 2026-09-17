import { useState, useEffect, useMemo, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  computeOneYearValidity,
  generateNextDomNumber,
  loadActiveSchoolYearLabel,
  type SrcyDomDraft,
  type SrcyDomRecord,
  type SrcyDomStatus,
} from '../services/srcyDomService';
import {
  UsisSearchableSelect,
  type UsisSearchableSelectOption,
} from '../../../../common/components/ui/UsisSearchableSelect';

type DomFormModalProps = {
  open: boolean;
  dom: SrcyDomRecord | null;
  existingDoms?: SrcyDomRecord[];
  activeSchoolYear?: string;
  onClose: () => void;
  onSaved: (saved: SrcyDomRecord) => void;
  onSaveError: (error: string) => void;
  saveAction: (draft: SrcyDomDraft, id?: string) => Promise<SrcyDomRecord>;
};

const statusOptions: SrcyDomStatus[] = ['Active', 'Pending', 'Expired', 'Archived'];

const statusSelectOptions: UsisSearchableSelectOption[] = statusOptions.map((st) => ({
  label: st,
  value: st,
}));

export function DomFormModal({
  open,
  dom,
  existingDoms = [],
  activeSchoolYear = '',
  onClose,
  onSaved,
  onSaveError,
  saveAction,
}: DomFormModalProps) {
  const [draft, setDraft] = useState<Partial<SrcyDomDraft>>({
    domNumber: '',
    title: '',
    schoolYear: '',
    validFrom: new Date().toISOString().slice(0, 10),
    validUntil: computeOneYearValidity(new Date().toISOString().slice(0, 10)),
    status: 'Active',
    description: '',
  });
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
    existingDoms.forEach((d) => {
      if (d.schoolYear?.trim()) set.add(d.schoolYear.trim());
    });
    return Array.from(set).map((sy) => ({ label: sy, value: sy }));
  }, [existingDoms, activeSchoolYear]);

  useEffect(() => {
    let isMounted = true;

    if (dom) {
      setDraft({
        domNumber: dom.domNumber,
        title: dom.title,
        schoolYear: dom.schoolYear,
        validFrom: dom.validFrom,
        validUntil: dom.validUntil || computeOneYearValidity(dom.validFrom),
        status: dom.status,
        description: dom.description,
      });
    } else if (open) {
      const today = new Date().toISOString().slice(0, 10);
      const currentYear = new Date().getFullYear();
      const fallbackSy = `${currentYear}-${currentYear + 1}`;
      const effectiveSy = activeSchoolYear?.trim() || fallbackSy;
      const nextDomNumber = generateNextDomNumber(effectiveSy, existingDoms);

      setDraft({
        domNumber: nextDomNumber,
        title: `SRCY Council Batch S.Y. ${effectiveSy}`,
        schoolYear: effectiveSy,
        validFrom: today,
        validUntil: computeOneYearValidity(today),
        status: 'Active',
        description: '',
      });

      // If activeSchoolYear wasn't passed as prop, resolve it dynamically
      if (!activeSchoolYear?.trim()) {
        void loadActiveSchoolYearLabel().then((resolvedSy) => {
          if (!isMounted || !resolvedSy) return;
          setDraft((prev) => {
            const isUnchanged = !prev.schoolYear || prev.schoolYear === fallbackSy;
            if (!isUnchanged) return prev;
            return {
              ...prev,
              schoolYear: resolvedSy,
              domNumber: generateNextDomNumber(resolvedSy, existingDoms),
              title: prev.title === `SRCY Council Batch S.Y. ${fallbackSy}` ? `SRCY Council Batch S.Y. ${resolvedSy}` : prev.title,
            };
          });
        });
      }
    }

    return () => {
      isMounted = false;
    };
  }, [dom, open, existingDoms, activeSchoolYear]);

  if (!open) return null;

  const handleStartDateChange = (startDate: string) => {
    const computedEnd = computeOneYearValidity(startDate);
    setDraft((prev) => ({
      ...prev,
      validFrom: startDate,
      validUntil: computedEnd,
    }));
  };

  const handleSchoolYearChange = (newSy: string) => {
    setDraft((prev) => {
      const isAutoNumbered = !prev.domNumber || /^DOM-.*-\d+$/i.test(prev.domNumber.trim());
      const updatedDomNumber = (!dom && isAutoNumbered)
        ? generateNextDomNumber(newSy, existingDoms)
        : (prev.domNumber || '');

      return {
        ...prev,
        schoolYear: newSy,
        domNumber: updatedDomNumber,
      };
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.title?.trim()) {
      onSaveError('DOM title is required.');
      return;
    }
    if (!draft.validFrom) {
      onSaveError('Membership start date is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: SrcyDomDraft = {
        domNumber: draft.domNumber?.trim() || generateNextDomNumber(draft.schoolYear || '', existingDoms),
        title: draft.title.trim(),
        schoolYear: draft.schoolYear?.trim() || '',
        validFrom: draft.validFrom,
        validUntil: draft.validUntil || computeOneYearValidity(draft.validFrom),
        status: draft.status || 'Active',
        description: draft.description?.trim() || '',
        schoolId: draft.schoolId || '',
        createdBy: draft.createdBy || '',
      };

      const result = await saveAction(payload, dom?.id);
      onSaved(result);
      onClose();
    } catch (err: any) {
      onSaveError(err?.message || 'Failed to save DOM record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="modal-overlay" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div
        className="modal-dialog srcy-dom-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dom-form-title"
      >
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Declaration of Members (DOM)</p>
            <h3 id="dom-form-title">{dom ? 'Edit DOM Batch' : 'New Declaration of Members (DOM)'}</h3>
          </div>
          <button
            type="button"
            className="modal-dialog__close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-dialog__body srcy-dom-form-body">
            <div className="srcy-membership-form">
              <label className="floating-field">
                <div className="floating-field__control">
                  <input
                    value={draft.domNumber || ''}
                    onChange={(e) => setDraft((p) => ({ ...p, domNumber: e.target.value }))}
                    placeholder=" "
                    required
                  />
                  <span>DOM Control / Batch No.</span>
                </div>
              </label>

              <UsisSearchableSelect
                ariaLabel="School Year"
                label="School Year (e.g. 2026-2027)"
                floatingLabel
                forcePortalMenu
                allowCustomValue
                allowTyping
                value={draft.schoolYear || ''}
                options={schoolYearOptions}
                onChange={(val) => handleSchoolYearChange(val)}
              />

              <label className="floating-field srcy-membership-form__full">
                <div className="floating-field__control">
                  <input
                    value={draft.title || ''}
                    onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
                    placeholder=" "
                    required
                  />
                  <span>DOM Batch Title</span>
                </div>
              </label>

              <label className="floating-field">
                <div className="floating-field__control">
                  <input
                    type="date"
                    value={draft.validFrom || ''}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    required
                    data-has-value="true"
                  />
                  <span>Starting Date</span>
                </div>
              </label>

              <label className="floating-field">
                <div className="floating-field__control">
                  <input
                    type="date"
                    value={draft.validUntil || ''}
                    readOnly
                    disabled
                    data-has-value="true"
                  />
                  <span>Validity End Date (1 Year)</span>
                </div>
              </label>

              <div className="srcy-membership-form__full srcy-validity-notice">
                <span className="material-symbols-outlined" aria-hidden="true">verified_user</span>
                <div>
                  <strong>Automated One-Year Membership Period</strong>
                  <p>
                    Validity begins on <strong>{draft.validFrom || '-'}</strong> and concludes on{' '}
                    <strong>{draft.validUntil || '-'}</strong> (exactly one full year of membership).
                  </p>
                </div>
              </div>

              <UsisSearchableSelect
                ariaLabel="Batch Status"
                label="Batch Status"
                floatingLabel
                forcePortalMenu
                value={draft.status || 'Active'}
                options={statusSelectOptions}
                onChange={(val) => setDraft((p) => ({ ...p, status: (val || 'Active') as SrcyDomStatus }))}
              />

              <label className="floating-field srcy-membership-form__full">
                <div className="floating-field__control">
                  <textarea
                    rows={2}
                    value={draft.description || ''}
                    onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
                    placeholder=" "
                  />
                  <span>Description / Council Remarks</span>
                </div>
              </label>
            </div>
          </div>

          <div className="modal-dialog__actions">
            <button type="button" className="secondary-button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : dom ? 'Save Changes' : 'Create DOM Record'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
