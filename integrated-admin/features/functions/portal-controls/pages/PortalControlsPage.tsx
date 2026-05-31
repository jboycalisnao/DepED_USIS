import { useEffect, useMemo, useState } from 'react';
import UsisPageLoader from '../../../../../common/components/UsisPageLoader';
import { UsisAlertModal } from '../../../../../common/components/UsisAlertModal';
import { UsisSearchableSelect } from '../../../../../common/components/ui/UsisSearchableSelect';
import { PortalControlPreviewModal } from '../components/PortalControlPreviewModal';
import {
  loadPortalControls,
  savePortalControl,
  type PortalControlRecord,
  type PortalMessageSource,
  type PortalStatusMode,
} from '../services/portalControlsService';

const PRESETS: Record<
  string,
  { mode: PortalStatusMode; iconName: string; titleText: string; bodyText: string }
> = {
  maintenance_default: {
    mode: 'maintenance',
    iconName: 'construction',
    titleText: 'Portal Under Maintenance',
    bodyText: 'This module is currently under maintenance. Please check back shortly.',
  },
  opening_soon_default: {
    mode: 'soon_open',
    iconName: 'schedule',
    titleText: 'Portal Opening Soon',
    bodyText: 'This module will open soon. Please wait for the official advisory.',
  },
};

const ICON_OPTIONS = ['construction', 'schedule', 'info', 'campaign', 'warning', 'build'];
const MODULE_OPTIONS = (records: PortalControlRecord[]) =>
  records.map((record) => ({ label: record.moduleLabel, value: record.id }));
const PRESET_OPTIONS = [
  { label: 'Maintenance Default', value: 'maintenance_default' },
  { label: 'Opening Soon Default', value: 'opening_soon_default' },
];
const ICON_SELECT_OPTIONS = ICON_OPTIONS.map((iconName) => ({ label: iconName, value: iconName }));

export function PortalControlsPage() {
  const [records, setRecords] = useState<PortalControlRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [mode, setMode] = useState<PortalStatusMode>('maintenance');
  const [isEnabled, setIsEnabled] = useState(false);
  const [messageSource, setMessageSource] = useState<PortalMessageSource>('preset');
  const [presetKey, setPresetKey] = useState<string>('maintenance_default');
  const [iconName, setIconName] = useState('construction');
  const [titleText, setTitleText] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [alert, setAlert] = useState<{ title: string; message: string; tone: 'success' | 'danger' } | null>(null);

  const selectedRecord = useMemo(
    () => records.find((item) => item.id === selectedModuleId) || null,
    [records, selectedModuleId],
  );

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const next = await loadPortalControls();
        setRecords(next);
        if (next.length > 0) {
          setSelectedModuleId(next[0].id);
        }
      } catch (error: any) {
        setAlert({ title: 'Load Failed', message: error?.message || 'Unable to load portal controls.', tone: 'danger' });
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  useEffect(() => {
    if (!selectedRecord) return;
    setMode(selectedRecord.mode);
    setIsEnabled(selectedRecord.isEnabled);
    setMessageSource(selectedRecord.messageSource);
    setPresetKey(selectedRecord.presetKey || 'maintenance_default');
    setIconName(selectedRecord.iconName || 'construction');
    setTitleText(selectedRecord.titleText || '');
    setBodyText(selectedRecord.bodyText || '');
  }, [selectedRecord]);

  const applyPreset = (key: string) => {
    const preset = PRESETS[key];
    if (!preset) return;
    setPresetKey(key);
    setMode(preset.mode);
    setIconName(preset.iconName);
    setTitleText(preset.titleText);
    setBodyText(preset.bodyText);
  };

  const handleSave = async () => {
    if (!selectedRecord) return;
    setSavingId(selectedRecord.id);
    try {
      await savePortalControl({
        id: selectedRecord.id,
        isEnabled,
        mode,
        messageSource,
        presetKey: messageSource === 'preset' ? presetKey : null,
        iconName,
        titleText: titleText.trim(),
        bodyText: bodyText.trim(),
      });
      const next = await loadPortalControls();
      setRecords(next);
      setAlert({ title: 'Saved', message: 'Portal control settings updated.', tone: 'success' });
    } catch (error: any) {
      setAlert({ title: 'Save Failed', message: error?.message || 'Unable to save portal controls.', tone: 'danger' });
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <UsisPageLoader message="Loading portal controls..." />;

  return (
    <section className="section-shell integrated-admin-function">
      <div className="integrated-admin-function__header">
        <h2>Portal Controls</h2>
      </div>
      <article className="section-card ia-portal-controls">
        <div className="section-card__bar" />
        <div className="section-card__content ia-portal-controls__content">
          <div className="registry-table-wrap">
            <table className="registry-table">
              <thead>
                <tr>
                  <th>Module / Portal</th>
                  <th>Status</th>
                  <th>Modal Type</th>
                  <th>Message Source</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td>{record.moduleLabel}</td>
                    <td>
                      <span className={`ia-status-tag ${record.isEnabled && record.mode !== 'live' ? 'ia-status-tag--danger' : 'ia-status-tag--success'}`}>
                        {record.isEnabled && record.mode !== 'live' ? 'Gated' : 'Live'}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`ia-status-tag ${
                          record.mode === 'maintenance'
                            ? 'ia-status-tag--warning'
                            : record.mode === 'soon_open'
                              ? 'ia-status-tag--info'
                              : 'ia-status-tag--neutral'
                        }`}
                      >
                        {record.mode === 'maintenance' ? 'Maintenance' : record.mode === 'soon_open' ? 'Soon to Open' : 'None'}
                      </span>
                    </td>
                    <td>
                      <span className={`ia-status-tag ${record.messageSource === 'preset' ? 'ia-status-tag--indigo' : 'ia-status-tag--violet'}`}>
                        {record.messageSource === 'preset' ? 'Preset' : 'Custom'}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="registry-icon-btn registry-icon-btn--primary"
                        title="Configure"
                        aria-label={`Configure ${record.moduleLabel}`}
                        onClick={() => {
                          setSelectedModuleId(record.id);
                          setIsFormModalOpen(true);
                        }}
                      >
                        <span className="material-symbols-outlined" aria-hidden="true">edit</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ia-portal-controls__actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                if (!selectedModuleId && records[0]) setSelectedModuleId(records[0].id);
                setIsFormModalOpen(true);
              }}
            >
              Configure Portal Control
            </button>
          </div>
        </div>
      </article>

      {isFormModalOpen ? (
        <div className="modal-overlay modal-overlay--high" role="presentation">
          <div className="modal-backdrop" onClick={() => setIsFormModalOpen(false)} />
          <div className="modal-dialog modal-dialog--wide ia-portal-controls-form-modal" role="dialog" aria-modal="true" aria-label="Portal control form">
            <div className="modal-dialog__header">
              <div className="modal-dialog__title-group">
                <p className="modal-dialog__eyebrow">Portal Controls</p>
                <h3>Configure Portal Status Modal</h3>
              </div>
              <button type="button" className="modal-dialog__close" onClick={() => setIsFormModalOpen(false)} aria-label="Close">
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </div>
            <form
              className="modal-dialog__body ia-portal-controls__content registry-form"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSave();
              }}
            >
              <label className="floating-field">
                <UsisSearchableSelect
                  ariaLabel="Module / Portal"
                  allowTyping={false}
                  floatingLabel
                  label="Module / Portal"
                  onChange={setSelectedModuleId}
                  options={MODULE_OPTIONS(records)}
                  value={selectedModuleId}
                />
              </label>

              <div className="registry-radio-group">
                <label className="registry-radio-option registry-radio-option--toggle">
                  <input type="checkbox" checked={isEnabled} onChange={(event) => setIsEnabled(event.target.checked)} />
                  <span>Enable gate modal for selected module</span>
                </label>
              </div>

              <div className="registry-radio-group">
                <label className="registry-radio-option">
                  <input type="radio" name="portal-mode" checked={mode === 'maintenance'} onChange={() => setMode('maintenance')} />
                  <span>Maintenance</span>
                </label>
                <label className="registry-radio-option">
                  <input type="radio" name="portal-mode" checked={mode === 'soon_open'} onChange={() => setMode('soon_open')} />
                  <span>Soon to Open</span>
                </label>
                <label className="registry-radio-option">
                  <input type="radio" name="portal-mode" checked={mode === 'live'} onChange={() => setMode('live')} />
                  <span>Live (No Gate)</span>
                </label>
              </div>

              <div className="registry-radio-group">
                <label className="registry-radio-option">
                  <input
                    type="radio"
                    name="message-source"
                    checked={messageSource === 'preset'}
                    onChange={() => setMessageSource('preset')}
                  />
                  <span>Use preset text</span>
                </label>
                <label className="registry-radio-option">
                  <input
                    type="radio"
                    name="message-source"
                    checked={messageSource === 'custom'}
                    onChange={() => setMessageSource('custom')}
                  />
                  <span>Use custom text</span>
                </label>
              </div>

              {messageSource === 'preset' ? (
                <label className="floating-field">
                  <UsisSearchableSelect
                    ariaLabel="Preset Message"
                    allowTyping={false}
                    floatingLabel
                    label="Preset Message"
                    onChange={applyPreset}
                    options={PRESET_OPTIONS}
                    value={presetKey}
                  />
                </label>
              ) : null}

              <div className="ia-portal-controls__grid">
                <label className="floating-field">
                  <UsisSearchableSelect
                    ariaLabel="Icon Name"
                    allowTyping={false}
                    floatingLabel
                    label="Icon Name"
                    onChange={setIconName}
                    options={ICON_SELECT_OPTIONS}
                    value={iconName}
                  />
                </label>
                <label className="floating-field">
                  <div className="floating-field__control">
                    <input value={titleText} onChange={(event) => setTitleText(event.target.value)} placeholder=" " />
                    <span>Title Text</span>
                  </div>
                </label>
              </div>

              <label className="floating-field">
                <div className="floating-field__control">
                  <textarea value={bodyText} onChange={(event) => setBodyText(event.target.value)} placeholder=" " rows={3} />
                  <span>Body Text</span>
                </div>
              </label>

              <div className="modal-dialog__actions">
                <button type="button" onClick={() => setIsPreviewOpen(true)}>
                  Preview Modal
                </button>
                <button
                  type="submit"
                  className="modal-dialog__blue"
                  disabled={Boolean(savingId)}
                >
                  {savingId ? 'Saving...' : 'Save Portal Control'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <PortalControlPreviewModal
        open={isPreviewOpen && isEnabled && mode !== 'live'}
        iconName={iconName}
        titleText={titleText}
        bodyText={bodyText}
        onClose={() => setIsPreviewOpen(false)}
      />

      <UsisAlertModal
        open={Boolean(isPreviewOpen && (!isEnabled || mode === 'live'))}
        title="Preview Not Available"
        message="Enable portal gate and choose Maintenance or Soon to Open to preview the modal."
        tone="info"
        onClose={() => setIsPreviewOpen(false)}
      />

      <UsisAlertModal
        open={Boolean(alert)}
        title={alert?.title || 'Notice'}
        message={alert?.message || ''}
        tone={alert?.tone || 'info'}
        onClose={() => setAlert(null)}
      />
    </section>
  );
}
