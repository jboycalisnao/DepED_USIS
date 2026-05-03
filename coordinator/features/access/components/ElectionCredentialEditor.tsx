import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { CoordinatorAccessRecord } from '@/features/auth/utils/coordinatorAccess';
import { FloatingField } from '@/features/shared/components/FloatingField';
import { SearchableSelect } from '@/features/shared/components/SearchableSelect';
import type {
  RegistryElectionEvent,
  RegistrySchoolContext,
  RegistryUserRecord,
  UpdateElectionCredentialInput,
} from '../utils/credentialRegistry';

interface ElectionCredentialEditorProps {
  access: CoordinatorAccessRecord | null;
  events: RegistryElectionEvent[];
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (payload: UpdateElectionCredentialInput) => Promise<void>;
  record: RegistryUserRecord;
  schools: RegistrySchoolContext[];
}

const electionRoleOptions = [
  { label: 'Election Admin', value: 'election_admin' },
  { label: 'Election Coordinator', value: 'election_coordinator' },
  { label: 'Election Encoder', value: 'election_encoder' },
  { label: 'Election Viewer', value: 'election_viewer' },
];

export function ElectionCredentialEditor({
  access,
  events,
  isSubmitting,
  onCancel,
  onSubmit,
  record,
  schools,
}: ElectionCredentialEditorProps) {
  const [form, setForm] = useState<UpdateElectionCredentialInput>({
    actorAccess: access,
    email: record.email || '',
    electionId: record.electionId || '',
    employeeId: record.employeeId || '',
    firstName: record.firstName || '',
    id: record.id,
    isActive: record.isActive,
    lastName: record.lastName || '',
    middleName: record.middleName || '',
    mobileNo: record.mobileNo || '',
    password: '',
    permissions: record.permissions || 'candidate.manage, ballot.audit, settings.manage',
    role: record.role,
    schoolCode: record.schoolCode,
    username: record.username,
  });

  const activeEvents = useMemo(
    () => events.filter((event) => event.schoolCode === form.schoolCode),
    [events, form.schoolCode],
  );
  const eventOptions = useMemo(
    () =>
      activeEvents.length === 0
        ? [{ label: 'No election events available', value: '' }]
        : activeEvents.map((event) => ({
            label: `${event.electionCode} - ${event.electionName}`,
            value: event.id,
          })),
    [activeEvents],
  );

  useEffect(() => {
    setForm({
      actorAccess: access,
      email: record.email || '',
      electionId: record.electionId || '',
      employeeId: record.employeeId || '',
      firstName: record.firstName || '',
      id: record.id,
      isActive: record.isActive,
      lastName: record.lastName || '',
      middleName: record.middleName || '',
      mobileNo: record.mobileNo || '',
      password: '',
      permissions: record.permissions || 'candidate.manage, ballot.audit, settings.manage',
      role: record.role,
      schoolCode: record.schoolCode,
      username: record.username,
    });
  }, [access, record]);

  const updateField = (field: keyof UpdateElectionCredentialInput, value: string | boolean) => {
    setForm((current) => {
      if (field === 'schoolCode' && typeof value === 'string') {
        const nextElectionId = events.find((entry) => entry.schoolCode === value)?.id || '';
        return {
          ...current,
          actorAccess: access,
          electionId: nextElectionId,
          schoolCode: value,
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
      actorAccess: access,
    });
  };

  return (
    <article className="section-card registry-editor">
      <div className="section-card__bar" />
      <div className="section-card__content">
        <p className="section-card__eyebrow">Edit Election Access</p>
        <h3>Edit Election Coordinator</h3>
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
            id={`edit-election-first-name-${record.id}`}
            label="First Name"
            onChange={(event) => updateField('firstName', event.target.value)}
            required
            value={form.firstName}
          />
          <FloatingField
            id={`edit-election-last-name-${record.id}`}
            label="Last Name"
            onChange={(event) => updateField('lastName', event.target.value)}
            required
            value={form.lastName}
          />
          <div className="registry-form__split">
            <FloatingField
              id={`edit-election-middle-name-${record.id}`}
              label="Middle Name"
              onChange={(event) => updateField('middleName', event.target.value)}
              value={form.middleName}
            />
            <FloatingField
              id={`edit-election-employee-id-${record.id}`}
              label="Employee ID"
              onChange={(event) => updateField('employeeId', event.target.value)}
              value={form.employeeId}
            />
          </div>
          <div className="registry-form__split">
            <FloatingField
              id={`edit-election-username-${record.id}`}
              label="Username"
              onChange={(event) => updateField('username', event.target.value)}
              required
              value={form.username}
            />
            <FloatingField
              id={`edit-election-email-${record.id}`}
              label="Email"
              onChange={(event) => updateField('email', event.target.value)}
              required
              type="email"
              value={form.email}
            />
          </div>
          <div className="registry-form__split">
            <FloatingField
              id={`edit-election-mobile-no-${record.id}`}
              label="Mobile Number"
              onChange={(event) => updateField('mobileNo', event.target.value)}
              value={form.mobileNo}
            />
            <FloatingField
              helper="Leave blank to keep the current password."
              id={`edit-election-password-${record.id}`}
              label="New Password"
              onChange={(event) => updateField('password', event.target.value)}
              type="password"
              value={form.password || ''}
            />
          </div>
          <div className="registry-select-grid">
            <SearchableSelect
              disabled={activeEvents.length === 0}
              label="Election Event"
              onChange={(value) => updateField('electionId', value)}
              options={eventOptions}
              value={form.electionId || activeEvents[0]?.id || ''}
            />
            <SearchableSelect
              label="Role"
              onChange={(value) => updateField('role', value)}
              options={electionRoleOptions}
              value={form.role}
            />
          </div>
          <FloatingField
            as="textarea"
            helper="Separate permissions with commas or new lines."
            id={`edit-election-permissions-${record.id}`}
            label="Permissions"
            onChange={(event) => updateField('permissions', event.target.value)}
            value={form.permissions}
          />
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
            <button className="login-card__submit" disabled={isSubmitting || activeEvents.length === 0} type="submit">
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </article>
  );
}
