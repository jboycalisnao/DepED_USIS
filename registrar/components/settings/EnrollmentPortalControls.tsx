import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import ConfirmationModal from '../ConfirmationModal';

type PortalSchedule = {
  id: number;
  enabled: boolean;
  use_date_range: boolean;
  start_date: string | null;
  end_date: string | null;
  updated_at?: string;
};

const DEFAULT_SCHEDULE: PortalSchedule = { id: 1, enabled: true, use_date_range: false, start_date: null, end_date: null };

function ToggleSwitch({ checked, disabled = false, onClick, ariaLabel }: { checked: boolean; disabled?: boolean; onClick: () => void; ariaLabel: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`settings-enrollment-controls__toggle ${checked ? 'is-on' : ''}`} aria-label={ariaLabel} aria-pressed={checked}>
      <span className="settings-enrollment-controls__toggle-knob" />
    </button>
  );
}

const EnrollmentPortalControls: React.FC = () => {
  const [schedule, setSchedule] = useState<PortalSchedule>(DEFAULT_SCHEDULE);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const loadSchedule = async () => {
      setIsLoading(true);
      setFeedback(null);
      try {
        const { data } = await supabase.from('registrar_enrollment_form_schedule').select('*').eq('id', 1).maybeSingle();
        if (data) {
          setSchedule({
            id: 1,
            enabled: !!(data as any).enabled,
            use_date_range: !!(data as any).use_date_range,
            start_date: ((data as any).start_date as string | null) || null,
            end_date: ((data as any).end_date as string | null) || null,
            updated_at: (data as any).updated_at || undefined,
          });
          return;
        }
        setSchedule(DEFAULT_SCHEDULE);
      } catch {
        setSchedule(DEFAULT_SCHEDULE);
      } finally {
        setIsLoading(false);
      }
    };
    loadSchedule();
  }, []);

  const saveSchedule = async (next: PortalSchedule, successMessage: string) => {
    setIsLoading(true);
    setFeedback(null);
    try {
      if (next.use_date_range && next.start_date && next.end_date && next.start_date > next.end_date) {
        setFeedback('Start date must be earlier than or equal to end date.');
        return;
      }

      const payload = { id: 1, enabled: next.enabled, use_date_range: next.use_date_range, start_date: next.start_date || null, end_date: next.end_date || null, updated_at: new Date().toISOString() };
      const { error } = await supabase.from('registrar_enrollment_form_schedule').upsert(payload, { onConflict: 'id' });
      if (error) throw error;

      setSchedule(next);
      setFeedback(successMessage);
    } catch (error: any) {
      const rawMessage = String(error?.message || '');
      if (rawMessage.toLowerCase().includes('row-level security')) setFeedback('Save blocked by database policy (RLS).');
      else setFeedback(rawMessage || 'Unable to update enrollment portal schedule.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="settings-enrollment-controls">
      <header>
        <h4>Enrollment Portal Control</h4>
        <p>Toggle and schedule public enrollment form availability.</p>
      </header>

      <div className="settings-enrollment-controls__card">
        <div className="settings-enrollment-controls__row">
          <div>
            <p>Enrollment Form Status</p>
            <strong>{schedule.enabled ? 'Enabled (ON)' : 'Disabled (OFF)'}</strong>
          </div>
          <ToggleSwitch checked={schedule.enabled} disabled={isLoading} onClick={() => saveSchedule({ ...schedule, enabled: !schedule.enabled }, `Enrollment Portal form is now ${!schedule.enabled ? 'ON' : 'OFF'}.`)} ariaLabel="Toggle enrollment form" />
        </div>

        <div className="settings-enrollment-controls__row">
          <div>
            <p>Use Exact Date Range</p>
            <small>Only allow form access within the configured start and end dates.</small>
          </div>
          <ToggleSwitch checked={schedule.use_date_range} disabled={isLoading} onClick={() => saveSchedule({ ...schedule, use_date_range: !schedule.use_date_range }, `Date-range control is now ${!schedule.use_date_range ? 'enabled' : 'disabled'}.`)} ariaLabel="Toggle date range control" />
        </div>

        <div className="settings-enrollment-controls__dates">
          <label className="floating-field"><div className="floating-field__control"><input type="date" value={schedule.start_date || ''} onChange={(event) => setSchedule((c) => ({ ...c, start_date: event.target.value || null }))} placeholder=" " disabled={!schedule.use_date_range || isLoading} /><span>Start Date</span></div></label>
          <label className="floating-field"><div className="floating-field__control"><input type="date" value={schedule.end_date || ''} onChange={(event) => setSchedule((c) => ({ ...c, end_date: event.target.value || null }))} placeholder=" " disabled={!schedule.use_date_range || isLoading} /><span>End Date</span></div></label>
        </div>

        <div className="settings-enrollment-controls__actions">
          <button type="button" className="primary-button" disabled={isLoading} onClick={() => saveSchedule(schedule, 'Enrollment Portal date range saved.')}>Save Date Range</button>
        </div>
      </div>

      {feedback ? (
        <ConfirmationModal
          isOpen={!!feedback}
          title="Portal Setting"
          message={feedback}
          type={feedback.toLowerCase().includes('blocked') || feedback.toLowerCase().includes('unable') ? 'danger' : 'primary'}
          confirmLabel="Close"
          hideCancel
          onConfirm={() => setFeedback(null)}
        />
      ) : null}
    </section>
  );
};

export default EnrollmentPortalControls;
