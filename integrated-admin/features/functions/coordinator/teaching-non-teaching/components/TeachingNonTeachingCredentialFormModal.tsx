import { useEffect, useState } from 'react';
import { UsisSearchableSelect } from '../../../../../../common/components/ui/UsisSearchableSelect';
import type {
  CoordinatorDepartmentRecord,
  PersonnelType,
  SaveTeachingNonTeachingCredentialInput,
} from '../services/teachingNonTeachingCredentialsService';

type Props = {
  departments: CoordinatorDepartmentRecord[];
  initialValue?: Partial<SaveTeachingNonTeachingCredentialInput> | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: SaveTeachingNonTeachingCredentialInput) => Promise<void>;
  schoolCode: string;
};

export function TeachingNonTeachingCredentialFormModal({
  departments,
  initialValue,
  isSubmitting,
  onClose,
  onSubmit,
  schoolCode,
}: Props) {
  const [departmentId, setDepartmentId] = useState('');
  const [personnelType, setPersonnelType] = useState<PersonnelType>('teaching');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [departmentError, setDepartmentError] = useState('');

  useEffect(() => {
    if (!initialValue) return;
    setDepartmentId(initialValue.departmentId || '');
    setPersonnelType((initialValue.personnelType as PersonnelType) || 'teaching');
    setFirstName(initialValue.firstName || '');
    setMiddleName(initialValue.middleName || '');
    setLastName(initialValue.lastName || '');
    setUsername(initialValue.username || '');
    setEmail(initialValue.email || '');
    setEmployeeId(initialValue.employeeId || '');
    setMobileNo(initialValue.mobileNo || '');
    setIsActive(initialValue.isActive ?? true);
    setPassword('');
    setDepartmentError('');
  }, [initialValue?.id]);

  return (
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={() => { if (!isSubmitting) onClose(); }} />
      <div className="modal-dialog modal-dialog--wide ia-teaching-credential-modal" role="dialog" aria-modal="true" aria-label="Teaching and non-teaching credential form">
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Coordinator Accounts</p>
            <h3>{initialValue?.id ? 'Edit Credential' : 'Create Credential'}</h3>
          </div>
          <button type="button" className="modal-dialog__close" onClick={() => { if (!isSubmitting) onClose(); }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form
          className="modal-dialog__body registry-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!departmentId.trim()) {
              setDepartmentError('Department is required.');
              return;
            }
            setDepartmentError('');
            void onSubmit({
              departmentId,
              email,
              employeeId,
              firstName,
              id: initialValue?.id,
              isActive,
              lastName,
              middleName,
              mobileNo,
              password,
              personnelType,
              schoolCode,
              username,
            });
          }}
        >
          <div className="floating-field-grid ia-teaching-credential-form-grid">
            <label className="floating-field"><div className="floating-field__control"><input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder=" " required /><span>First Name</span></div></label>
            <label className="floating-field"><div className="floating-field__control"><input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder=" " required /><span>Last Name</span></div></label>
            <label className="floating-field"><div className="floating-field__control"><input value={middleName} onChange={(e) => setMiddleName(e.target.value)} placeholder=" " /><span>Middle Name</span></div></label>
            <label className="floating-field"><div className="floating-field__control"><input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder=" " /><span>Employee ID</span></div></label>
            <UsisSearchableSelect
              ariaLabel="Department"
              floatingLabel
              forcePortalMenu
              label="Department"
              onChange={(value) => setDepartmentId(value)}
              options={departments.map((department) => ({ label: department.name, value: department.id }))}
              required
              value={departmentId}
            />
            {departmentError ? <p className="login-card__error">{departmentError}</p> : null}
            <label className="floating-field"><div className="floating-field__control"><input value={username} onChange={(e) => setUsername(e.target.value)} placeholder=" " required /><span>Username</span></div></label>
            <label className="floating-field"><div className="floating-field__control"><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder=" " type="email" /><span>Email</span></div></label>
            <label className="floating-field"><div className="floating-field__control"><input value={mobileNo} onChange={(e) => setMobileNo(e.target.value)} placeholder=" " /><span>Mobile Number</span></div></label>
            <label className="floating-field">
              <div className="floating-field__control">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder=" "
                  type="password"
                  required={!initialValue?.id}
                />
                <span>{initialValue?.id ? 'New Password' : 'Password'}</span>
              </div>
            </label>
          </div>
          {initialValue?.id ? (
            <p className="registry-copy">Leave New Password blank to keep the current password.</p>
          ) : null}
          <div className="registry-form__split">
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
          <div className="modal-dialog__actions">
            <button type="button" onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <button type="submit" className="modal-dialog__blue" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Credential'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
