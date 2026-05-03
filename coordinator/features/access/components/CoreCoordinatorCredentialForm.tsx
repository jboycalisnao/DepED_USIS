import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { CoordinatorAccessRecord } from '@/features/auth/utils/coordinatorAccess';
import { FloatingField } from '@/features/shared/components/FloatingField';
import { SearchableSelect } from '@/features/shared/components/SearchableSelect';
import type {
  CreateCoreCredentialInput,
  RegistrySchoolContext,
} from '../utils/credentialRegistry';
import {
  getAssignableCoreRoleOptions,
  getDefaultCoreAccessLevelForRole,
} from '../utils/coreAccessRules';

interface CoreCoordinatorCredentialFormProps {
  access: CoordinatorAccessRecord | null;
  isSubmitting: boolean;
  onSubmit: (payload: CreateCoreCredentialInput) => Promise<void>;
  schools: RegistrySchoolContext[];
  schoolCode: string;
}

export function CoreCoordinatorCredentialForm({
  access,
  isSubmitting,
  onSubmit,
  schools,
  schoolCode,
}: CoreCoordinatorCredentialFormProps) {
  const coreRoleOptions = useMemo(() => getAssignableCoreRoleOptions(access), [access]);
  const defaultSchoolCode = schoolCode || schools[0]?.schoolCode || '';
  const defaultRole = coreRoleOptions[0]?.value || 'school_usis_coordinator';
  const [targetSchoolCode, setTargetSchoolCode] = useState(defaultSchoolCode);
  const [form, setForm] = useState<CreateCoreCredentialInput>({
    accessLevel: getDefaultCoreAccessLevelForRole(defaultRole, 'school'),
    actorAccess: access as CoordinatorAccessRecord,
    email: '',
    employeeId: '',
    firstName: '',
    lastName: '',
    middleName: '',
    mobileNo: '',
    password: '',
    role: defaultRole,
    schoolCode: defaultSchoolCode,
    username: '',
  });

  useEffect(() => {
    const nextSchoolCode = targetSchoolCode || defaultSchoolCode;
    setForm((current) => {
      const nextRole = coreRoleOptions.some((option) => option.value === current.role)
        ? current.role
        : defaultRole;
      const actorAccess = access as CoordinatorAccessRecord;
      const nextAccessLevel = getDefaultCoreAccessLevelForRole(nextRole, current.accessLevel);

      if (
        current.accessLevel === nextAccessLevel &&
        current.actorAccess === actorAccess &&
        current.role === nextRole &&
        current.schoolCode === nextSchoolCode
      ) {
        return current;
      }

      return {
        ...current,
        accessLevel: nextAccessLevel,
        actorAccess,
        role: nextRole,
        schoolCode: nextSchoolCode,
      };
    });

    if (!targetSchoolCode && nextSchoolCode) {
      setTargetSchoolCode(nextSchoolCode);
    }
  }, [access, coreRoleOptions, defaultRole, defaultSchoolCode, targetSchoolCode]);

  const updateField = (field: keyof CreateCoreCredentialInput, value: string) => {
    setForm((current) => {
      if (field === 'role') {
        return {
          ...current,
          accessLevel: getDefaultCoreAccessLevelForRole(value, current.accessLevel),
          actorAccess: access as CoordinatorAccessRecord,
          role: value,
          schoolCode: targetSchoolCode || defaultSchoolCode,
        };
      }

      return {
        ...current,
        [field]: value,
        actorAccess: access as CoordinatorAccessRecord,
        schoolCode: targetSchoolCode || defaultSchoolCode,
      };
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await onSubmit({
      ...form,
      actorAccess: access as CoordinatorAccessRecord,
      accessLevel: getDefaultCoreAccessLevelForRole(form.role, form.accessLevel),
      role: form.role,
      schoolCode: targetSchoolCode || defaultSchoolCode,
    });
    setForm({
      accessLevel: getDefaultCoreAccessLevelForRole(defaultRole, 'school'),
      actorAccess: access as CoordinatorAccessRecord,
      email: '',
      employeeId: '',
      firstName: '',
      lastName: '',
      middleName: '',
      mobileNo: '',
      password: '',
      role: defaultRole,
      schoolCode: targetSchoolCode || defaultSchoolCode,
      username: '',
    });
  };

  if (!access || coreRoleOptions.length === 0) {
    return <p className="registry-copy">This account cannot assign core USIS access.</p>;
  }

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
      <FloatingField
        id="core-first-name"
        label="First Name"
        value={form.firstName}
        onChange={(event) => updateField('firstName', event.target.value)}
        required
      />
      <FloatingField
        id="core-last-name"
        label="Last Name"
        value={form.lastName}
        onChange={(event) => updateField('lastName', event.target.value)}
        required
      />
      <div className="registry-form__split">
        <FloatingField
          id="core-middle-name"
          label="Middle Name"
          value={form.middleName}
          onChange={(event) => updateField('middleName', event.target.value)}
        />
        <FloatingField
          id="core-employee-id"
          label="Employee ID"
          value={form.employeeId}
          onChange={(event) => updateField('employeeId', event.target.value)}
        />
      </div>
      <div className="registry-form__split">
        <FloatingField
          id="core-username"
          label="Username"
          value={form.username}
          onChange={(event) => updateField('username', event.target.value)}
          required
        />
        <FloatingField
          id="core-email"
          label="Email"
          type="email"
          value={form.email}
          onChange={(event) => updateField('email', event.target.value)}
          required
        />
      </div>
      <div className="registry-form__split">
        <FloatingField
          id="core-mobile-no"
          label="Mobile Number"
          value={form.mobileNo}
          onChange={(event) => updateField('mobileNo', event.target.value)}
        />
        <FloatingField
          id="core-password"
          label="Temporary Password"
          type="password"
          value={form.password}
          onChange={(event) => updateField('password', event.target.value)}
          required
        />
      </div>
      <div className="registry-select-grid registry-select-grid--single">
        <SearchableSelect
          label="Role"
          onChange={(value) => updateField('role', value)}
          options={coreRoleOptions}
          value={form.role}
        />
      </div>
      <div className="registry-form__actions">
        <button className="login-card__submit" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Saving...' : 'Create Core Access'}
        </button>
      </div>
    </form>
  );
}
