import { FormEvent, useEffect, useState } from 'react';
import type { CoordinatorAccessRecord } from '@/features/auth/utils/coordinatorAccess';
import { FloatingField } from '@/features/shared/components/FloatingField';
import type {
  CreateCoreCredentialInput,
} from '../utils/credentialRegistry';
import { CoordinatorCredentialSuccessModal } from './CoordinatorCredentialSuccessModal';
import { moduleOptions } from '../utils/moduleAccessRegistry';
import type { UsisModuleKey } from '../../../../common/auth/moduleAccess';

interface CoreCoordinatorCredentialFormProps {
  access: CoordinatorAccessRecord | null;
  accessLevel: 'school';
  credentialType:
    | 'school_usis_coordinator'
    | 'registrar_coordinator'
    | 'attendance_coordinator'
    | 'system_admin';
  isSubmitting: boolean;
  onSubmit: (payload: CreateCoreCredentialInput) => Promise<void>;
  role:
    | 'school_usis_coordinator'
    | 'registrar_coordinator'
    | 'attendance_coordinator'
    | 'system_admin';
  schoolCode: string;
}

export function CoreCoordinatorCredentialForm({
  access,
  accessLevel,
  credentialType,
  isSubmitting,
  onSubmit,
  role,
  schoolCode,
}: CoreCoordinatorCredentialFormProps) {
  const getDefaultAllowedModules = (): UsisModuleKey[] => {
    if (credentialType === 'attendance_coordinator') return ['attendance'];
    if (credentialType === 'registrar_coordinator') return ['registrar'];
    return ['coordinator'];
  };

  const defaultSchoolCode = schoolCode === '123456' ? '' : schoolCode;
  const defaultRole = role;
  const effectiveSchoolCode = defaultSchoolCode;
  const [allowedModules, setAllowedModules] = useState<UsisModuleKey[]>(getDefaultAllowedModules);
  const [form, setForm] = useState<CreateCoreCredentialInput>({
    accessLevel,
    actorAccess: access as CoordinatorAccessRecord,
    credentialType,
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

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);

  useEffect(() => {
    const nextSchoolCode = effectiveSchoolCode;
    setForm((current) => {
      const nextRole = defaultRole;
      const actorAccess = access as CoordinatorAccessRecord;
      const nextAccessLevel = accessLevel;

      if (
        current.accessLevel === nextAccessLevel &&
        current.actorAccess === actorAccess &&
        current.credentialType === credentialType &&
        current.role === nextRole &&
        current.schoolCode === nextSchoolCode
      ) {
        return current;
      }

      return {
        ...current,
        accessLevel: nextAccessLevel,
        actorAccess,
        credentialType,
        role: nextRole,
        schoolCode: nextSchoolCode,
      };
    });
    setAllowedModules(getDefaultAllowedModules());

  }, [access, accessLevel, credentialType, defaultRole, defaultSchoolCode, effectiveSchoolCode]);

  const updateField = (field: keyof CreateCoreCredentialInput, value: string) =>
    setForm((current) => ({
      ...current,
      [field]: value,
      actorAccess: access as CoordinatorAccessRecord,
      schoolCode: defaultSchoolCode,
    }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const finalSchoolCode = effectiveSchoolCode;

    if (!finalSchoolCode) {
      alert('Please select a target school.');
      return;
    }

    if (!form.username || !form.email || !form.password || !form.firstName || !form.lastName) {
      alert('Please fill in all required fields.');
      return;
    }

    try {
      console.log('Submitting core credential:', { ...form, schoolCode: finalSchoolCode });
      await onSubmit({
        ...form,
        actorAccess: access as CoordinatorAccessRecord,
        accessLevel,
        credentialType,
        allowedModules,
        role: form.role,
        schoolCode: finalSchoolCode,
      });

      setSuccessData({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        username: form.username,
        password: form.password,
        accessLevel: form.accessLevel,
        credentialType: credentialType,
      });
      setShowSuccessModal(true);

      setForm({
        accessLevel,
        actorAccess: access as CoordinatorAccessRecord,
        credentialType,
        email: '',
        employeeId: '',
        firstName: '',
        lastName: '',
        middleName: '',
        mobileNo: '',
        password: '',
        role: defaultRole,
        schoolCode: finalSchoolCode,
        username: '',
      });
      setAllowedModules(getDefaultAllowedModules());
    } catch (err) {
      console.error('Form submission failed:', err);
    }
  };

  const toggleModule = (moduleKey: UsisModuleKey) => {
    setAllowedModules((current) =>
      current.includes(moduleKey) ? current.filter((item) => item !== moduleKey) : [...current, moduleKey],
    );
  };

  if (!access) {
    return <p className="registry-copy">This account cannot assign core USIS access.</p>;
  }

  return (
    <form className="registry-form" onSubmit={handleSubmit}>
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
      <fieldset className="registry-radio-group">
        <legend>Allowed Modules</legend>
        <div className="registry-radio-list">
          {moduleOptions.map((option) => (
            <label key={option.key} className="registry-radio-option">
              <input
                type="checkbox"
                checked={allowedModules.includes(option.key)}
                onChange={() => toggleModule(option.key)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="registry-form__actions">
        <button className="login-card__submit" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Saving...' : 'Create Core Access'}
        </button>
      </div>
      <CoordinatorCredentialSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        data={successData || {}}
      />
    </form>
  );
}
