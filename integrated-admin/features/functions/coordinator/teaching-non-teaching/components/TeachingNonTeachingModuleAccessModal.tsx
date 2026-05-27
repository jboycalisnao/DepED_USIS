import type { UsisModuleKey } from '../../../../../../../common/auth/moduleAccess';
import { teachingNonTeachingModuleOptions } from '../services/teachingNonTeachingCredentialsService';

type Props = {
  iaPageOptions: Array<{ group: string; key: string; label: string }>;
  iaPageSelections: string[];
  isSubmitting: boolean;
  modules: UsisModuleKey[];
  name: string;
  onClose: () => void;
  onSave: () => Promise<void>;
  onToggleIaPage: (key: string) => void;
  onToggleModule: (key: UsisModuleKey) => void;
};

export function TeachingNonTeachingModuleAccessModal({
  iaPageOptions,
  iaPageSelections,
  isSubmitting,
  modules,
  name,
  onClose,
  onSave,
  onToggleIaPage,
  onToggleModule,
}: Props) {
  const hasIaModule = modules.includes('ia');
  const groupedIaPages = iaPageOptions.reduce<Record<string, Array<{ group: string; key: string; label: string }>>>((acc, row) => {
    const key = row.group || 'Other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});

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
          {hasIaModule ? (
            <fieldset className="registry-radio-group ia-module-access__ia-pages-group">
              <legend>IA Page Access</legend>
              <div className="ia-module-access__ia-pages-list">
                {Object.keys(groupedIaPages).sort((a, b) => a.localeCompare(b)).map((groupName) => (
                  <section key={groupName} className="ia-module-access__ia-pages-item">
                    <h4>{groupName}</h4>
                    <div className="registry-radio-list ia-module-access__ia-pages-options">
                    {groupedIaPages[groupName].map((option) => (
                      <label key={option.key} className="registry-radio-option">
                        <input type="checkbox" checked={iaPageSelections.includes(option.key)} onChange={() => onToggleIaPage(option.key)} />
                        <span>{option.label}</span>
                      </label>
                    ))}
                    </div>
                  </section>
                ))}
                  </div>
            </fieldset>
          ) : null}
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
