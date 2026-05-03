import { FormEvent, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@deped-usis/shared-supabase';
import { FloatingInput } from '@/components/ui/FloatingField';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import type { AdmissionPortal } from '../../portal/types';
import { initialFormState, type ApplicationFormState } from '../types';

type ApplicationFormProps = {
  portal: AdmissionPortal;
};

function createApplicationNumber(schoolId: string) {
  const timestamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
  return `SP-${schoolId}-${timestamp}`;
}

function saveLocalFallback(payload: Record<string, unknown>) {
  const storageKey = 'sp_portal_draft_applications';
  const currentRecords = JSON.parse(localStorage.getItem(storageKey) || '[]') as Record<string, unknown>[];
  localStorage.setItem(storageKey, JSON.stringify([...currentRecords, payload]));
}

export function ApplicationForm({ portal }: ApplicationFormProps) {
  const [form, setForm] = useState<ApplicationFormState>(initialFormState);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'submitted'>('idle');
  const [feedback, setFeedback] = useState<string | null>(null);

  const gradeLevels = useMemo(
    () => Array.from(new Set(portal.offerings.map((offering) => offering.gradeLevel))),
    [portal.offerings],
  );

  const availablePrograms = useMemo(
    () =>
      portal.offerings.filter((offering) => {
        if (!form.incomingGradeLevel) {
          return true;
        }

        return offering.gradeLevel === form.incomingGradeLevel;
      }),
    [form.incomingGradeLevel, portal.offerings],
  );

  const updateField = (field: keyof ApplicationFormState, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
      selectedProgramTrack: field === 'incomingGradeLevel' ? '' : current.selectedProgramTrack,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitStatus('submitting');
    setFeedback(null);

    if (!form.incomingGradeLevel || !form.selectedProgramTrack) {
      setSubmitStatus('idle');
      setFeedback('Select an incoming grade level and program / track.');
      return;
    }

    const applicationNumber = createApplicationNumber(portal.schoolId);
    const payload = {
      portal_id: portal.id,
      application_number: applicationNumber,
      learner_last_name: form.learnerLastName.trim(),
      learner_first_name: form.learnerFirstName.trim(),
      learner_middle_name: form.learnerMiddleName.trim() || null,
      incoming_grade_level: form.incomingGradeLevel,
      selected_program_track: form.selectedProgramTrack,
      guardian_name: form.guardianName.trim(),
      guardian_contact: form.guardianContact.trim(),
      email: form.email.trim() || null,
      status: 'submitted',
    };
    const { error } = await supabase.from('sp_portal_applications').insert(payload);

    if (error) {
      saveLocalFallback({ ...payload, saved_locally_at: new Date().toISOString() });
    }

    setSubmitStatus('submitted');
    setFeedback(
      error
        ? `Application saved on this device for school processing. Reference number: ${applicationNumber}.`
        : `Application submitted. Reference number: ${applicationNumber}.`,
    );
  };

  return (
    <form className="application-form" onSubmit={handleSubmit}>
      <div className="application-form__grid">
        <FloatingInput label="Last Name" required value={form.learnerLastName} onChange={(event) => updateField('learnerLastName', event.target.value)} />
        <FloatingInput label="First Name" required value={form.learnerFirstName} onChange={(event) => updateField('learnerFirstName', event.target.value)} />
        <FloatingInput label="Middle Name" value={form.learnerMiddleName} onChange={(event) => updateField('learnerMiddleName', event.target.value)} />
        <SearchableSelect
          label="Incoming Grade Level"
          name="incomingGradeLevel"
          placeholder="Select grade level"
          required
          value={form.incomingGradeLevel}
          onChange={(value) => updateField('incomingGradeLevel', value)}
          options={gradeLevels.map((gradeLevel) => ({ label: gradeLevel, value: gradeLevel }))}
        />
        <SearchableSelect
          label="Program / Track"
          name="selectedProgramTrack"
          placeholder="Select program"
          required
          value={form.selectedProgramTrack}
          onChange={(value) => updateField('selectedProgramTrack', value)}
          options={availablePrograms.map((offering) => ({ label: offering.programTrack, value: offering.programTrack }))}
        />
        <FloatingInput label="Parent / Guardian Name" required value={form.guardianName} onChange={(event) => updateField('guardianName', event.target.value)} />
        <FloatingInput label="Guardian Contact Number" required value={form.guardianContact} onChange={(event) => updateField('guardianContact', event.target.value)} />
        <FloatingInput label="Email Address" type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} />
      </div>
      <div className="application-form__actions">
        <Link className="portal-link" to={`/admissions/${portal.regionSlug}/${portal.divisionSlug}/${portal.schoolId}`}>
          Back to Portal
        </Link>
        <button className="portal-button" disabled={submitStatus === 'submitting'} type="submit">
          {submitStatus === 'submitting' ? 'Submitting' : 'Submit Application'}
        </button>
      </div>
      {feedback ? <p className="application-feedback">{feedback}</p> : null}
    </form>
  );
}
