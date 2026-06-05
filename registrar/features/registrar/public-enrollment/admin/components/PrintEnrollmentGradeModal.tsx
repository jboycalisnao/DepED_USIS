import { SearchableSelect } from '../../../../../components/ui/SearchableSelect';

type Props = {
  isOpen: boolean;
  gradeOptions: string[];
  selectedGrade: string;
  onGradeChange: (value: string) => void;
  onClose: () => void;
  onPrint: () => void;
  isDisabled?: boolean;
};

export default function PrintEnrollmentGradeModal({
  isOpen,
  gradeOptions,
  selectedGrade,
  onGradeChange,
  onClose,
  onPrint,
  isDisabled = false,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-dialog registrar-print-enrollees-modal" role="dialog" aria-modal="true" aria-labelledby="print-enrollment-grade-title">
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Enrollment Module</p>
            <h3 id="print-enrollment-grade-title">Print Enrollees List</h3>
          </div>
        </div>
        <div className="modal-dialog__body">
          <p>Select the grade level to print from the active enrollment submissions.</p>
          <SearchableSelect
            label="Grade Level"
            placeholder="Select grade level"
            floatingLabel
            showLabel={false}
            disabled={isDisabled}
            value={selectedGrade}
            onChange={onGradeChange}
            options={gradeOptions.map((grade) => ({ value: grade, label: grade }))}
          />
        </div>
        <div className="modal-dialog__actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="modal-dialog__blue" onClick={onPrint} disabled={isDisabled || !selectedGrade}>
            Print List
          </button>
        </div>
      </div>
    </div>
  );
}
