import React from 'react';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { AcademicProgram, GradeLevel } from '../../types';

interface CreateSectionModalProps {
  isOpen: boolean;
  isSHS: (grade: GradeLevel) => boolean;
  isJHS: (grade: GradeLevel) => boolean;
  loading: boolean;
  newAdviser: string;
  newClassification: string;
  newName: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  selectedGrade: GradeLevel;
  setNewAdviser: (value: string) => void;
  setNewClassification: (value: string) => void;
  setNewName: (value: string) => void;
  createClassificationOptions: (grade: GradeLevel) => { value: string; label: string }[];
}

const CreateSectionModal: React.FC<CreateSectionModalProps> = ({
  isOpen,
  isSHS,
  isJHS,
  loading,
  newAdviser,
  newClassification,
  newName,
  onClose,
  onSubmit,
  selectedGrade,
  setNewAdviser,
  setNewClassification,
  setNewName,
  createClassificationOptions,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="create-section-title">
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <h3 id="create-section-title">Register New Section</h3>
            <p>{selectedGrade}</p>
          </div>
          <button type="button" onClick={onClose} className="modal-dialog__close" aria-label="Close create section">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="modal-dialog__body form-grid">
            <div className="floating-field">
              <label className="floating-field__control">
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder=" " required />
                <span>Section Name</span>
              </label>
            </div>
            <div className="floating-field">
              <label className="floating-field__control">
                <input type="text" value={newAdviser} onChange={(e) => setNewAdviser(e.target.value)} placeholder=" " />
                <span>Class Adviser</span>
              </label>
            </div>

            {(isSHS(selectedGrade) || isJHS(selectedGrade)) && (
              <div>
                <SearchableSelect
                  label={isSHS(selectedGrade) ? 'Strand' : 'Special Program'}
                  placeholder={isSHS(selectedGrade) ? 'Select Strand' : 'Select Special Program'}
                  floatingLabel
                  showLabel={false}
                  value={newClassification}
                  onChange={setNewClassification}
                  options={[{ value: '', label: 'General' }, ...createClassificationOptions(selectedGrade)]}
                />
              </div>
            )}
          </div>
          <div className="modal-dialog__actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button disabled={loading} type="submit" className="modal-dialog__blue">Create Section</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSectionModal;
