import { createPortal } from 'react-dom';
import { UsisSearchableSelect } from '../../../../../../common/components/ui/UsisSearchableSelect';
import { UsisChoiceOption } from '../../../../../../common/components/ui/UsisChoiceOption';

type Props = {
  gradeOptions: string[];
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onGradeChange: (value: string) => void;
  selectedGrade: string;
  selectedScope: 'all' | 'grade';
  onScopeChange: (value: 'all' | 'grade') => void;
};

const scopeOptions: Array<{ value: 'all' | 'grade'; title: string; description: string }> = [
  { value: 'all', title: 'Whole Orders', description: 'Export all currently loaded ID order records.' },
  { value: 'grade', title: 'Selected Grade Level', description: 'Export only the chosen grade level.' },
];

export function IdOrdersExportModal({
  gradeOptions,
  isOpen,
  onClose,
  onConfirm,
  onGradeChange,
  selectedGrade,
  selectedScope,
  onScopeChange,
}: Props) {
  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-dialog modal-dialog--wide" role="dialog" aria-modal="true" aria-labelledby="id-orders-export-title">
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">ID Orders</p>
            <h3 id="id-orders-export-title">Choose Export Scope</h3>
          </div>
        </div>

        <div className="modal-dialog__body">
          <p>Select whether to export the entire ID orders list or only one grade level.</p>

          <fieldset className="registry-choice-group registry-choice-group--stacked">
            <legend>Export Scope</legend>
            {scopeOptions.map((option) => {
              const isSelected = selectedScope === option.value;
              return (
                <UsisChoiceOption
                  key={option.value}
                  checked={isSelected}
                  controlType="radio"
                  description={option.description}
                  label={option.title}
                  name="id-orders-export-scope"
                  onChange={() => onScopeChange(option.value)}
                  stacked
                  value={option.value}
                />
              );
            })}
          </fieldset>

          {selectedScope === 'grade' ? (
            <div className="id-orders-export-modal__grade-select">
              <UsisSearchableSelect
                ariaLabel="Grade Level"
                allowTyping
                floatingLabel
                forcePortalMenu
                label="Grade Level"
                onChange={onGradeChange}
                options={gradeOptions.map((grade) => ({ label: grade, value: grade }))}
                placeholder="Select grade level"
                value={selectedGrade}
              />
            </div>
          ) : null}
        </div>

        <div className="modal-dialog__actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={onConfirm}
            disabled={selectedScope === 'grade' && !selectedGrade}
          >
            Download Excel
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
