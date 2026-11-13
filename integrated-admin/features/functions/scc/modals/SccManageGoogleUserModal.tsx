import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { UsisSearchableSelect } from '../../../../../common/components/ui/UsisSearchableSelect';
import type {
  IaMailboxAvailabilityResult,
  IaSccGoogleUser,
  IaSccOrganization,
} from '../types';
import {
  checkIaMailboxAvailability,
  formatIaDuplicateEmailMessage,
  resetGoogleWorkspaceUserPassword,
  sendOfficerEmailNotification,
  updateGoogleWorkspaceUser,
} from '../services/iaSccService';
import { useOfficerRecipients } from '../hooks/useOfficerRecipients';
import { OfficerNotificationBox } from '../components/OfficerNotificationBox';
import { buildPasswordResetNotificationEmail } from '../utils/sccNotificationTemplates';
import type { SccGoogleAccountSuccessInfo } from './SccGoogleAccountSuccessModal';

export type GoogleUserManageMode = 'modify' | 'reset_password';

type SccManageGoogleUserModalProps = {
  user: IaSccGoogleUser | null;
  mode: GoogleUserManageMode;
  orgUnitPaths: string[];
  organizations?: IaSccOrganization[];
  onClose: () => void;
  onUpdated: (updated: IaSccGoogleUser) => void;
  onPasswordResetSuccess?: (info: SccGoogleAccountSuccessInfo) => void;
};

function getDefaultTempPassword(): string {
  return `Leonnhs.${new Date().getFullYear()}`;
}

function generateStrongPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%';
  const all = upper + lower + digits + symbols;
  let pwd =
    upper[Math.floor(Math.random() * upper.length)] +
    lower[Math.floor(Math.random() * lower.length)] +
    digits[Math.floor(Math.random() * digits.length)] +
    symbols[Math.floor(Math.random() * symbols.length)];
  for (let i = 0; i < 8; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }
  return pwd;
}

export function SccManageGoogleUserModal({
  user,
  mode,
  orgUnitPaths,
  organizations = [],
  onClose,
  onUpdated,
  onPasswordResetSuccess,
}: SccManageGoogleUserModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [emailPrefix, setEmailPrefix] = useState('');
  const [orgUnitSelect, setOrgUnitSelect] = useState('/');
  const [customOu, setCustomOu] = useState('');
  const [suspended, setSuspended] = useState(false);

  const [newPassword, setNewPassword] = useState(getDefaultTempPassword());
  const [changeAtNextLogin, setChangeAtNextLogin] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCheckingRename, setIsCheckingRename] = useState(false);
  const [renameAvailability, setRenameAvailability] = useState<IaMailboxAvailabilityResult | null>(null);

  const userLowerEmail = (user?.primaryEmail || '').toLowerCase();
  const userLocalPrefix = userLowerEmail.split('@')[0]?.replace(/[^a-z0-9]/g, '') || '';
  const linkedOrg = user
    ? organizations.find(
        (org) =>
          (org.officialEmail || '').toLowerCase() === userLowerEmail ||
          (userLocalPrefix &&
            org.acronym.toLowerCase().replace(/[^a-z0-9]/g, '') === userLocalPrefix),
      ) || null
    : null;

  const notify = useOfficerRecipients({
    organizationId: linkedOrg?.id,
    organizationAcronym: linkedOrg?.acronym,
    organizationName: linkedOrg?.name,
    adviserEmail: linkedOrg?.adviserEmail,
    enabled: Boolean(user) && mode === 'reset_password',
    defaultChecked: Boolean(linkedOrg),
  });

  useEffect(() => {
    if (!user) return;
    setErrorMsg(null);
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setEmailPrefix(user.primaryEmail.replace(/@.*$/, ''));
    setSuspended(user.suspended);
    if (orgUnitPaths.includes(user.orgUnitPath)) {
      setOrgUnitSelect(user.orgUnitPath);
      setCustomOu('');
    } else {
      setOrgUnitSelect('__custom__');
      setCustomOu(user.orgUnitPath || '/');
    }
    setNewPassword(getDefaultTempPassword());
    setChangeAtNextLogin(true);
  }, [user, mode, orgUnitPaths]);

  const normalizedPrefix = emailPrefix
    .trim()
    .toLowerCase()
    .replace(/@.*$/, '')
    .replace(/[^a-z0-9._-]/g, '');
  const nextEmail = normalizedPrefix ? `${normalizedPrefix}@leonnhs.edu.ph` : '';

  useEffect(() => {
    if (!user || mode !== 'modify' || !nextEmail || nextEmail === user.primaryEmail.toLowerCase()) {
      setRenameAvailability(null);
      setIsCheckingRename(false);
      return;
    }

    let cancelled = false;
    setIsCheckingRename(true);
    const timer = window.setTimeout(() => {
      void checkIaMailboxAvailability(nextEmail)
        .then((result) => {
          if (!cancelled) setRenameAvailability(result);
        })
        .finally(() => {
          if (!cancelled) setIsCheckingRename(false);
        });
    }, 320);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [user, mode, nextEmail]);

  if (!user) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (mode === 'reset_password') {
      if (newPassword.trim().length < 8) {
        setErrorMsg('Password must be at least 8 characters.');
        return;
      }
      try {
        setIsSubmitting(true);
        const updated = await resetGoogleWorkspaceUserPassword({
          primaryEmail: user.primaryEmail,
          password: newPassword.trim(),
          changePasswordAtNextLogin: changeAtNextLogin,
        });

        let notificationSummary: SccGoogleAccountSuccessInfo['notificationSummary'];
        if (notify.notifyEnabled && notify.effectiveTo.length > 0) {
          try {
            const mail = buildPasswordResetNotificationEmail({
              organization: linkedOrg,
              primaryEmail: updated.primaryEmail,
              newPassword: newPassword.trim(),
              changeAtNextLogin,
            });
            const mailRes = await sendOfficerEmailNotification({
              to: notify.effectiveTo,
              cc: notify.effectiveCc,
              replyTo: linkedOrg?.adviserEmail || undefined,
              subject: mail.subject,
              text: mail.text,
              html: mail.html,
            });
            notificationSummary = { sentTo: mailRes.sentTo, ccSent: mailRes.ccSent };
          } catch (notifyErr: any) {
            notificationSummary = {
              sentTo: notify.effectiveTo,
              error: notifyErr?.message || 'Unable to send notification email.',
            };
          }
        }

        onUpdated(updated);
        onClose();
        onPasswordResetSuccess?.({
          action: 'updated',
          userId: updated.id,
          primaryEmail: updated.primaryEmail,
          tempPassword: newPassword.trim(),
          orgUnitPath: updated.orgUnitPath,
          notificationSummary,
        });
      } catch (err: any) {
        setErrorMsg(err?.message || 'Unable to reset account password.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!firstName.trim() || !lastName.trim() || !nextEmail) {
      setErrorMsg('First Name, Last Name, and valid mailbox username are required.');
      return;
    }

    const resolvedOu = orgUnitSelect === '__custom__' ? customOu.trim() || '/' : orgUnitSelect;

    try {
      setIsSubmitting(true);
      const updated = await updateGoogleWorkspaceUser({
        primaryEmail: user.primaryEmail,
        newPrimaryEmail: nextEmail !== user.primaryEmail ? nextEmail : undefined,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        orgUnitPath: resolvedOu,
        suspended,
      });
      onUpdated(updated);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to update Google Workspace account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div
        className="modal-dialog modal-dialog--wide ia-scc-modal"
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'reset_password' ? 'Reset Google Password' : 'Modify Google Account'}
      >
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">{user.primaryEmail}</p>
            <h3>
              {mode === 'reset_password'
                ? 'Reset Google Workspace Password'
                : 'Modify Google Workspace Account'}
            </h3>
          </div>
          <button type="button" className="modal-dialog__close" onClick={onClose} aria-label="Close">
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-dialog__body ia-scc-modal__body">
          {errorMsg ? (
            <div className="ia-scc-alert ia-scc-alert--danger" role="alert">
              <span className="material-symbols-outlined" aria-hidden="true">error</span>
              <span>{errorMsg}</span>
            </div>
          ) : null}

          {mode === 'reset_password' ? (
            <div className="ia-scc-form-stack">
              <div className="ia-scc-password-row">
                <label className="floating-field ia-scc-password-row__input">
                  <input
                    type="text"
                    placeholder=" "
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <span>New Temporary Password (min 8 chars) *</span>
                </label>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setNewPassword(getDefaultTempPassword())}
                >
                  Use Default
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setNewPassword(generateStrongPassword())}
                >
                  Random
                </button>
              </div>

              <label className="ia-scc-checkbox-row">
                <input
                  type="checkbox"
                  checked={changeAtNextLogin}
                  onChange={(e) => setChangeAtNextLogin(e.target.checked)}
                />
                <span>Require password change on next sign-in</span>
              </label>

              <OfficerNotificationBox
                title={
                  linkedOrg
                    ? `Notify ${linkedOrg.acronym} registered officers of password reset via email`
                    : 'Notify officers of password reset via email'
                }
                smtpStatus={notify.smtpStatus}
                recipients={notify.recipients}
                allOfficersCount={notify.allOfficersCount}
                selectedEmails={notify.selectedEmails}
                presetMode={notify.presetMode}
                includeAdviser={notify.includeAdviser}
                adviserEmail={linkedOrg?.adviserEmail}
                manualEmail={notify.manualEmail}
                notifyEnabled={notify.notifyEnabled}
                isLoading={notify.isLoading}
                onToggleNotify={notify.setNotifyEnabled}
                onApplyPreset={notify.applyPreset}
                onToggleEmail={notify.toggleEmail}
                onToggleAdviser={notify.setIncludeAdviser}
                onManualEmailChange={notify.setManualEmail}
              />
            </div>
          ) : (
            <div className="ia-scc-form-stack">
              <div className="ia-scc-form-grid">
                <label className="floating-field">
                  <input
                    type="text"
                    placeholder=" "
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                  <span>First Name / Given Name *</span>
                </label>

                <label className="floating-field">
                  <input
                    type="text"
                    placeholder=" "
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                  <span>Last Name / Family Name *</span>
                </label>
              </div>

              <div className="ia-scc-email-row">
                <label className="floating-field ia-scc-email-row__input">
                  <input
                    type="text"
                    placeholder=" "
                    required
                    disabled={user.isAdmin}
                    value={emailPrefix}
                    onChange={(e) => setEmailPrefix(e.target.value)}
                  />
                  <span>Primary Mailbox Username *</span>
                </label>
                <span className="ia-scc-email-row__domain">@leonnhs.edu.ph</span>
              </div>
              {nextEmail && nextEmail !== user.primaryEmail.toLowerCase() ? (
                isCheckingRename ? (
                  <p className="ia-scc-availability-hint ia-scc-availability-hint--checking">
                    Checking email availability...
                  </p>
                ) : renameAvailability && !renameAvailability.available ? (
                  <p className="ia-scc-availability-hint ia-scc-availability-hint--danger" role="alert">
                    {formatIaDuplicateEmailMessage(
                      renameAvailability.email,
                      renameAvailability.registeredTo,
                    )}
                  </p>
                ) : renameAvailability?.available ? (
                  <p className="ia-scc-availability-hint ia-scc-availability-hint--success">
                    <strong>{renameAvailability.email}</strong> is available.
                  </p>
                ) : null
              ) : null}

              <UsisSearchableSelect
                ariaLabel="Organizational Unit"
                floatingLabel
                forcePortalMenu
                label="Organizational Unit"
                required
                value={orgUnitSelect}
                onChange={setOrgUnitSelect}
                options={[
                  ...orgUnitPaths.map((ou) => ({
                    value: ou,
                    label: ou === '/' ? '/ (Root Organizational Unit)' : ou,
                  })),
                  { value: '__custom__', label: 'Custom OU Path...' },
                ]}
              />

              {orgUnitSelect === '__custom__' ? (
                <label className="floating-field">
                  <input
                    type="text"
                    placeholder=" "
                    required
                    value={customOu}
                    onChange={(e) => setCustomOu(e.target.value)}
                  />
                  <span>Custom Organizational Unit Path *</span>
                </label>
              ) : null}

              <label className="ia-scc-checkbox-row">
                <input
                  type="checkbox"
                  disabled={user.isAdmin}
                  checked={suspended}
                  onChange={(e) => setSuspended(e.target.checked)}
                />
                <span>Suspend account (temporarily disable Google Workspace sign-in)</span>
              </label>
            </div>
          )}
          </div>

          <div className="modal-dialog__actions ia-scc-modal__actions">
            <button type="button" className="secondary-btn" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="primary-btn" disabled={isSubmitting}>
              {isSubmitting
                ? 'Saving...'
                : mode === 'reset_password'
                  ? 'Reset Password'
                  : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
