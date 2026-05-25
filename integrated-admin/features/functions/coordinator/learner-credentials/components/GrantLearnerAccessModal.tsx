import { UsisSearchableSelect } from '../../../../../../common/components/ui/UsisSearchableSelect';
import { CLASS_OFFICER_POSITIONS, LEARNER_OPERATION_OPTIONS } from '../constants';
import type { LearnerSearchRecord } from '../services/learnerBasedCredentialService';

type Props = {
  isEditing?: boolean;
  isSubmitting: boolean;
  learner: LearnerSearchRecord | null;
  onClose: () => void;
  onOperationChange: (value: string) => void;
  onPositionChange: (value: string) => void;
  onSubmit: () => void;
  operationValue: string;
  positionValue: string;
};

export function GrantLearnerAccessModal({
  isEditing = false,
  isSubmitting,
  learner,
  onClose,
  onOperationChange,
  onPositionChange,
  onSubmit,
  operationValue,
  positionValue,
}: Props) {
  if (!learner) return null;

  return (
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-dialog modal-dialog--wide" role="dialog" aria-modal="true" aria-label="Grant learner-based credential">
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Learner-based Credentials</p>
            <h3>{isEditing ? 'Edit Access' : 'Grant Access'}</h3>
          </div>
          <button type="button" className="modal-dialog__close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="modal-dialog__body registry-form">
          <div className="registry-detail-sheet__table">
            <article><span>Learner</span><strong>{learner.fullName}</strong></article>
            <article><span>LRN</span><strong>{learner.lrn || '-'}</strong></article>
          </div>
          <div className="registry-form__split">
            <UsisSearchableSelect
              ariaLabel="Class position"
              allowTyping={false}
              forcePortalMenu
              floatingLabel
              label="Class Position"
              onChange={onPositionChange}
              options={CLASS_OFFICER_POSITIONS.map((position) => ({ label: position, value: position }))}
              value={positionValue}
            />
            <UsisSearchableSelect
              ariaLabel="Module operation"
              allowTyping={false}
              forcePortalMenu
              floatingLabel
              label="Module Operation"
              onChange={onOperationChange}
              options={LEARNER_OPERATION_OPTIONS.map((option) => ({ label: option.label, value: option.value }))}
              value={operationValue}
            />
          </div>
        </div>
        <div className="modal-dialog__actions">
          <button type="button" onClick={onClose} disabled={isSubmitting}>Cancel</button>
          <button type="button" className="modal-dialog__blue" onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? (isEditing ? 'Saving...' : 'Granting...') : (isEditing ? 'Save Changes' : 'Grant Access')}
          </button>
        </div>
      </div>
    </div>
  );
}
