import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../store';
import ConfirmationModal from '../ConfirmationModal';
import { SearchableSelect } from '../ui/SearchableSelect';

type EnrollmentModuleSettings = {
  id: number;
  use_manual_school_year_override: boolean;
  manual_school_year_id: string;
};

const DEFAULT_SETTINGS: EnrollmentModuleSettings = {
  id: 1,
  use_manual_school_year_override: false,
  manual_school_year_id: '',
};

function ToggleSwitch({ checked, disabled = false, onClick, ariaLabel }: { checked: boolean; disabled?: boolean; onClick: () => void; ariaLabel: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`settings-enrollment-controls__toggle ${checked ? 'is-on' : ''}`}
      aria-label={ariaLabel}
      aria-pressed={checked}
    >
      <span className="settings-enrollment-controls__toggle-knob" />
    </button>
  );
}

const EnrollmentSchoolYearSettings: React.FC = () => {
  const { schoolYears, activeSchoolYear } = useStore();
  const [settings, setSettings] = useState<EnrollmentModuleSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsLoading(true);
      setFeedback(null);
      try {
        const { data, error } = await supabase
          .from('registrar_enrollment_module_settings')
          .select('id,use_manual_school_year_override,manual_school_year_id')
          .eq('id', 1)
          .maybeSingle();
        if (error) throw error;
        if (!active || !data) {
          if (active) setSettings(DEFAULT_SETTINGS);
          return;
        }
        setSettings({
          id: 1,
          use_manual_school_year_override: !!(data as any).use_manual_school_year_override,
          manual_school_year_id: String((data as any).manual_school_year_id || '').trim(),
        });
      } catch {
        if (active) setSettings(DEFAULT_SETTINGS);
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const selectedManualSchoolYear = useMemo(
    () => schoolYears.find((schoolYear) => schoolYear.id === settings.manual_school_year_id) || null,
    [schoolYears, settings.manual_school_year_id],
  );
  const schoolYearOptions = useMemo(
    () =>
      [...schoolYears]
        .sort((a, b) => b.label.localeCompare(a.label))
        .map((schoolYear) => ({ value: schoolYear.id, label: schoolYear.label })),
    [schoolYears],
  );

  const effectiveSchoolYearLabel = settings.use_manual_school_year_override
    ? selectedManualSchoolYear?.label || activeSchoolYear.label
    : activeSchoolYear.label;

  const save = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      if (settings.use_manual_school_year_override && !settings.manual_school_year_id) {
        setFeedback('Select the school year to use for the enrollment module override.');
        return;
      }

      const payload = {
        id: 1,
        use_manual_school_year_override: settings.use_manual_school_year_override,
        manual_school_year_id: settings.use_manual_school_year_override ? settings.manual_school_year_id : null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('registrar_enrollment_module_settings')
        .upsert(payload, { onConflict: 'id' });
      if (error) throw error;

      setFeedback(
        settings.use_manual_school_year_override
          ? `Enrollment module school year override saved to ${selectedManualSchoolYear?.label || effectiveSchoolYearLabel}.`
          : 'Enrollment module now follows the registrar active school year.',
      );
    } catch (error: any) {
      const message = String(error?.message || 'Unable to save enrollment module school year settings.');
      setFeedback(message.toLowerCase().includes('row-level security') ? 'Save blocked by database policy (RLS).' : message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="settings-enrollment-controls">
      <header>
        <h4>Enrollment Module School Year</h4>
        <p>Choose whether enrollment follows the registrar active cycle or uses a manual school-year override.</p>
      </header>

      <div className="settings-enrollment-controls__card">
        <div className="settings-enrollment-controls__row">
          <div>
            <p>Effective Enrollment School Year</p>
            <strong>{effectiveSchoolYearLabel || '--'}</strong>
            <small>{settings.use_manual_school_year_override ? 'Manual override is active.' : 'Following registrar active cycle.'}</small>
          </div>
        </div>

        <div className="settings-enrollment-controls__row">
          <div>
            <p>Use Manual Override</p>
            <small>Turn this on to let enrollment use a different school year than registrar.</small>
          </div>
          <ToggleSwitch
            checked={settings.use_manual_school_year_override}
            disabled={isLoading}
            onClick={() =>
              setSettings((current) => ({
                ...current,
                use_manual_school_year_override: !current.use_manual_school_year_override,
              }))
            }
            ariaLabel="Toggle enrollment module school year override"
          />
        </div>

        <div className="settings-enrollment-controls__dates settings-enrollment-controls__dates--single">
          <SearchableSelect
            label="Manual Enrollment School Year"
            placeholder="Select school year"
            floatingLabel
            showLabel={false}
            value={settings.manual_school_year_id}
            onChange={(value) => setSettings((current) => ({ ...current, manual_school_year_id: value }))}
            disabled={!settings.use_manual_school_year_override || isLoading}
            options={schoolYearOptions}
          />
        </div>

        <div className="settings-enrollment-controls__actions">
          <button type="button" className="primary-button" disabled={isLoading} onClick={() => void save()}>
            {isLoading ? 'Saving...' : 'Save Enrollment School Year'}
          </button>
        </div>
      </div>

      {feedback ? (
        <ConfirmationModal
          isOpen={!!feedback}
          title="Enrollment School Year"
          message={feedback}
          type={feedback.toLowerCase().includes('unable') || feedback.toLowerCase().includes('blocked') ? 'danger' : 'primary'}
          confirmLabel="Close"
          hideCancel
          onConfirm={() => setFeedback(null)}
        />
      ) : null}
    </section>
  );
};

export default EnrollmentSchoolYearSettings;
