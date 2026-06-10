import { UsisSearchableSelect } from '../../../../../common/components/ui/UsisSearchableSelect';
import type { PortalMessageSource, PortalStatusMode } from '../services/portalControlsService';

type PortalControlRecordOption = { label: string; value: string };

type Props = {
  bodyText: string;
  iconName: string;
  isEnabled: boolean;
  isOpen: boolean;
  isSaving: boolean;
  messageSource: PortalMessageSource;
  mode: PortalStatusMode;
  onApplyPreset: (key: string) => void;
  onBodyTextChange: (value: string) => void;
  onClose: () => void;
  onIconChange: (value: string) => void;
  onIsEnabledChange: (value: boolean) => void;
  onMessageSourceChange: (value: PortalMessageSource) => void;
  onModeChange: (value: PortalStatusMode) => void;
  onModuleChange: (value: string) => void;
  onPreview: () => void;
  onSave: () => void;
  onTitleTextChange: (value: string) => void;
  presetKey: string;
  presetOptions: PortalControlRecordOption[];
  iconOptions: PortalControlRecordOption[];
  moduleOptions: PortalControlRecordOption[];
  selectedModuleId: string;
  titleText: string;
};

export function PortalControlFormModal({
  bodyText,
  iconName,
  isEnabled,
  isOpen,
  isSaving,
  messageSource,
  mode,
  onApplyPreset,
  onBodyTextChange,
  onClose,
  onIconChange,
  onIsEnabledChange,
  onMessageSourceChange,
  onModeChange,
  onModuleChange,
  onPreview,
  onSave,
  onTitleTextChange,
  presetKey,
  presetOptions,
  iconOptions,
  moduleOptions,
  selectedModuleId,
  titleText,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-dialog modal-dialog--wide" role="dialog" aria-modal="true" aria-label="Portal control form">
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Portal Controls</p>
            <h3>Configure Portal Status Modal</h3>
          </div>
          <button type="button" className="modal-dialog__close" onClick={onClose} aria-label="Close">
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>
        <form
          className="modal-dialog__body registry-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSave();
          }}
        >
          <label className="floating-field">
            <UsisSearchableSelect
              ariaLabel="Module / Portal"
              allowTyping={false}
              floatingLabel
              label="Module / Portal"
              onChange={onModuleChange}
              options={moduleOptions}
              value={selectedModuleId}
            />
          </label>

          <div className="registry-radio-group">
            <label className="registry-radio-option registry-radio-option--toggle">
              <input type="checkbox" checked={isEnabled} onChange={(event) => onIsEnabledChange(event.target.checked)} />
              <span>Enable gate modal for selected module</span>
            </label>
          </div>

          <div className="registry-radio-group">
            <label className="registry-radio-option">
              <input type="radio" name="portal-mode" checked={mode === 'maintenance'} onChange={() => onModeChange('maintenance')} />
              <span>Maintenance</span>
            </label>
            <label className="registry-radio-option">
              <input type="radio" name="portal-mode" checked={mode === 'soon_open'} onChange={() => onModeChange('soon_open')} />
              <span>Soon to Open</span>
            </label>
            <label className="registry-radio-option">
              <input type="radio" name="portal-mode" checked={mode === 'live'} onChange={() => onModeChange('live')} />
              <span>Live (No Gate)</span>
            </label>
          </div>

          <div className="registry-radio-group">
            <label className="registry-radio-option">
              <input type="radio" name="message-source" checked={messageSource === 'preset'} onChange={() => onMessageSourceChange('preset')} />
              <span>Use preset text</span>
            </label>
            <label className="registry-radio-option">
              <input type="radio" name="message-source" checked={messageSource === 'custom'} onChange={() => onMessageSourceChange('custom')} />
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
                onChange={onApplyPreset}
                options={presetOptions}
                value={presetKey}
              />
            </label>
          ) : null}

          <div className="floating-field-grid floating-field-grid--two">
            <label className="floating-field">
              <UsisSearchableSelect
                ariaLabel="Icon Name"
                allowTyping={false}
                floatingLabel
                label="Icon Name"
                onChange={onIconChange}
                options={iconOptions}
                value={iconName}
              />
            </label>
            <label className="floating-field">
              <div className="floating-field__control">
                <input value={titleText} onChange={(event) => onTitleTextChange(event.target.value)} placeholder=" " />
                <span>Title Text</span>
              </div>
            </label>
          </div>

          <label className="floating-field">
            <div className="floating-field__control">
              <textarea value={bodyText} onChange={(event) => onBodyTextChange(event.target.value)} placeholder=" " rows={3} />
              <span>Body Text</span>
            </div>
          </label>

          <div className="modal-dialog__actions">
            <button type="button" onClick={onPreview}>
              Preview Modal
            </button>
            <button type="submit" className="modal-dialog__blue" disabled={Boolean(isSaving)}>
              {isSaving ? 'Saving...' : 'Save Portal Control'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
