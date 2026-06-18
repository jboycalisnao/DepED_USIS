import { UsisSearchableSelect } from '../../../../../../common/components/ui/UsisSearchableSelect';

type DepartmentOption = {
  label: string;
  value: string;
};

type PrintScope = 'all' | 'department';

type Props = {
  departmentOptions: DepartmentOption[];
  isOpen: boolean;
  isPrinting?: boolean;
  onClose: () => void;
  onDepartmentChange: (value: string) => void;
  onPrint: () => void;
  onScopeChange: (value: PrintScope) => void;
  printScope: PrintScope;
  selectedDepartmentId: string;
  totalCount: number;
};

export function TeachingNonTeachingCredentialPrintModal({
  departmentOptions,
  isOpen,
  isPrinting = false,
  onClose,
  onDepartmentChange,
  onPrint,
  onScopeChange,
  printScope,
  selectedDepartmentId,
  totalCount,
}: Props) {
  if (!isOpen) return null;

  const isDepartmentScope = printScope === 'department';

  return (
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="teaching-non-teaching-print-title">
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Coordinator Subpage</p>
            <h3 id="teaching-non-teaching-print-title">Print Credentials List</h3>
          </div>
          <button type="button" className="modal-dialog__close" onClick={onClose} aria-label="Close">
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>
        <div className="modal-dialog__body registry-form">
          <p>Select whether to print the full credentials list or only one department.</p>
          <div className="registry-radio-group">
            <label className="registry-radio-option">
              <input
                type="radio"
                name="teaching-non-teaching-print-scope"
                checked={printScope === 'all'}
                onChange={() => onScopeChange('all')}
              />
              <span>Whole list</span>
            </label>
            <label className="registry-radio-option">
              <input
                type="radio"
                name="teaching-non-teaching-print-scope"
                checked={isDepartmentScope}
                onChange={() => onScopeChange('department')}
              />
              <span>Per department</span>
            </label>
          </div>

          <UsisSearchableSelect
            ariaLabel="Department"
            allowTyping
            disabled={!isDepartmentScope}
            floatingLabel
            forcePortalMenu
            label="Department"
            onChange={onDepartmentChange}
            options={departmentOptions}
            placeholder="Select department"
            showLabel={false}
            value={selectedDepartmentId}
          />

          <p>
            This will open a print preview for {totalCount} account{totalCount === 1 ? '' : 's'}.
          </p>
        </div>
        <div className="modal-dialog__actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="modal-dialog__blue" onClick={onPrint} disabled={isPrinting || (isDepartmentScope && !selectedDepartmentId)}>
            {isPrinting ? 'Preparing...' : 'Print List'}
          </button>
        </div>
      </div>
    </div>
  );
}
