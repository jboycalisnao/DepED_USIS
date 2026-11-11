import type { SccOfficerRecipient, SccSmtpStatus } from '../types';
import type { RecipientPresetMode } from '../hooks/useOfficerRecipients';

type OfficerNotificationBoxProps = {
  title?: string;
  smtpStatus: SccSmtpStatus | null;
  recipients: SccOfficerRecipient[];
  allOfficersCount: number;
  selectedEmails: string[];
  presetMode: RecipientPresetMode;
  includeAdviser: boolean;
  adviserEmail?: string;
  manualEmail: string;
  notifyEnabled: boolean;
  isLoading: boolean;
  onToggleNotify: (checked: boolean) => void;
  onApplyPreset: (mode: Exclude<RecipientPresetMode, 'custom'>) => void;
  onToggleEmail: (email: string) => void;
  onToggleAdviser: (checked: boolean) => void;
  onManualEmailChange: (value: string) => void;
};

export function OfficerNotificationBox({
  title = 'Notify registered officers via Google SMTP',
  smtpStatus,
  recipients,
  allOfficersCount,
  selectedEmails,
  presetMode,
  includeAdviser,
  adviserEmail,
  manualEmail,
  notifyEnabled,
  isLoading,
  onToggleNotify,
  onApplyPreset,
  onToggleEmail,
  onToggleAdviser,
  onManualEmailChange,
}: OfficerNotificationBoxProps) {
  const smtpReady = smtpStatus?.configured ?? false;
  const presidentCount = recipients.filter((r) => r.isPresident).length;
  const signatoryCount = recipients.filter((r) => r.isAuthorizedSignatory).length;

  return (
    <div className="ia-scc-notify-box">
      <label className="ia-scc-checkbox-row ia-scc-notify-box__toggle">
        <input
          type="checkbox"
          checked={notifyEnabled}
          disabled={!smtpReady || isLoading}
          onChange={(e) => onToggleNotify(e.target.checked)}
        />
        <span>{title}</span>
      </label>

      {isLoading ? (
        <p className="ia-scc-notify-box__hint">
          Checking Google SMTP status and registered officer emails...
        </p>
      ) : !smtpReady ? (
        <p className="ia-scc-notify-box__hint ia-scc-notify-box__hint--warn">
          Google SMTP is not configured on the server
          {smtpStatus?.missing?.length
            ? ` (missing: ${smtpStatus.missing.join(', ')})`
            : '.'}
        </p>
      ) : (
        <p className="ia-scc-notify-box__hint">
          Sender: <code>{smtpStatus?.from}</code> via <code>{smtpStatus?.host}:{smtpStatus?.port}</code>
        </p>
      )}

      {notifyEnabled && smtpReady ? (
        <div className="ia-scc-notify-box__panel">
          {recipients.length > 0 ? (
            <>
              <div className="ia-scc-notify-box__presets">
                <button
                  type="button"
                  className={`ia-scc-chip-btn ${presetMode === 'president' ? 'is-active' : ''}`}
                  onClick={() => onApplyPreset('president')}
                >
                  {presidentCount > 0 ? `President (${presidentCount})` : 'Top Officer'}
                </button>
                <button
                  type="button"
                  className={`ia-scc-chip-btn ${presetMode === 'signatories' ? 'is-active' : ''}`}
                  onClick={() => onApplyPreset('signatories')}
                >
                  Signatories ({signatoryCount || recipients.length})
                </button>
                <button
                  type="button"
                  className={`ia-scc-chip-btn ${presetMode === 'all' ? 'is-active' : ''}`}
                  onClick={() => onApplyPreset('all')}
                >
                  All Registered Officers ({recipients.length})
                </button>
              </div>

              <div className="ia-scc-notify-box__recipients">
                {recipients.map((rec) => {
                  const checked = selectedEmails.includes(rec.email);
                  return (
                    <label
                      key={rec.id}
                      className={`ia-scc-recipient-pill ${checked ? 'is-selected' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggleEmail(rec.email)}
                      />
                      <span>
                        <strong>{rec.position}:</strong> {rec.fullName} (<code>{rec.email}</code>)
                      </span>
                    </label>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="ia-scc-notify-box__hint ia-scc-notify-box__hint--warn">
              {allOfficersCount > 0
                ? `${allOfficersCount} registered officer(s) found, but none have an email address on record yet.`
                : 'No registered officers found for this organization yet.'}{' '}
              Enter an officer/president email below to send directly:
            </p>
          )}

          {adviserEmail ? (
            <label className="ia-scc-notify-box__cc">
              <input
                type="checkbox"
                checked={includeAdviser}
                onChange={(e) => onToggleAdviser(e.target.checked)}
              />
              <span>
                CC Teacher Adviser (<code>{adviserEmail}</code>)
              </span>
            </label>
          ) : null}

          <label className="floating-field">
            <input
              type="text"
              placeholder=" "
              value={manualEmail}
              onChange={(e) => onManualEmailChange(e.target.value)}
            />
            <span>Additional Officer / President Email (Optional, comma-separated)</span>
          </label>
        </div>
      ) : null}
    </div>
  );
}
