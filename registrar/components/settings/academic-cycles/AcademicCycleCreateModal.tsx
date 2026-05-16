import React from 'react';
import { SearchableSelect, SearchableSelectOption } from '../../ui/SearchableSelect';

interface AcademicCycleCreateModalProps {
  errorFeedback: string | null;
  generatedLabel: string;
  isDuplicate: boolean;
  isOpen: boolean;
  loading: boolean;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  selectedStartYear: number;
  setSelectedStartYear: (year: number) => void;
  yearSelectOptions: SearchableSelectOption[];
}

const AcademicCycleCreateModal: React.FC<AcademicCycleCreateModalProps> = ({
  errorFeedback,
  generatedLabel,
  isDuplicate,
  isOpen,
  loading,
  onClose,
  onSubmit,
  selectedStartYear,
  setSelectedStartYear,
  yearSelectOptions,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay modal-overlay--high">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="create-cycle-title">
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <h3 id="create-cycle-title">Add Academic Cycle</h3>
          </div>
          <button type="button" className="modal-dialog__close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="modal-dialog__body">
          <form onSubmit={onSubmit} className="settings-cycles__create">
            <div>
              <label>Start Year</label>
              <SearchableSelect
                label="Start Year"
                value={`${selectedStartYear}`}
                onChange={(value) => setSelectedStartYear(parseInt(value, 10))}
                options={yearSelectOptions}
                disabled={loading}
                showLabel={false}
              />
            </div>
            <div>
              <label>Cycle Label</label>
              <strong>{generatedLabel}</strong>
            </div>
            <button type="submit" disabled={loading || isDuplicate} className="primary-button">
              <span className="material-symbols-outlined">{loading ? 'sync' : isDuplicate ? 'block' : 'add'}</span>
            </button>
          </form>
          <div className="settings-cycles__messages">
            <span>{isDuplicate ? 'This cycle is already registered' : 'Select year to establish new cycle'}</span>
            {errorFeedback && <span className="is-error">{errorFeedback}</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcademicCycleCreateModal;
