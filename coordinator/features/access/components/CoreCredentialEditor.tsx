import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { CoordinatorAccessRecord } from '@/features/auth/utils/coordinatorAccess';
import { FloatingField } from '@/features/shared/components/FloatingField';
import { SearchableSelect } from '@/features/shared/components/SearchableSelect';
import type {
  RegistrySchoolContext,
  RegistryUserRecord,
  UpdateCoreCredentialInput,
} from '../utils/credentialRegistry';
import {
  getAssignableCoreRoleOptions,
  getDefaultCoreAccessLevelForRole,
} from '../utils/coreAccessRules';

interface CoreCredentialEditorProps {
  access: CoordinatorAccessRecord | null;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (payload: UpdateCoreCredentialInput) => Promise<void>;
  record: RegistryUserRecord;
  schools: RegistrySchoolContext[];
}

export function CoreCredentialEditor({
  access,
  isSubmitting,
  onCancel,
  onSubmit,
  record,
  schools,
}: CoreCredentialEditorProps) {
  const roleOptions = useMemo(
    () => getAssignableCoreRoleOptions(access, record.role),
    [access, record.role],
  );
  const [form, setForm] = useState<UpdateCoreCredentialInput>({
    accessLevel: record.accessLevel || getDefaultCoreAccessLevelForRole(record.role, 'school'),
    actorAccess: access as CoordinatorAccessRecord,
    email: record.email || '',
    employeeId: record.employeeId || '',
    firstName: record.firstName || '',
    id: record.id,
    isActive: record.isActive,
    lastName: record.lastName || '',
    middleName: record.middleName || '',
    mobileNo: record.mobileNo || '',
    password: '',
    role: record.role,
    schoolCode: record.schoolCode,
    username: record.username,
  });

  useEffect(() => {
    setForm({
      accessLevel: record.accessLevel || getDefaultCoreAccessLevelForRole(record.role, 'school'),
      actorAccess: access as CoordinatorAccessRecord,
      email: record.email || '',
      employeeId: record.employeeId || '',
      firstName: record.firstName || '',
      id: record.id,
      isActive: record.isActive,
      lastName: record.lastName || '',
      middleName: record.middleName || '',
      mobileNo: record.mobileNo || '',
      password: '',
      role: record.role,
      schoolCode: record.schoolCode,
      username: record.username,
    });
  }, [access, record]);

  if (!access || roleOptions.length === 0) {
    return <p className="registry-copy">This account cannot edit core USIS access.</p>;
  }

  const updateField = (field: keyof UpdateCoreCredentialInput, value: string | boolean) => {
    setForm((current) => {
      if (field === 'role' && typeof value === 'string') {
        return {
          ...current,
          accessLevel: getDefaultCoreAccessLevelForRole(value, current.accessLevel),
          actorAccess: access,
          role: value,
        };
      }

      return {
        ...current,
        [field]: value,
        actorAccess: access,
      };
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await onSubmit({
      ...form,
      accessLevel: getDefaultCoreAccessLevelForRole(form.role, form.accessLevel),
      actorAccess: access,
    });
  };

  return (
    <article className="section-card registry-editor">
      <div className="section-card__bar" />
      <div className="section-card__content">
        <p className="section-card__eyebrow">Edit Core Access</p>
        <h3>Edit USIS Admin</h3>
        <form className="registry-form" onSubmit={handleSubmit}>
          {schools.length > 1 ? (
            <SearchableSelect
              label="Target School"
              onChange={(value) => updateField('schoolCode', value)}
              options={schools.map((entry) => ({
                label: `${entry.schoolCode} - ${entry.schoolName}`,
                value: entry.schoolCode,
              }))}
              value={form.schoolCode}
            />
          ) : null}
          <FloatingField
            id={`edit-core-first-name-${record.id}`}
            label="First Name"
            onChange={(event) => updateField('firstName', event.target.value)}
            required
            value={form.firstName}
          />
          <FloatingField
            id={`edit-core-last-name-${record.id}`}
            label="Last Name"
            onChange={(event) => updateField('lastName', event.target.value)}
            required
            value={form.lastName}
          />
          <div className="registry-form__split">
            <FloatingField
              id={`edit-core-middle-name-${record.id}`}
              label="Middle Name"
              onChange={(event) => updateField('middleName', event.target.value)}
              value={form.middleName}
            />
            <FloatingField
              id={`edit-core-employee-id-${record.id}`}
              label="Employee ID"
              onChange={(event) => updateField('employeeId', event.target.value)}
              value={form.employeeId}
            />
          </div>
          <div className="registry-form__split">
            <FloatingField
              id={`edit-core-username-${record.id}`}
              label="Username"
              onChange={(event) => updateField('username', event.target.value)}
              required
              value={form.username}
            />
            <FloatingField
              id={`edit-core-email-${record.id}`}
              label="Email"
              onChange={(event) => updateField('email', event.target.value)}
              required
              type="email"
              value={form.email}
            />
          </div>
          <div className="registry-form__split">
            <FloatingField
              id={`edit-core-mobile-no-${record.id}`}
              label="Mobile Number"
              onChange={(event) => updateField('mobileNo', event.target.value)}
              value={form.mobileNo}
            />
            <FloatingField
              helper="Leave blank to keep the current password."
              id={`edit-core-password-${record.id}`}
              label="New Password"
              onChange={(event) => updateField('password', event.target.value)}
              type="password"
              value={form.password || ''}
            />
          </div>
          <div className="registry-select-grid registry-select-grid--single">
            <SearchableSelect
              label="Role"
              onChange={(value) => updateField('role', value)}
              options={roleOptions}
              value={form.role}
            />
          </div>
          <SearchableSelect
            label="Account Status"
            onChange={(value) => updateField('isActive', value === 'active')}
            options={[
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'inactive' },
            ]}
            value={form.isActive ? 'active' : 'inactive'}
          />
          <div className="registry-form__actions">
            <button className="registry-action-button registry-action-button--secondary" onClick={onCancel} type="button">
              Cancel
            </button>
            <button className="login-card__submit" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </article>
  );
}
