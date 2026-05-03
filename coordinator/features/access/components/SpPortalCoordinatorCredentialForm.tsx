import { FormEvent, useState } from 'react';
import type { CoordinatorAccessRecord } from '@/features/auth/utils/coordinatorAccess';
import { FloatingField } from '@/features/shared/components/FloatingField';
import { SearchableSelect } from '@/features/shared/components/SearchableSelect';
import type { CreateSpPortalCredentialInput, RegistrySchoolContext } from '../utils/credentialRegistry';

interface SpPortalCoordinatorCredentialFormProps {
  access: CoordinatorAccessRecord | null;
  isSubmitting: boolean;
  onSubmit: (payload: CreateSpPortalCredentialInput) => Promise<void>;
  schools: RegistrySchoolContext[];
  schoolCode: string;
}

const spPortalRoleOptions = [
  { label: 'SP Portal Admin', value: 'sp_portal_admin' },
  { label: 'SP Portal Coordinator', value: 'sp_portal_coordinator' },
  { label: 'SP Portal Viewer', value: 'sp_portal_viewer' },
];

export function SpPortalCoordinatorCredentialForm({
  access,
  isSubmitting,
  onSubmit,
  schools,
  schoolCode,
}: SpPortalCoordinatorCredentialFormProps) {
  const [targetSchoolCode, setTargetSchoolCode] = useState(schoolCode);
  const [form, setForm] = useState<CreateSpPortalCredentialInput>({
    actorAccess: access,
    email: '',
    employeeId: '',
    firstName: '',
    lastName: '',
    middleName: '',
    mobileNo: '',
    password: '',
    permissions: 'portal.manage, applications.review, announcements.manage',
    role: 'sp_portal_admin',
    schoolCode,
    username: '',
  });

  const updateField = (field: keyof CreateSpPortalCredentialInput, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
      actorAccess: access,
      schoolCode: targetSchoolCode || schoolCode,
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await onSubmit({ ...form, actorAccess: access, schoolCode: targetSchoolCode || schoolCode });
    setForm({
      actorAccess: access,
      email: '',
      employeeId: '',
      firstName: '',
      lastName: '',
      middleName: '',
      mobileNo: '',
      password: '',
      permissions: 'portal.manage, applications.review, announcements.manage',
      role: 'sp_portal_admin',
      schoolCode: targetSchoolCode || schoolCode,
      username: '',
    });
  };

  return (
    <form className="registry-form" onSubmit={handleSubmit}>
      {schools.length > 1 ? (
        <SearchableSelect
          label="Target School"
          onChange={(value) => {
            setTargetSchoolCode(value);
            setForm((current) => ({ ...current, actorAccess: access, schoolCode: value }));
          }}
          options={schools.map((entry) => ({
            label: `${entry.schoolCode} - ${entry.schoolName}`,
            value: entry.schoolCode,
          }))}
          value={targetSchoolCode || schoolCode}
        />
      ) : null}
      <FloatingField id="sp-first-name" label="First Name" value={form.firstName} onChange={(event) => updateField('firstName', event.target.value)} required />
      <FloatingField id="sp-last-name" label="Last Name" value={form.lastName} onChange={(event) => updateField('lastName', event.target.value)} required />
      <div className="registry-form__split">
        <FloatingField id="sp-middle-name" label="Middle Name" value={form.middleName} onChange={(event) => updateField('middleName', event.target.value)} />
        <FloatingField id="sp-employee-id" label="Employee ID" value={form.employeeId} onChange={(event) => updateField('employeeId', event.target.value)} />
      </div>
      <div className="registry-form__split">
        <FloatingField id="sp-username" label="Username" value={form.username} onChange={(event) => updateField('username', event.target.value)} required />
        <FloatingField id="sp-email" label="Email" type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} required />
      </div>
      <div className="registry-form__split">
        <FloatingField id="sp-mobile-no" label="Mobile Number" value={form.mobileNo} onChange={(event) => updateField('mobileNo', event.target.value)} />
        <FloatingField id="sp-password" label="Temporary Password" type="password" value={form.password} onChange={(event) => updateField('password', event.target.value)} required />
      </div>
      <SearchableSelect label="Role" onChange={(value) => updateField('role', value)} options={spPortalRoleOptions} value={form.role} />
      <FloatingField
        as="textarea"
        id="sp-permissions"
        label="Permissions"
        value={form.permissions}
        onChange={(event) => updateField('permissions', event.target.value)}
        helper="Separate permissions with commas or new lines."
      />
      <div className="registry-form__actions">
        <button className="login-card__submit" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Saving...' : 'Create SP Portal Access'}
        </button>
      </div>
    </form>
  );
}
