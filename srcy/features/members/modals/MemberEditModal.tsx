import { useEffect, useState, useMemo, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  calculateAge,
  updateSrcyMember,
  type SrcyMemberDraft,
  type SrcyMemberRecord,
  type SrcyMembershipStatus,
} from '../services/srcyMembershipService';
import {
  computeMemberStatusFromDom,
  isDomExpired,
  loadSrcyDomRecords,
  type SrcyDomRecord,
} from '../services/srcyDomService';
import {
  UsisSearchableSelect,
  type UsisSearchableSelectOption,
} from '../../../../common/components/ui/UsisSearchableSelect';
import { MaabIdInput } from '../custom-components/MaabIdInput';

type MemberEditModalProps = {
  member: SrcyMemberRecord | null;
  onClose: () => void;
  onSaved: (updated: SrcyMemberRecord) => void;
};

const statusOptions: SrcyMembershipStatus[] = ['Active', 'Pending', 'Inactive'];

export function MemberEditModal({
  member,
  onClose,
  onSaved,
}: MemberEditModalProps) {
  const [domBatches, setDomBatches] = useState<SrcyDomRecord[]>([]);
  const [draft, setDraft] = useState<Partial<SrcyMemberDraft>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    void loadSrcyDomRecords().then(setDomBatches).catch(() => {});
  }, []);

  const domOptions: UsisSearchableSelectOption[] = useMemo(() => [
    ...domBatches
      .filter((d) => !isDomExpired(d))
      .map((d) => {
        const sy = d.schoolYear ? (d.schoolYear.startsWith('S.Y.') ? d.schoolYear : `S.Y. ${d.schoolYear}`) : '';
        return {
          label: sy ? `${d.domNumber} (${sy})` : d.domNumber,
          value: d.id,
        };
      }),
  ], [domBatches]);

  const selectedDom = useMemo(() => domBatches.find((d) => d.id === draft.domId), [domBatches, draft.domId]);
  const derivedStatus = computeMemberStatusFromDom(selectedDom);

  useEffect(() => {
    if (member) {
      setDraft({
        learnerLrn: member.learnerLrn,
        fullName: member.fullName,
        gradeLevel: member.gradeLevel,
        section: member.section,
        councilRole: member.councilRole,
        membershipStatus: member.membershipStatus,
        domId: member.domId || '',
        maabId: member.maabId || '',
        birthdate: member.birthdate || '',
        address: member.address || '',
        contactNo: member.contactNo,
        email: member.email,
        emergencyContact: member.emergencyContact,
        joinedAt: member.joinedAt,
        notes: member.notes,
      });
      setErrorMsg('');
    }
  }, [member]);

  if (!member) return null;

  const calculatedAge = calculateAge(draft.birthdate);

  const updateField = (key: keyof SrcyMemberDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.fullName?.trim()) {
      setErrorMsg('Full name is required.');
      return;
    }
    if (!draft.domId?.trim()) {
      setErrorMsg('A Declaration of Members (DOM) batch is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const updated = await updateSrcyMember(member.id, {
        ...draft,
        membershipStatus: derivedStatus,
      });
      onSaved(updated);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="modal-overlay" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div
        className="modal-dialog modal-dialog--wide srcy-edit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-edit-title"
      >
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">SRCY Member Record</p>
            <h3 id="member-edit-title">Edit Member: {member.fullName}</h3>
          </div>
          <button
            type="button"
            className="modal-dialog__close"
            onClick={onClose}
            aria-label="Close edit modal"
          >
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="srcy-edit-modal__form">
          <div className="modal-dialog__body custom-scrollbar srcy-edit-modal__body">
            {errorMsg ? (
              <div className="notice-box notice-box--danger" style={{ marginBottom: '16px' }}>
                <strong>Update Error</strong>
                <span>{errorMsg}</span>
              </div>
            ) : null}

            <div className="srcy-membership-form">
              <label className="floating-field">
                <div className="floating-field__control">
                  <input
                    value={draft.learnerLrn || ''}
                    onChange={(e) => updateField('learnerLrn', e.target.value.replace(/\D/g, '').slice(0, 12))}
                    placeholder=" "
                  />
                  <span>Learner LRN</span>
                </div>
              </label>

              <label className="floating-field">
                <div className="floating-field__control">
                  <input
                    value={draft.fullName || ''}
                    onChange={(e) => updateField('fullName', e.target.value)}
                    required
                    placeholder=" "
                  />
                  <span>Full Name</span>
                </div>
              </label>

              <label className="floating-field">
                <div className="floating-field__control">
                  <input
                    value={draft.gradeLevel || ''}
                    onChange={(e) => updateField('gradeLevel', e.target.value)}
                    placeholder=" "
                  />
                  <span>Grade Level</span>
                </div>
              </label>

              <label className="floating-field">
                <div className="floating-field__control">
                  <input
                    value={draft.section || ''}
                    onChange={(e) => updateField('section', e.target.value)}
                    placeholder=" "
                  />
                  <span>Section</span>
                </div>
              </label>

              <label className="floating-field">
                <div className="floating-field__control">
                  <input
                    value={draft.councilRole || ''}
                    onChange={(e) => updateField('councilRole', e.target.value)}
                    placeholder=" "
                  />
                  <span>Council Role</span>
                </div>
              </label>

              <UsisSearchableSelect
                ariaLabel="Declaration of Members (DOM) Batch"
                label="Declaration of Members (DOM) Batch"
                floatingLabel
                forcePortalMenu
                required
                value={draft.domId || ''}
                options={domOptions}
                onChange={(selectedId) => {
                  updateField('domId', selectedId);
                  const matched = domBatches.find((d) => d.id === selectedId);
                  if (matched) {
                    if (matched.validFrom) updateField('joinedAt', matched.validFrom);
                    updateField('membershipStatus', computeMemberStatusFromDom(matched));
                  }
                }}
              />

              <label className="floating-field">
                <div className="floating-field__control">
                  <input
                    value={selectedDom ? `${derivedStatus} (${selectedDom.domNumber})` : 'Select DOM batch'}
                    readOnly
                    disabled
                    data-has-value="true"
                  />
                  <span>Status (Derived from DOM Validity)</span>
                </div>
              </label>

              <MaabIdInput
                value={draft.maabId || ''}
                onChange={(val) => updateField('maabId', val)}
              />

              <label className="floating-field">
                <div className="floating-field__control">
                  <input
                    value={draft.contactNo || ''}
                    onChange={(e) => updateField('contactNo', e.target.value)}
                    placeholder=" "
                  />
                  <span>Contact No.</span>
                </div>
              </label>

              <label className="floating-field">
                <div className="floating-field__control">
                  <input
                    type="email"
                    value={draft.email || ''}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder=" "
                  />
                  <span>Email</span>
                </div>
              </label>

              <label className="floating-field">
                <div className="floating-field__control">
                  <input
                    value={draft.emergencyContact || ''}
                    onChange={(e) => updateField('emergencyContact', e.target.value)}
                    placeholder=" "
                  />
                  <span>Emergency Contact</span>
                </div>
              </label>

              <label className="floating-field">
                <div className="floating-field__control">
                  <input
                    type="date"
                    value={draft.birthdate || ''}
                    onChange={(e) => updateField('birthdate', e.target.value)}
                    data-has-value={Boolean(draft.birthdate)}
                  />
                  <span>Birthdate</span>
                </div>
              </label>

              <label className="floating-field">
                <div className="floating-field__control">
                  <input
                    value={calculatedAge !== null ? `${calculatedAge} yrs old` : ''}
                    readOnly
                    disabled
                    placeholder=" "
                  />
                  <span>Calculated Age</span>
                </div>
              </label>

              <label className="floating-field srcy-membership-form__full">
                <div className="floating-field__control">
                  <input
                    value={draft.address || ''}
                    onChange={(e) => updateField('address', e.target.value)}
                    placeholder=" "
                  />
                  <span>Complete Address</span>
                </div>
              </label>

              <label className="floating-field">
                <div className="floating-field__control">
                  <input
                    type="date"
                    value={draft.joinedAt || ''}
                    onChange={(e) => updateField('joinedAt', e.target.value)}
                    data-has-value="true"
                  />
                  <span>Joined Date</span>
                </div>
              </label>

              <label className="floating-field srcy-membership-form__full">
                <div className="floating-field__control">
                  <textarea
                    rows={3}
                    value={draft.notes || ''}
                    onChange={(e) => updateField('notes', e.target.value)}
                    placeholder=" "
                  />
                  <span>Notes</span>
                </div>
              </label>
            </div>
          </div>

          <div className="modal-dialog__actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
