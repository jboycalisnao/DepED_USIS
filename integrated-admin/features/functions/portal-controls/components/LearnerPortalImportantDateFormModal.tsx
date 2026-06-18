import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import type { LearnerPortalImportantDateDraft } from '../services/learnerPortalImportantDatesService';

type Props = {
  draft: LearnerPortalImportantDateDraft;
  editingId: string | null;
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSave: () => void;
  onDraftChange: (next: LearnerPortalImportantDateDraft) => void;
  onReset: () => void;
};

export function LearnerPortalImportantDateFormModal({
  draft,
  editingId,
  isOpen,
  isSaving,
  onClose,
  onSave,
  onDraftChange,
  onReset,
}: Props) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-dialog modal-dialog--wide" role="dialog" aria-modal="true" aria-label={editingId ? 'Edit important date' : 'Create important date'}>
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Portal Controls</p>
            <h3>{editingId ? 'Edit Important Date' : 'Create Important Date'}</h3>
          </div>
          <button type="button" className="modal-dialog__close" onClick={onClose} aria-label="Close">
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>

        <form
          className="modal-dialog__body registry-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSave();
          }}
        >
          <p className="registry-copy">Keep date reminders brief and easy to scan.</p>

          <div className="floating-field-grid floating-field-grid--two">
            <label className="floating-field">
              <div className="floating-field__control">
                <input value={draft.title} onChange={(event) => onDraftChange({ ...draft, title: event.target.value })} placeholder=" " />
                <span>Title</span>
              </div>
            </label>
            <label className="floating-field">
              <div className="floating-field__control">
                <input type="date" value={draft.dueDate} onChange={(event) => onDraftChange({ ...draft, dueDate: event.target.value })} placeholder=" " />
                <span>Due Date</span>
              </div>
            </label>
          </div>

          <label className="floating-field">
            <div className="floating-field__control">
              <textarea value={draft.details} onChange={(event) => onDraftChange({ ...draft, details: event.target.value })} placeholder=" " rows={6} />
              <span>Details</span>
            </div>
          </label>

          <div className="floating-field-grid floating-field-grid--two">
            <label className="floating-field">
              <div className="floating-field__control">
                <input value={String(draft.sortOrder)} onChange={(event) => onDraftChange({ ...draft, sortOrder: Number(event.target.value || 0) })} placeholder=" " type="number" />
                <span>Sort Order</span>
              </div>
            </label>
          </div>

          <div className="registrar-enrollment-announcements__toggles">
            <label className="choice-row registrar-enrollment-announcements__toggle">
              <input type="checkbox" checked={draft.isActive} onChange={(event) => onDraftChange({ ...draft, isActive: event.target.checked })} />
              <span>Active</span>
            </label>
            <label className="choice-row registrar-enrollment-announcements__toggle">
              <input type="checkbox" checked={draft.isPinned} onChange={(event) => onDraftChange({ ...draft, isPinned: event.target.checked })} />
              <span>Pinned</span>
            </label>
          </div>

          <div className="modal-dialog__actions">
            <button type="button" onClick={onReset} disabled={isSaving}>
              Reset
            </button>
            <button type="submit" className="modal-dialog__blue" disabled={isSaving}>
              {isSaving ? 'Saving...' : editingId ? 'Update Important Date' : 'Save Important Date'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
