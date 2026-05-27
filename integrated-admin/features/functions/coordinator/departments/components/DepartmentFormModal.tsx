import type { DepartmentRecord } from '../services/departmentsService';

type Props = {
  editing: DepartmentRecord | null;
  isSubmitting: boolean;
  name: string;
  onClose: () => void;
  onNameChange: (value: string) => void;
  onSubmit: () => Promise<void>;
};

export function DepartmentFormModal({
  editing,
  isSubmitting,
  name,
  onClose,
  onNameChange,
  onSubmit,
}: Props) {
  if (!editing) return null;

  return (
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-dialog" role="dialog" aria-modal="true" aria-label="Department form">
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Coordinator Departments</p>
            <h3>{editing.id ? 'Edit Department' : 'Create Department'}</h3>
          </div>
          <button type="button" className="modal-dialog__close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form className="modal-dialog__body registry-form" onSubmit={(event) => {
          event.preventDefault();
          void onSubmit();
        }}>
          <label className="floating-field">
            <div className="floating-field__control">
              <input value={name} onChange={(e) => onNameChange(e.target.value)} placeholder=" " required />
              <span>Department Name</span>
            </div>
          </label>
          <div className="modal-dialog__actions">
            <button type="button" onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <button type="submit" className="modal-dialog__blue" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Department'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
