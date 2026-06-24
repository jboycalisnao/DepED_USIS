import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../store';
import ConfirmationModal from '../ConfirmationModal';

type EnrollmentEmailSettingsState = {
  school_id: string;
  is_enabled: boolean;
  apps_script_web_app_url: string;
  apps_script_bearer_token: string;
  status_page_base_url: string;
  from_display_name: string;
  reply_to_email: string;
};

const DEFAULT_STATUS_PAGE_URL = 'https://enroll.leonnhs.edu.ph/submission-status';
const DEFAULT_SENDER_DISPLAY_NAME = 'Leon NHS - USIS';

const emptyState = (schoolId: string): EnrollmentEmailSettingsState => ({
  school_id: schoolId,
  is_enabled: false,
  apps_script_web_app_url: '',
  apps_script_bearer_token: '',
  status_page_base_url: DEFAULT_STATUS_PAGE_URL,
  from_display_name: DEFAULT_SENDER_DISPLAY_NAME,
  reply_to_email: '',
});

const EnrollmentEmailSettings: React.FC = () => {
  const { registrarAccess } = useStore();
  const schoolId = String(registrarAccess?.schoolId || '302522').trim();
  const [state, setState] = useState<EnrollmentEmailSettingsState>(() => emptyState(schoolId));
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loadedFromSchoolId, setLoadedFromSchoolId] = useState<string>('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('registrar_enrollment_email_settings')
          .select('*')
          .eq('school_id', schoolId)
          .maybeSingle();
        if (error) throw error;
        if (!active) return;
        let resolved = data as any;
        if (!resolved) {
          // Fallback for environments where runtime school_id differs from saved row.
          const { data: firstRow } = await supabase
            .from('registrar_enrollment_email_settings')
            .select('*')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          resolved = firstRow as any;
        }
        if (!resolved) {
          setLoadedFromSchoolId('');
          setState(emptyState(schoolId));
          return;
        }
        const sourceSchoolId = String(resolved.school_id || schoolId).trim();
        setLoadedFromSchoolId(sourceSchoolId);
        setState({
          school_id: sourceSchoolId,
          is_enabled: !!resolved.is_enabled,
          apps_script_web_app_url: String(resolved.apps_script_web_app_url || ''),
          apps_script_bearer_token: String(resolved.apps_script_bearer_token || ''),
          status_page_base_url: String(resolved.status_page_base_url || DEFAULT_STATUS_PAGE_URL),
          from_display_name: String(resolved.from_display_name || DEFAULT_SENDER_DISPLAY_NAME),
          reply_to_email: String(resolved.reply_to_email || ''),
        });
      } catch {
        if (!active) return;
        setLoadedFromSchoolId('');
        setState(emptyState(schoolId));
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [schoolId]);

  const save = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const payload = {
        school_id: schoolId,
        is_enabled: state.is_enabled,
        apps_script_web_app_url: state.apps_script_web_app_url.trim() || null,
        apps_script_bearer_token: state.apps_script_bearer_token.trim() || null,
        status_page_base_url: state.status_page_base_url.trim() || DEFAULT_STATUS_PAGE_URL,
        from_display_name: state.from_display_name.trim() || DEFAULT_SENDER_DISPLAY_NAME,
        reply_to_email: state.reply_to_email.trim() || null,
      };
      const { error } = await supabase
        .from('registrar_enrollment_email_settings')
        .upsert(payload, { onConflict: 'school_id' });
      if (error) throw error;
      setFeedback('Enrollment confirmation email settings saved.');
    } catch (error: any) {
      const message = String(error?.message || 'Unable to save enrollment email settings.');
      setFeedback(message.toLowerCase().includes('row-level security') ? 'Save blocked by database policy (RLS).' : message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="settings-enrollment-controls">
      <header>
        <h4>Enrollment Confirmation Email</h4>
        <p>
          Configure Google Apps Script delivery and status lookup link for learner confirmations.
          {loadedFromSchoolId ? ` Loaded config school ID: ${loadedFromSchoolId}.` : ''}
        </p>
      </header>

      <div className="settings-enrollment-controls__card">
        <div className="settings-enrollment-controls__row">
          <div>
            <p>Email Sending Service</p>
            <strong>{state.is_enabled ? 'Enabled (ON)' : 'Disabled (OFF)'}</strong>
          </div>
          <button
            type="button"
            onClick={() => setState((current) => ({ ...current, is_enabled: !current.is_enabled }))}
            disabled={isLoading}
            className={`settings-enrollment-controls__toggle ${state.is_enabled ? 'is-on' : ''}`}
            aria-label="Toggle enrollment email service"
            aria-pressed={state.is_enabled}
          >
            <span className="settings-enrollment-controls__toggle-knob" />
          </button>
        </div>

        <div className="settings-enrollment-controls__dates">
          <label className="floating-field"><div className="floating-field__control"><input value={state.apps_script_web_app_url} onChange={(event) => setState((current) => ({ ...current, apps_script_web_app_url: event.target.value }))} placeholder=" " disabled={isLoading} /><span>Apps Script Web App URL</span></div></label>
          <label className="floating-field"><div className="floating-field__control"><input type="password" value={state.apps_script_bearer_token} onChange={(event) => setState((current) => ({ ...current, apps_script_bearer_token: event.target.value }))} placeholder=" " disabled={isLoading} /><span>Apps Script Bearer Token</span></div></label>
          <label className="floating-field"><div className="floating-field__control"><input value={state.status_page_base_url} onChange={(event) => setState((current) => ({ ...current, status_page_base_url: event.target.value }))} placeholder=" " disabled={isLoading} /><span>Status Page Base URL</span></div></label>
          <label className="floating-field"><div className="floating-field__control"><input value={state.from_display_name} onChange={(event) => setState((current) => ({ ...current, from_display_name: event.target.value }))} placeholder=" " disabled={isLoading} /><span>From Display Name</span></div></label>
          <label className="floating-field"><div className="floating-field__control"><input type="email" value={state.reply_to_email} onChange={(event) => setState((current) => ({ ...current, reply_to_email: event.target.value }))} placeholder=" " disabled={isLoading} /><span>Reply-To Email (Optional)</span></div></label>
        </div>

        <div className="settings-enrollment-controls__actions">
          <button type="button" className="primary-button" disabled={isLoading} onClick={() => void save()}>
            {isLoading ? 'Saving...' : 'Save Email Settings'}
          </button>
        </div>
      </div>

      {feedback ? (
        <ConfirmationModal
          isOpen={!!feedback}
          title="Enrollment Email Settings"
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

export default EnrollmentEmailSettings;
