import { useEffect, useState } from 'react';
import { UsisSearchableSelect } from '../../../../../../common/components/ui/UsisSearchableSelect';
import type {
  CoordinatorDepartmentRecord,
  PersonnelType,
} from '../services/teachingNonTeachingCredentialsService';

type Props = {
  departments: CoordinatorDepartmentRecord[];
  initialDepartmentId: string;
  initialPersonnelType: PersonnelType;
  initialIsActive: boolean;
  isSubmitting: boolean;
  selectedCount: number;
  onClose: () => void;
  onSave: (payload: {
    departmentId: string;
    isActive: boolean;
    personnelType: PersonnelType;
  }) => Promise<void>;
};

export function TeachingNonTeachingBulkEditModal({
  departments,
  initialDepartmentId,
  initialPersonnelType,
  initialIsActive,
  isSubmitting,
  selectedCount,
  onClose,
  onSave,
}: Props) {
  const [departmentId, setDepartmentId] = useState(initialDepartmentId);
  const [personnelType, setPersonnelType] = useState<PersonnelType>(initialPersonnelType);
  const [isActive, setIsActive] = useState(initialIsActive);

  useEffect(() => {
    setDepartmentId(initialDepartmentId);
    setPersonnelType(initialPersonnelType);
    setIsActive(initialIsActive);
  }, [initialDepartmentId, initialIsActive, initialPersonnelType]);

  return (
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={() => { if (!isSubmitting) onClose(); }} />
      <div className="modal-dialog modal-dialog--wide" role="dialog" aria-modal="true" aria-label="Bulk edit teaching and non-teaching accounts">
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Teaching and Non-Teaching</p>
            <h3>Bulk Edit Accounts</h3>
          </div>
          <button type="button" className="modal-dialog__close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="modal-dialog__body registry-form">
          <p className="registry-copy">
            Apply the same department, personnel type, and status to <strong>{selectedCount}</strong> selected account{selectedCount === 1 ? '' : 's'}.
          </p>

          <UsisSearchableSelect
            ariaLabel="Department"
            floatingLabel
            forcePortalMenu
            label="Department"
            onChange={setDepartmentId}
            options={departments.map((department) => ({ label: department.name, value: department.id }))}
            value={departmentId}
          />

          <div className="floating-field-grid floating-field-grid--two">
            <UsisSearchableSelect
              ariaLabel="Personnel Type"
              allowTyping={false}
              floatingLabel
              forcePortalMenu
              label="Personnel Type"
              onChange={(value) => setPersonnelType(value as PersonnelType)}
              options={[
                { label: 'Teaching', value: 'teaching' },
                { label: 'Non-Teaching', value: 'non_teaching' },
              ]}
              value={personnelType}
            />
            <UsisSearchableSelect
              ariaLabel="Status"
              allowTyping={false}
              floatingLabel
              forcePortalMenu
              label="Status"
              onChange={(value) => setIsActive(value === 'active')}
              options={[
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
              ]}
              value={isActive ? 'active' : 'inactive'}
            />
          </div>
        </div>

        <div className="modal-dialog__actions">
          <button type="button" onClick={onClose} disabled={isSubmitting}>Cancel</button>
          <button
            type="button"
            className="modal-dialog__blue"
            onClick={() => void onSave({ departmentId, isActive, personnelType })}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Apply to Selected'}
          </button>
        </div>
      </div>
    </div>
  );
}
