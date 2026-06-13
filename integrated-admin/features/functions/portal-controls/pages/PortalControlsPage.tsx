import { useEffect, useMemo, useState } from 'react';
import UsisPageLoader from '../../../../../common/components/UsisPageLoader';
import { UsisAlertModal } from '../../../../../common/components/UsisAlertModal';
import { PortalControlFormModal } from '../components/PortalControlFormModal';
import { PortalControlPreviewModal } from '../components/PortalControlPreviewModal';
import {
  loadPortalControls,
  savePortalControl,
  type PortalControlRecord,
  type PortalMessageSource,
  type PortalStatusMode,
} from '../services/portalControlsService';

type PortalControlsPageProps = {
  moduleKeyFilter?: string;
};

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

export function PortalControlsPage({ moduleKeyFilter }: PortalControlsPageProps) {
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

  const filteredRecords = useMemo(() => {
    if (!moduleKeyFilter) return records;
    return records.filter((item) => item.moduleKey === moduleKeyFilter);
  }, [moduleKeyFilter, records]);

  const selectedRecord = useMemo(
    () => filteredRecords.find((item) => item.id === selectedModuleId) || null,
    [filteredRecords, selectedModuleId],
  );

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const next = await loadPortalControls();
        setRecords(next);
      } catch (error: any) {
        setAlert({ title: 'Load Failed', message: error?.message || 'Unable to load portal controls.', tone: 'danger' });
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  useEffect(() => {
    if (filteredRecords.length === 0) {
      setSelectedModuleId('');
      return;
    }
    if (!filteredRecords.some((item) => item.id === selectedModuleId)) {
      setSelectedModuleId(filteredRecords[0].id);
    }
  }, [filteredRecords, selectedModuleId]);

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

  const pageTitle = moduleKeyFilter === 'election' ? 'Election Portal Controls' : 'Portal Controls';

  return (
    <section className="section-shell integrated-admin-function">
      <div className="integrated-admin-function__header">
        <h2>{pageTitle}</h2>
      </div>
      <article className="section-card ia-portal-controls">
        <div className="section-card__bar" />
        <div className="section-card__content">
          {moduleKeyFilter ? (
            <div className="ia-portal-controls__single-module">
              <p className="section-card__eyebrow">Module Scope</p>
              <h3 className="mt-2">{selectedRecord?.moduleLabel || 'Election'}</h3>
              <p className="registry-copy">Manage the election portal gate and modal behavior from Integrated Admin.</p>
            </div>
          ) : (
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
          )}

          <div className="ia-portal-controls__actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                if (!selectedModuleId && filteredRecords[0]) setSelectedModuleId(filteredRecords[0].id);
                setIsFormModalOpen(true);
              }}
              disabled={filteredRecords.length === 0}
            >
              Configure Portal Control
            </button>
          </div>
        </div>
      </article>

      <PortalControlFormModal
        bodyText={bodyText}
        iconName={iconName}
        iconOptions={ICON_SELECT_OPTIONS}
        isEnabled={isEnabled}
        isOpen={isFormModalOpen}
        isSaving={Boolean(savingId)}
        messageSource={messageSource}
        mode={mode}
        moduleOptions={MODULE_OPTIONS(filteredRecords)}
        onApplyPreset={applyPreset}
        onBodyTextChange={setBodyText}
        onClose={() => setIsFormModalOpen(false)}
        onIconChange={setIconName}
        onIsEnabledChange={setIsEnabled}
        onMessageSourceChange={setMessageSource}
        onModeChange={setMode}
        onModuleChange={setSelectedModuleId}
        onPreview={() => setIsPreviewOpen(true)}
        onSave={() => void handleSave()}
        onTitleTextChange={setTitleText}
        presetKey={presetKey}
        presetOptions={PRESET_OPTIONS}
        selectedModuleId={selectedModuleId}
        titleText={titleText}
      />

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
