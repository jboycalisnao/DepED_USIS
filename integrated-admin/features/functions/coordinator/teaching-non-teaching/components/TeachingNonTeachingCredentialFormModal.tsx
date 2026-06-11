import { useEffect, useState } from 'react';
import { UsisSearchableSelect } from '../../../../../../common/components/ui/UsisSearchableSelect';
import { TeachingNonTeachingCredentialBulkImportPanel } from './TeachingNonTeachingCredentialBulkImportPanel';
import type {
  CoordinatorDepartmentRecord,
  TeachingNonTeachingCredentialRecord,
  PersonnelType,
  SaveTeachingNonTeachingCredentialInput,
} from '../services/teachingNonTeachingCredentialsService';
import type { TeachingNonTeachingBulkImportResult } from '../utils/teachingNonTeachingCredentialWorkbook';

type Props = {
  departments: CoordinatorDepartmentRecord[];
  initialValue?: Partial<SaveTeachingNonTeachingCredentialInput> | null;
  existingRecords: TeachingNonTeachingCredentialRecord[];
  isSubmitting: boolean;
  onClose: () => void;
  onBulkImport: (payloads: SaveTeachingNonTeachingCredentialInput[]) => Promise<TeachingNonTeachingBulkImportResult>;
  onSubmit: (payload: SaveTeachingNonTeachingCredentialInput) => Promise<void>;
  schoolCode: string;
};

export function TeachingNonTeachingCredentialFormModal({
  departments,
  initialValue,
  existingRecords,
  isSubmitting,
  onBulkImport,
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
  const [mode, setMode] = useState<'form' | 'bulk-import'>('form');

  useEffect(() => {
    setMode('form');
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
            <h3>{mode === 'bulk-import' ? 'Bulk Import Credentials' : initialValue?.id ? 'Edit Credential' : 'Create Credential'}</h3>
          </div>
          <div className="ia-teaching-credential-modal__header-actions">
            {!initialValue?.id ? (
              <button
                type="button"
                className="secondary-button ia-teaching-credential-modal__mode-button"
                onClick={() => setMode((current) => (current === 'form' ? 'bulk-import' : 'form'))}
                disabled={isSubmitting}
              >
                {mode === 'bulk-import' ? 'Back to Form' : 'Bulk Import'}
              </button>
            ) : null}
            <button type="button" className="modal-dialog__close" onClick={() => { if (!isSubmitting) onClose(); }}>
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
        {mode === 'bulk-import' ? (
          <div className="modal-dialog__body">
            <TeachingNonTeachingCredentialBulkImportPanel
              departments={departments}
              existingRecords={existingRecords}
              isSubmitting={isSubmitting}
              onBack={() => setMode('form')}
              onClose={onClose}
              onImport={onBulkImport}
              schoolCode={schoolCode}
            />
          </div>
        ) : (
          <form
            className="modal-dialog__body registry-form ia-teaching-credential-modal__form"
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
            <div className="floating-field-grid floating-field-grid--two">
              <label className="floating-field"><div className="floating-field__control"><input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder=" " required /><span>First Name</span></div></label>
              <label className="floating-field"><div className="floating-field__control"><input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder=" " required /><span>Last Name</span></div></label>
              <label className="floating-field"><div className="floating-field__control"><input value={middleName} onChange={(e) => setMiddleName(e.target.value)} placeholder=" " /><span>Middle Name</span></div></label>
              <label className="floating-field"><div className="floating-field__control"><input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder=" " /><span>Employee ID</span></div></label>
              <UsisSearchableSelect
                ariaLabel="Department"
                className="ia-teaching-credential-modal__searchable-select"
                forcePortalMenu
                label="Department"
                onChange={(value) => setDepartmentId(value)}
                options={departments.map((department) => ({ label: department.name, value: department.id }))}
                required
                floatingLabel
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
            <div className="floating-field-grid floating-field-grid--two">
              <UsisSearchableSelect
                ariaLabel="Personnel Type"
                allowTyping={false}
                className="ia-teaching-credential-modal__searchable-select"
                forcePortalMenu
                label="Personnel Type"
                onChange={(value) => setPersonnelType(value as PersonnelType)}
                options={[
                  { label: 'Teaching', value: 'teaching' },
                  { label: 'Non-Teaching', value: 'non_teaching' },
                ]}
                required
                floatingLabel
                value={personnelType}
              />
              <UsisSearchableSelect
                ariaLabel="Status"
                allowTyping={false}
                className="ia-teaching-credential-modal__searchable-select"
                forcePortalMenu
                label="Status"
                onChange={(value) => setIsActive(value === 'active')}
                options={[
                  { label: 'Active', value: 'active' },
                  { label: 'Inactive', value: 'inactive' },
                ]}
                required
                floatingLabel
                value={isActive ? 'active' : 'inactive'}
              />
            </div>
            <div className="modal-dialog__actions">
              <button type="button" onClick={onClose} disabled={isSubmitting}>Cancel</button>
              <button type="submit" className="modal-dialog__blue" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Credential'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
