import { FormEvent, useMemo, useState } from 'react';
import type { CoordinatorAccessRecord } from '@/features/auth/utils/coordinatorAccess';
import { FloatingField } from '@/features/shared/components/FloatingField';
import { SearchableSelect } from '@/features/shared/components/SearchableSelect';
import type {
  CreateElectionCredentialInput,
  RegistryElectionEvent,
  RegistrySchoolContext,
} from '../utils/credentialRegistry';

interface ElectionCoordinatorCredentialFormProps {
  access: CoordinatorAccessRecord | null;
  events: RegistryElectionEvent[];
  isSubmitting: boolean;
  onSubmit: (payload: CreateElectionCredentialInput) => Promise<void>;
  schools: RegistrySchoolContext[];
  schoolCode: string;
}

const electionRoleOptions = [
  { label: 'Election Admin', value: 'election_admin' },
  { label: 'Election Coordinator', value: 'election_coordinator' },
  { label: 'Election Encoder', value: 'election_encoder' },
  { label: 'Election Viewer', value: 'election_viewer' },
];

export function ElectionCoordinatorCredentialForm({
  access,
  events,
  isSubmitting,
  onSubmit,
  schools,
  schoolCode,
}: ElectionCoordinatorCredentialFormProps) {
  const [targetSchoolCode, setTargetSchoolCode] = useState(schoolCode);
  const filteredEvents = useMemo(
    () => events.filter((event) => event.schoolCode === (targetSchoolCode || schoolCode)),
    [events, schoolCode, targetSchoolCode],
  );
  const defaultEventId = filteredEvents[0]?.id || '';
  const [form, setForm] = useState<CreateElectionCredentialInput>({
    actorAccess: access,
    email: '',
    electionId: defaultEventId,
    employeeId: '',
    firstName: '',
    lastName: '',
    middleName: '',
    mobileNo: '',
    password: '',
    permissions: 'candidate.manage, ballot.audit, settings.manage',
    role: 'election_admin',
    schoolCode,
    username: '',
  });

  const activeEvents = useMemo(() => filteredEvents, [filteredEvents]);
  const electionEventOptions = useMemo(
    () =>
      activeEvents.length === 0
        ? [{ label: 'No election events available', value: '' }]
        : activeEvents.map((event) => ({
            label: `${event.electionCode} - ${event.electionName}`,
            value: event.id,
          })),
    [activeEvents],
  );

  const updateField = (field: keyof CreateElectionCredentialInput, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
      electionId: field === 'electionId' ? value : current.electionId || activeEvents[0]?.id || '',
      actorAccess: access,
      schoolCode: targetSchoolCode || schoolCode,
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await onSubmit({
      ...form,
      actorAccess: access,
      electionId: form.electionId || activeEvents[0]?.id || '',
      schoolCode: targetSchoolCode || schoolCode,
    });
    setForm({
      actorAccess: access,
      email: '',
      electionId: activeEvents[0]?.id || '',
      employeeId: '',
      firstName: '',
      lastName: '',
      middleName: '',
      mobileNo: '',
      password: '',
      permissions: 'candidate.manage, ballot.audit, settings.manage',
      role: 'election_admin',
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
            setForm((current) => ({
              ...current,
              actorAccess: access,
              electionId: '',
              schoolCode: value,
            }));
          }}
          options={schools.map((entry) => ({
            label: `${entry.schoolCode} - ${entry.schoolName}`,
            value: entry.schoolCode,
          }))}
          value={targetSchoolCode || schoolCode}
        />
      ) : null}
      <FloatingField
        id="election-first-name"
        label="First Name"
        value={form.firstName}
        onChange={(event) => updateField('firstName', event.target.value)}
        required
      />
      <FloatingField
        id="election-last-name"
        label="Last Name"
        value={form.lastName}
        onChange={(event) => updateField('lastName', event.target.value)}
        required
      />
      <div className="registry-form__split">
        <FloatingField
          id="election-middle-name"
          label="Middle Name"
          value={form.middleName}
          onChange={(event) => updateField('middleName', event.target.value)}
        />
        <FloatingField
          id="election-employee-id"
          label="Employee ID"
          value={form.employeeId}
          onChange={(event) => updateField('employeeId', event.target.value)}
        />
      </div>
      <div className="registry-form__split">
        <FloatingField
          id="election-username"
          label="Username"
          value={form.username}
          onChange={(event) => updateField('username', event.target.value)}
          required
        />
        <FloatingField
          id="election-email"
          label="Email"
          type="email"
          value={form.email}
          onChange={(event) => updateField('email', event.target.value)}
          required
        />
      </div>
      <div className="registry-form__split">
        <FloatingField
          id="election-mobile-no"
          label="Mobile Number"
          value={form.mobileNo}
          onChange={(event) => updateField('mobileNo', event.target.value)}
        />
        <FloatingField
          id="election-password"
          label="Temporary Password"
          type="password"
          value={form.password}
          onChange={(event) => updateField('password', event.target.value)}
          required
        />
      </div>
      <div className="registry-select-grid">
        <SearchableSelect
          disabled={activeEvents.length === 0}
          label="Election Event"
          onChange={(value) => updateField('electionId', value)}
          options={electionEventOptions}
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
        id="election-permissions"
        label="Permissions"
        value={form.permissions}
        onChange={(event) => updateField('permissions', event.target.value)}
        helper="Separate permissions with commas or new lines."
      />
      <div className="registry-form__actions">
        <button
          className="login-card__submit"
          disabled={isSubmitting || activeEvents.length === 0}
          type="submit"
        >
          {isSubmitting ? 'Saving...' : 'Create Election Access'}
        </button>
      </div>
    </form>
  );
}
