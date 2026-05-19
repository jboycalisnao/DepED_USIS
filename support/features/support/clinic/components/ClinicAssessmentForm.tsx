import { useEffect, useState } from 'react';
import type { ClinicQueueEntry, ClinicVisitInput } from '../types';
import { ClinicFloatingField } from './ClinicFloatingField';
import { CLINIC_DISPOSITIONS } from './ClinicSummaryCards';

type ClinicAssessmentFormProps = {
  queueEntry: ClinicQueueEntry | null;
  onComplete: (payload: ClinicVisitInput) => void;
};

type FormState = Omit<ClinicVisitInput, 'queueId'>;

const INITIAL_STATE: FormState = {
  bloodPressure: '',
  temperatureC: '',
  pulseBpm: '',
  respiratoryRate: '',
  oxygenSaturation: '',
  heightCm: '',
  weightKg: '',
  notes: '',
  actionTaken: '',
  disposition: 'Returned to Class',
  followUpDate: '',
};

export function ClinicAssessmentForm({ queueEntry, onComplete }: ClinicAssessmentFormProps) {
  const [form, setForm] = useState<FormState>(INITIAL_STATE);

  useEffect(() => {
    setForm(INITIAL_STATE);
  }, [queueEntry?.id]);

  if (!queueEntry) {
    return (
      <article className="support-note-box clinic-flow-card">
        <strong>Step 3: Vital signs and notes</strong>
        <span>Select a queued learner to start vital signs recording and clinical notes.</span>
      </article>
    );
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onComplete({ queueId: queueEntry.id, ...form });
  };

  return (
    <article className="support-note-box clinic-flow-card">
      <strong>Step 3: Vital signs and notes</strong>
      <span>Assessing: {queueEntry.learnerName} | LRN {queueEntry.learnerLrn}</span>
      <form className="clinic-grid-form" onSubmit={handleSubmit}>
        <ClinicFloatingField label="Blood Pressure" hint="Example: 110/70 mmHg">
          <input value={form.bloodPressure} data-has-value={form.bloodPressure ? 'true' : 'false'} onChange={(event) => setForm((current) => ({ ...current, bloodPressure: event.target.value }))} placeholder=" " required />
        </ClinicFloatingField>
        <ClinicFloatingField label="Temperature (C)">
          <input value={form.temperatureC} data-has-value={form.temperatureC ? 'true' : 'false'} onChange={(event) => setForm((current) => ({ ...current, temperatureC: event.target.value }))} placeholder=" " required />
        </ClinicFloatingField>
        <ClinicFloatingField label="Pulse Rate (BPM)">
          <input value={form.pulseBpm} data-has-value={form.pulseBpm ? 'true' : 'false'} onChange={(event) => setForm((current) => ({ ...current, pulseBpm: event.target.value }))} placeholder=" " required />
        </ClinicFloatingField>
        <ClinicFloatingField label="Respiratory Rate (CPM)">
          <input value={form.respiratoryRate} data-has-value={form.respiratoryRate ? 'true' : 'false'} onChange={(event) => setForm((current) => ({ ...current, respiratoryRate: event.target.value }))} placeholder=" " required />
        </ClinicFloatingField>
        <ClinicFloatingField label="Oxygen Saturation (%)">
          <input value={form.oxygenSaturation} data-has-value={form.oxygenSaturation ? 'true' : 'false'} onChange={(event) => setForm((current) => ({ ...current, oxygenSaturation: event.target.value }))} placeholder=" " required />
        </ClinicFloatingField>
        <ClinicFloatingField label="Height (cm)">
          <input value={form.heightCm} data-has-value={form.heightCm ? 'true' : 'false'} onChange={(event) => setForm((current) => ({ ...current, heightCm: event.target.value }))} placeholder=" " required />
        </ClinicFloatingField>
        <ClinicFloatingField label="Weight (kg)">
          <input value={form.weightKg} data-has-value={form.weightKg ? 'true' : 'false'} onChange={(event) => setForm((current) => ({ ...current, weightKg: event.target.value }))} placeholder=" " required />
        </ClinicFloatingField>
        <ClinicFloatingField label="Disposition">
          <select value={form.disposition} data-has-value="true" onChange={(event) => setForm((current) => ({ ...current, disposition: event.target.value as FormState['disposition'] }))}>
            {CLINIC_DISPOSITIONS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </ClinicFloatingField>
        <ClinicFloatingField label="Follow-up Date">
          <input type="date" value={form.followUpDate} data-has-value={form.followUpDate ? 'true' : 'false'} onChange={(event) => setForm((current) => ({ ...current, followUpDate: event.target.value }))} placeholder=" " />
        </ClinicFloatingField>
        <ClinicFloatingField label="Clinical Notes" className="clinic-grid-form__full">
          <textarea value={form.notes} data-has-value={form.notes ? 'true' : 'false'} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={3} placeholder=" " required />
        </ClinicFloatingField>
        <ClinicFloatingField label="Intervention / Action Taken" className="clinic-grid-form__full">
          <textarea value={form.actionTaken} data-has-value={form.actionTaken ? 'true' : 'false'} onChange={(event) => setForm((current) => ({ ...current, actionTaken: event.target.value }))} rows={2} placeholder=" " required />
        </ClinicFloatingField>
        <div className="clinic-form-actions clinic-grid-form__full">
          <button className="primary-button" type="submit">Complete Visit Record</button>
        </div>
      </form>
    </article>
  );
}
