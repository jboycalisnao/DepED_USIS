import type { UsisModuleKey } from '../../../../../../../common/auth/moduleAccess';
import { teachingNonTeachingModuleOptions } from '../services/teachingNonTeachingCredentialsService';

type Props = {
  isSubmitting: boolean;
  modules: UsisModuleKey[];
  name: string;
  onClose: () => void;
  onSave: () => Promise<void>;
  onToggleModule: (key: UsisModuleKey) => void;
};

export function TeachingNonTeachingModuleAccessModal({
  isSubmitting,
  modules,
  name,
  onClose,
  onSave,
  onToggleModule,
}: Props) {
  return (
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={() => { if (!isSubmitting) onClose(); }} />
      <div className="modal-dialog modal-dialog--registry-modules" role="dialog" aria-modal="true" aria-label="Module access settings">
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Teaching and Non-Teaching</p>
            <h3>Module Access</h3>
          </div>
          <button type="button" className="modal-dialog__close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="modal-dialog__body">
          <p className="registry-modal__lead">Assign module access for <strong>{name}</strong>.</p>
          <fieldset className="registry-radio-group">
            <legend>Allowed Modules</legend>
            <div className="registry-radio-list">
              {teachingNonTeachingModuleOptions.map((option) => (
                <label key={option.key} className="registry-radio-option">
                  <input type="checkbox" checked={modules.includes(option.key)} onChange={() => onToggleModule(option.key)} />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <div className="modal-dialog__actions">
          <button type="button" onClick={onClose} disabled={isSubmitting}>Cancel</button>
          <button type="button" className="modal-dialog__blue" onClick={() => void onSave()} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Access'}
          </button>
        </div>
      </div>
    </div>
  );
}

