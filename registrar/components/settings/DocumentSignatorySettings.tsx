import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../store';
import {
  DEFAULT_REGISTRAR_SIGNATORIES,
  fetchRegistrarSignatories,
  normalizeRegistrarSignatories,
  type RegistrarDocumentSignatories,
} from '../../features/registrar/shared/signatorySettings';
import ConfirmationModal from '../ConfirmationModal';

const emptyState = (schoolId: string): RegistrarDocumentSignatories => ({
  ...DEFAULT_REGISTRAR_SIGNATORIES,
  school_id: schoolId,
});

const DocumentSignatorySettings: React.FC = () => {
  const { registrarAccess } = useStore();
  const schoolId = String(registrarAccess?.schoolId || DEFAULT_REGISTRAR_SIGNATORIES.school_id).trim();
  const [settings, setSettings] = useState<RegistrarDocumentSignatories>(() => emptyState(schoolId));
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsLoading(true);
      setFeedback(null);
      try {
        const nextSettings = await fetchRegistrarSignatories(schoolId);
        if (active) setSettings(nextSettings);
      } catch {
        if (active) setSettings(emptyState(schoolId));
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
        registrar_name: settings.registrar_name.trim() || DEFAULT_REGISTRAR_SIGNATORIES.registrar_name,
        registrar_position: settings.registrar_position.trim() || DEFAULT_REGISTRAR_SIGNATORIES.registrar_position,
        principal_name: settings.principal_name.trim() || DEFAULT_REGISTRAR_SIGNATORIES.principal_name,
        principal_position: settings.principal_position.trim() || DEFAULT_REGISTRAR_SIGNATORIES.principal_position,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('registrar_document_signatories')
        .upsert(payload, { onConflict: 'school_id' });
      if (error) throw error;
      setSettings(normalizeRegistrarSignatories(payload, schoolId));
      setFeedback('Document signatory names saved.');
    } catch (error: any) {
      const message = String(error?.message || 'Unable to save document signatory settings.');
      setFeedback(message.toLowerCase().includes('row-level security') ? 'Save blocked by database policy (RLS).' : message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="settings-enrollment-controls">
      <header>
        <h4>Document Signatories</h4>
        <p>Set the official registrar and school principal names used by registrar documents.</p>
      </header>

      <div className="settings-enrollment-controls__card">
        <div className="settings-enrollment-controls__dates settings-enrollment-controls__dates--single">
          <label className="floating-field">
            <div className="floating-field__control" data-has-value={settings.registrar_name.trim() ? 'true' : 'false'}>
              <input
                value={settings.registrar_name}
                onChange={(event) => setSettings((current) => ({ ...current, registrar_name: event.target.value }))}
                placeholder=" "
                disabled={isLoading}
              />
              <span>Registrar Name</span>
            </div>
          </label>

          <label className="floating-field">
            <div className="floating-field__control" data-has-value={settings.registrar_position.trim() ? 'true' : 'false'}>
              <input
                value={settings.registrar_position}
                onChange={(event) => setSettings((current) => ({ ...current, registrar_position: event.target.value }))}
                placeholder=" "
                disabled={isLoading}
              />
              <span>Registrar Position</span>
            </div>
          </label>

          <label className="floating-field">
            <div className="floating-field__control" data-has-value={settings.principal_name.trim() ? 'true' : 'false'}>
              <input
                value={settings.principal_name}
                onChange={(event) => setSettings((current) => ({ ...current, principal_name: event.target.value }))}
                placeholder=" "
                disabled={isLoading}
              />
              <span>School Principal Name</span>
            </div>
          </label>

          <label className="floating-field">
            <div className="floating-field__control" data-has-value={settings.principal_position.trim() ? 'true' : 'false'}>
              <input
                value={settings.principal_position}
                onChange={(event) => setSettings((current) => ({ ...current, principal_position: event.target.value }))}
                placeholder=" "
                disabled={isLoading}
              />
              <span>School Principal Position</span>
            </div>
          </label>
        </div>

        <div className="settings-enrollment-controls__actions">
          <button type="button" className="primary-button" disabled={isLoading} onClick={() => void save()}>
            {isLoading ? 'Saving...' : 'Save Signatories'}
          </button>
        </div>
      </div>

      {feedback ? (
        <ConfirmationModal
          isOpen={!!feedback}
          title="Document Signatories"
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

export default DocumentSignatorySettings;
