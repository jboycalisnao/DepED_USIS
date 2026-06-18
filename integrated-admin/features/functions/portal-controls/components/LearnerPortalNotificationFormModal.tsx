import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import type { LearnerPortalNotificationDraft } from '../services/learnerPortalNotificationsService';

type Props = {
  draft: LearnerPortalNotificationDraft;
  editingId: string | null;
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSave: () => void;
  onDraftChange: (next: LearnerPortalNotificationDraft) => void;
  onReset: () => void;
};

export function LearnerPortalNotificationFormModal({
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
      <div className="modal-dialog modal-dialog--wide" role="dialog" aria-modal="true" aria-label={editingId ? 'Edit notification' : 'Create notification'}>
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Portal Controls</p>
            <h3>{editingId ? 'Edit Notification' : 'Create Notification'}</h3>
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
          <p className="registry-copy">Keep notifications short and learner-facing.</p>

          <div className="floating-field-grid floating-field-grid--two">
            <label className="floating-field">
              <div className="floating-field__control">
                <input value={draft.title} onChange={(event) => onDraftChange({ ...draft, title: event.target.value })} placeholder=" " />
                <span>Title</span>
              </div>
            </label>

            <label className="floating-field">
              <div className="floating-field__control">
                <input
                  type="number"
                  value={String(draft.sortOrder)}
                  onChange={(event) => onDraftChange({ ...draft, sortOrder: Number(event.target.value || 0) })}
                  placeholder=" "
                />
                <span>Sort Order</span>
              </div>
            </label>
          </div>

          <label className="floating-field">
            <div className="floating-field__control">
              <textarea value={draft.message} onChange={(event) => onDraftChange({ ...draft, message: event.target.value })} placeholder=" " rows={6} />
              <span>Message</span>
            </div>
          </label>

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
              {isSaving ? 'Saving...' : editingId ? 'Update Notification' : 'Save Notification'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
