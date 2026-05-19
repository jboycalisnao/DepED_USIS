import { useEffect, useState } from 'react';
import type { ClinicSex } from '../types';
import { lookupLearnerByLrn } from '../utils/learnerLookup';
import { ClinicFloatingField } from './ClinicFloatingField';

type ClinicQueueFormProps = {
  onSubmit: (payload: {
    learnerLrn: string;
    learnerName: string;
    sex: ClinicSex;
    age: string;
    gradeSection: string;
    concern: string;
    referredBy: string;
  }) => void;
};

export function ClinicQueueForm({ onSubmit }: ClinicQueueFormProps) {
  const [form, setForm] = useState({
    learnerLrn: '',
    learnerName: '',
    sex: 'Female' as ClinicSex,
    age: '',
    gradeSection: '',
    referredBy: '',
    concern: '',
  });
  const [lookupNotice, setLookupNotice] = useState<string>('');

  const updateField = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  useEffect(() => {
    const normalizedLrn = form.learnerLrn.replace(/\D/g, '').slice(0, 12);

    if (normalizedLrn.length !== 12) {
      setLookupNotice('');
      return;
    }

    setLookupNotice('Looking up learner record...');

    const timeoutId = window.setTimeout(async () => {
      const lookupResult = await lookupLearnerByLrn(normalizedLrn);

      if (!lookupResult) {
        setLookupNotice('No learner record found for this LRN.');
        return;
      }

      setForm((current) => ({
        ...current,
        learnerName: lookupResult.learnerName || current.learnerName,
        sex: lookupResult.sex || current.sex,
        age: lookupResult.age || current.age,
        gradeSection: lookupResult.gradeSection || current.gradeSection,
      }));

      setLookupNotice('Learner record found. Available fields were pre-filled.');
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [form.learnerLrn]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    onSubmit({
      learnerLrn: form.learnerLrn.trim(),
      learnerName: form.learnerName.trim(),
      sex: form.sex,
      age: form.age.trim(),
      gradeSection: form.gradeSection.trim(),
      concern: form.concern.trim(),
      referredBy: form.referredBy.trim(),
    });

    setForm({
      learnerLrn: '',
      learnerName: '',
      sex: 'Female',
      age: '',
      gradeSection: '',
      referredBy: '',
      concern: '',
    });
    setLookupNotice('');
  };

  return (
    <article className="support-note-box clinic-flow-card">
      <strong>Step 1: Register clinic visit</strong>
      <form className="clinic-grid-form" onSubmit={handleSubmit}>
        <ClinicFloatingField label="LRN" hint={lookupNotice || '12-digit Learner Reference Number'}>
          <input
            value={form.learnerLrn}
            data-has-value={form.learnerLrn ? 'true' : 'false'}
            onChange={(event) => updateField('learnerLrn', event.target.value.replace(/\D/g, '').slice(0, 12))}
            required
            minLength={12}
            maxLength={12}
            inputMode="numeric"
            placeholder=" "
          />
        </ClinicFloatingField>

        <ClinicFloatingField label="Full Name" className="clinic-grid-form__full">
          <input
            value={form.learnerName}
            data-has-value={form.learnerName ? 'true' : 'false'}
            onChange={(event) => updateField('learnerName', event.target.value)}
            autoComplete="off"
            required
            maxLength={120}
            placeholder=" "
          />
        </ClinicFloatingField>

        <ClinicFloatingField label="Sex">
          <select value={form.sex} onChange={(event) => updateField('sex', event.target.value)} data-has-value="true">
            <option value="Female">Female</option>
            <option value="Male">Male</option>
          </select>
        </ClinicFloatingField>

        <ClinicFloatingField label="Age">
          <input
            value={form.age}
            data-has-value={form.age ? 'true' : 'false'}
            onChange={(event) => updateField('age', event.target.value.replace(/\D/g, '').slice(0, 3))}
            required
            maxLength={3}
            inputMode="numeric"
            placeholder=" "
          />
        </ClinicFloatingField>

        <ClinicFloatingField label="Grade and Section">
          <input
            value={form.gradeSection}
            data-has-value={form.gradeSection ? 'true' : 'false'}
            onChange={(event) => updateField('gradeSection', event.target.value)}
            required
            maxLength={100}
            placeholder=" "
          />
        </ClinicFloatingField>

        <ClinicFloatingField label="Referred By">
          <input
            value={form.referredBy}
            data-has-value={form.referredBy ? 'true' : 'false'}
            onChange={(event) => updateField('referredBy', event.target.value)}
            required
            maxLength={100}
            placeholder=" "
          />
        </ClinicFloatingField>

        <ClinicFloatingField label="Chief Complaint / Primary Concern" className="clinic-grid-form__full">
          <input
            value={form.concern}
            data-has-value={form.concern ? 'true' : 'false'}
            onChange={(event) => updateField('concern', event.target.value)}
            required
            maxLength={180}
            placeholder=" "
          />
        </ClinicFloatingField>

        <div className="clinic-form-actions clinic-grid-form__full">
          <button className="primary-button" type="submit">Add to Queue</button>
        </div>
      </form>
    </article>
  );
}
