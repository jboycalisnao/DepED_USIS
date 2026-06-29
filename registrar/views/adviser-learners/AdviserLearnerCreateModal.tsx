import React, { useEffect, useMemo, useState } from 'react';
import type { Section, Student } from '../../types';
import { EnrollmentStatus, GradeLevel } from '../../types';
import { parseLearnerTagsInput } from '../../utils/learnerTags';

type AdviserLearnerDraft = {
  lrn: string;
  firstName: string;
  middleName: string;
  lastName: string;
  gender: string;
  birthDate: string;
  contactNumber: string;
  email: string;
  address: string;
  guardianName: string;
  fatherName: string;
  motherName: string;
  tagsText: string;
};

interface AdviserLearnerCreateModalProps {
  open: boolean;
  section: Section | null;
  schoolYearLabel: string;
  loading: boolean;
  onClose: () => void;
  onSubmit: (learner: Student) => Promise<{ error?: string } | void>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const createBlankDraft = (): AdviserLearnerDraft => ({
  lrn: '',
  firstName: '',
  middleName: '',
  lastName: '',
  gender: 'Male',
  birthDate: '',
  contactNumber: '',
  email: '',
  address: '',
  guardianName: '',
  fatherName: '',
  motherName: '',
  tagsText: '',
});

const todayIso = () => new Date().toISOString().split('T')[0];

const AdviserLearnerCreateModal: React.FC<AdviserLearnerCreateModalProps> = ({
  open,
  section,
  schoolYearLabel,
  loading,
  onClose,
  onSubmit,
  onSuccess,
  onError,
}) => {
  const [draft, setDraft] = useState<AdviserLearnerDraft>(createBlankDraft);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setDraft(createBlankDraft());
    }
  }, [open]);

  const sectionLabel = useMemo(() => {
    if (!section) return 'Advisory Class';
    return `${section.name}${section.strand ? ` [${section.strand}]` : ''}`;
  }, [section]);

  if (!open || !section) return null;

  const update = (key: keyof AdviserLearnerDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const lrn = draft.lrn.trim();
    const firstName = draft.firstName.trim();
    const lastName = draft.lastName.trim();

    if (!lrn || !firstName || !lastName) {
      onError('LRN, first name, and last name are required to create a learner.');
      return;
    }

    const nextLearner: Student = {
      id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2, 11),
      lrn,
      firstName,
      middleName: draft.middleName.trim(),
      lastName,
      gender: draft.gender,
      birthDate: draft.birthDate.trim(),
      address: draft.address.trim(),
      contactNumber: draft.contactNumber.trim(),
      email: draft.email.trim(),
      guardian_name: draft.guardianName.trim(),
      father_name: draft.fatherName.trim(),
      mother_name: draft.motherName.trim(),
      status: EnrollmentStatus.ENROLLED,
      sectionId: section.id,
      schoolYear: schoolYearLabel,
      tags: parseLearnerTagsInput(draft.tagsText),
      enrollments: [
        {
          id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : Math.random().toString(36).slice(2, 11),
          schoolYear: schoolYearLabel,
          gradeLevel: section.gradeLevel || GradeLevel.GRADE_7,
          section: section.name,
          enrollmentDate: todayIso(),
          status: EnrollmentStatus.ENROLLED,
        },
      ],
      is4Ps: false,
    };

    setIsSaving(true);
    try {
      const result = await onSubmit(nextLearner);
      if (result?.error) {
        onError(result.error);
        return;
      }
      onSuccess(`Learner added to ${sectionLabel}.`);
      setDraft(createBlankDraft());
      onClose();
    } catch {
      onError('Unable to add learner right now. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-dialog modal-dialog--wide registrar-adviser-create-modal" role="dialog" aria-modal="true" aria-labelledby="registrar-adviser-create-title">
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Advisory Class</p>
            <h3 id="registrar-adviser-create-title">Add New Learner</h3>
          </div>
          <button type="button" className="modal-dialog__close" onClick={onClose} aria-label="Close add learner form">
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-dialog__body custom-scrollbar">
            <div className="registrar-adviser-create-modal__summary section-card">
              <div className="section-card__content">
                <p className="section-card__eyebrow">Target Class</p>
                <h4>{sectionLabel}</h4>
                <p>SY {schoolYearLabel}</p>
              </div>
            </div>

            <div className="floating-field-grid registrar-adviser-create-modal__grid">
              <Field label="Learner Reference Number (LRN)" value={draft.lrn} onChange={(value) => update('lrn', value.replace(/\D/g, '').slice(0, 12))} inputMode="numeric" maxLength={12} required />
              <Field label="First Name" value={draft.firstName} onChange={(value) => update('firstName', value)} required />
              <Field label="Middle Name" value={draft.middleName} onChange={(value) => update('middleName', value)} />
              <Field label="Last Name" value={draft.lastName} onChange={(value) => update('lastName', value)} required />
              <SelectField label="Gender" value={draft.gender} onChange={(value) => update('gender', value)} options={['Male', 'Female', 'Other']} />
              <Field label="Birth Date" value={draft.birthDate} onChange={(value) => update('birthDate', value)} type="date" required />
              <Field label="Contact Number" value={draft.contactNumber} onChange={(value) => update('contactNumber', value.replace(/[^\d+]/g, '').slice(0, 15))} inputMode="tel" maxLength={15} />
              <Field label="Email Address" value={draft.email} onChange={(value) => update('email', value)} type="email" />
              <Field label="Address" value={draft.address} onChange={(value) => update('address', value)} />
              <Field label="Guardian Name" value={draft.guardianName} onChange={(value) => update('guardianName', value)} />
              <Field label="Father's Full Name" value={draft.fatherName} onChange={(value) => update('fatherName', value)} />
              <Field label="Mother's Full Name" value={draft.motherName} onChange={(value) => update('motherName', value)} />
              <Field label="Learner Tags" value={draft.tagsText} onChange={(value) => update('tagsText', value)} />
            </div>
          </div>

          <div className="modal-dialog__actions">
            <button type="button" className="modal-dialog__primary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="modal-dialog__blue" disabled={loading || isSaving}>
              {isSaving ? 'Saving...' : 'Add Learner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  maxLength?: number;
  required?: boolean;
};

function Field({ label, value, onChange, type = 'text', inputMode, maxLength, required = false }: FieldProps) {
  return (
    <label className="floating-field">
      <div className="floating-field__control" data-has-value={value.trim() ? 'true' : 'false'}>
        <input
          type={type}
          placeholder=" "
          value={value}
          onChange={(event) => onChange(event.target.value)}
          inputMode={inputMode}
          maxLength={maxLength}
          required={required}
        />
        <span>{label}</span>
      </div>
    </label>
  );
}

type SelectFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
};

function SelectField({ label, value, onChange, options }: SelectFieldProps) {
  return (
    <label className="floating-field">
      <div className="floating-field__control" data-has-value={value.trim() ? 'true' : 'false'}>
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <span>{label}</span>
      </div>
    </label>
  );
}

export default AdviserLearnerCreateModal;
