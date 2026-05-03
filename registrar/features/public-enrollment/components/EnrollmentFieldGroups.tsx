import type { AddressFields, GuardianFields } from '../types';

export function Field({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="floating-field">
      <div className="floating-field__control">
        <input
          type={type}
          value={value}
          required={required}
          placeholder=" "
          onChange={(event) => onChange(event.target.value)}
        />
        <span>{label}</span>
      </div>
    </label>
  );
}

export function AddressGroup({
  title,
  value,
  onChange,
}: {
  title: string;
  value: AddressFields;
  onChange: (value: AddressFields) => void;
}) {
  const setAddressField = (field: keyof AddressFields, nextValue: string) => {
    onChange({ ...value, [field]: nextValue });
  };

  return (
    <div className="public-enrollment__subsection">
      <h3>{title}</h3>
      <div className="form-grid">
        <Field label="Province" value={value.province} onChange={(next) => setAddressField('province', next)} />
        <Field label="City / Municipality" value={value.city} onChange={(next) => setAddressField('city', next)} />
        <Field label="Barangay" value={value.barangay} onChange={(next) => setAddressField('barangay', next)} />
        <Field label="House No." value={value.houseNo} onChange={(next) => setAddressField('houseNo', next)} />
        <Field label="Sitio / Street Name" value={value.street} onChange={(next) => setAddressField('street', next)} />
        <Field label="Zip Code" value={value.zipCode} onChange={(next) => setAddressField('zipCode', next)} />
      </div>
    </div>
  );
}

export function GuardianGroup({
  title,
  value,
  onChange,
}: {
  title: string;
  value: GuardianFields;
  onChange: (value: GuardianFields) => void;
}) {
  const setGuardianField = (field: keyof GuardianFields, nextValue: string) => {
    onChange({ ...value, [field]: nextValue });
  };

  return (
    <div className="public-enrollment__subsection">
      <h3>{title}</h3>
      <div className="form-grid">
        <Field label="Last Name" value={value.lastName} onChange={(next) => setGuardianField('lastName', next)} />
        <Field label="First Name" value={value.firstName} onChange={(next) => setGuardianField('firstName', next)} />
        <Field label="Middle Name" value={value.middleName} onChange={(next) => setGuardianField('middleName', next)} />
        <Field label="Contact Number" value={value.contactNumber} onChange={(next) => setGuardianField('contactNumber', next)} />
      </div>
    </div>
  );
}
