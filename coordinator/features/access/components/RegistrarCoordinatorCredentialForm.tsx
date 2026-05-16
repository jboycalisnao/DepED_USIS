import { FormEvent, useEffect, useState } from 'react';
import type { CoordinatorAccessRecord } from '@/features/auth/utils/coordinatorAccess';
import { FloatingField } from '@/features/shared/components/FloatingField';
import { SearchableSelect } from '@/features/shared/components/SearchableSelect';
import { useDepedSchoolOptions } from '@/features/schools/hooks/useDepedSchoolOptions';
import type {
  CreateCoreCredentialInput,
  RegistrySchoolContext,
} from '../utils/credentialRegistry';
import {
  getDefaultCoreAccessLevelForRole,
} from '../utils/coreAccessRules';
import { CoordinatorCredentialSuccessModal } from './CoordinatorCredentialSuccessModal';

interface RegistrarCoordinatorCredentialFormProps {
  access: CoordinatorAccessRecord | null;
  isSubmitting: boolean;
  onSubmit: (payload: CreateCoreCredentialInput) => Promise<void>;
  schools: RegistrySchoolContext[];
  schoolCode: string;
}

export function RegistrarCoordinatorCredentialForm({
  access,
  isSubmitting,
  onSubmit,
  schools,
  schoolCode,
}: RegistrarCoordinatorCredentialFormProps) {
  const {
    options: schoolOptions,
    setQuery: setSchoolQuery,
    isLoading: isSchoolsLoading,
  } = useDepedSchoolOptions(schools, access?.isSuperAdmin ? undefined : access?.region);

  const defaultSchoolCode = schoolCode === '123456' ? '' : (schoolCode || schools[0]?.schoolCode || '');
  const [targetSchoolCode, setTargetSchoolCode] = useState(defaultSchoolCode);
  const [form, setForm] = useState<CreateCoreCredentialInput>({
    accessLevel: 'school',
    actorAccess: access as CoordinatorAccessRecord,
    credentialType: 'registrar',
    email: '',
    employeeId: '',
    firstName: '',
    lastName: '',
    middleName: '',
    mobileNo: '',
    password: '',
    role: 'registrar_coordinator',
    schoolCode: defaultSchoolCode,
    username: '',
  });

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);

  useEffect(() => {
    const nextSchoolCode = targetSchoolCode || defaultSchoolCode;
    setForm((current) => {
      const actorAccess = access as CoordinatorAccessRecord;
      if (
        current.actorAccess === actorAccess &&
        current.schoolCode === nextSchoolCode
      ) {
        return current;
      }

      return {
        ...current,
        actorAccess,
        schoolCode: nextSchoolCode,
      };
    });

    if (!targetSchoolCode && nextSchoolCode) {
      setTargetSchoolCode(nextSchoolCode);
    }
  }, [access, defaultSchoolCode, targetSchoolCode]);

  const updateField = (field: keyof CreateCoreCredentialInput, value: string) =>
    setForm((current) => ({
      ...current,
      [field]: value,
      actorAccess: access as CoordinatorAccessRecord,
      schoolCode: targetSchoolCode || defaultSchoolCode,
    }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const finalSchoolCode = targetSchoolCode || defaultSchoolCode;

    if (!finalSchoolCode) {
      alert('Please select a target school.');
      return;
    }

    if (!form.username || !form.email || !form.password || !form.firstName || !form.lastName) {
      alert('Please fill in all required fields.');
      return;
    }

    try {
      console.log('Submitting registrar credential:', { ...form, schoolCode: finalSchoolCode });
      await onSubmit({
        ...form,
        actorAccess: access as CoordinatorAccessRecord,
        accessLevel: 'school',
        credentialType: 'registrar',
        role: 'registrar_coordinator',
        schoolCode: finalSchoolCode,
      });

      setSuccessData({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        username: form.username,
        password: form.password,
        accessLevel: 'school',
        credentialType: 'registrar',
      });
      setShowSuccessModal(true);

      setForm({
        accessLevel: 'school',
        actorAccess: access as CoordinatorAccessRecord,
        credentialType: 'registrar',
        email: '',
        employeeId: '',
        firstName: '',
        lastName: '',
        middleName: '',
        mobileNo: '',
        password: '',
        role: 'registrar_coordinator',
        schoolCode: finalSchoolCode,
        username: '',
      });
    } catch (err) {
      console.error('Form submission failed:', err);
    }
  };

  if (!access) {
    return <p className="registry-copy">This account cannot assign registrar access.</p>;
  }

  return (
    <form className="registry-form" onSubmit={handleSubmit}>
      <SearchableSelect
        isLoading={isSchoolsLoading}
        label="Target School"
        onChange={(value) => {
          setTargetSchoolCode(value);
          setForm((current) => ({ ...current, actorAccess: access, schoolCode: value }));
        }}
        onSearch={setSchoolQuery}
        options={schoolOptions}
        value={targetSchoolCode || defaultSchoolCode}
      />
      <FloatingField
        id="registrar-first-name"
        label="First Name"
        value={form.firstName}
        onChange={(event) => updateField('firstName', event.target.value)}
        required
      />
      <FloatingField
        id="registrar-last-name"
        label="Last Name"
        value={form.lastName}
        onChange={(event) => updateField('lastName', event.target.value)}
        required
      />
      <div className="registry-form__split">
        <FloatingField
          id="registrar-middle-name"
          label="Middle Name"
          value={form.middleName}
          onChange={(event) => updateField('middleName', event.target.value)}
        />
        <FloatingField
          id="registrar-employee-id"
          label="Employee ID"
          value={form.employeeId}
          onChange={(event) => updateField('employeeId', event.target.value)}
        />
      </div>
      <div className="registry-form__split">
        <FloatingField
          id="registrar-username"
          label="Username"
          value={form.username}
          onChange={(event) => updateField('username', event.target.value)}
          required
        />
        <FloatingField
          id="registrar-email"
          label="Email"
          type="email"
          value={form.email}
          onChange={(event) => updateField('email', event.target.value)}
          required
        />
      </div>
      <div className="registry-form__split">
        <FloatingField
          id="registrar-mobile-no"
          label="Mobile Number"
          value={form.mobileNo}
          onChange={(event) => updateField('mobileNo', event.target.value)}
        />
        <FloatingField
          id="registrar-password"
          label="Temporary Password"
          type="password"
          value={form.password}
          onChange={(event) => updateField('password', event.target.value)}
          required
        />
      </div>
      <div className="registry-form__actions">
        <button className="login-card__submit" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Saving...' : 'Create Registrar Access'}
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
