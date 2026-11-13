import { useEffect, useState, type FormEvent } from 'react';
import { UsisSearchableSelect } from '../../../../../common/components/ui/UsisSearchableSelect';
import type { IaMailboxAvailabilityResult, IaSccOrganization } from '../types';
import {
  checkIaMailboxAvailability,
  fetchGoogleAdminOrgUnits,
  formatIaDuplicateEmailMessage,
  provisionGoogleWorkspaceAccount,
  sendOfficerEmailNotification,
} from '../services/iaSccService';
import { useOfficerRecipients } from '../hooks/useOfficerRecipients';
import { OfficerNotificationBox } from '../components/OfficerNotificationBox';
import { buildAccountProvisionedNotificationEmail } from '../utils/sccNotificationTemplates';
import type { SccGoogleAccountSuccessInfo } from './SccGoogleAccountSuccessModal';

type SccCreateGoogleUserModalProps = {
  isOpen: boolean;
  organizations: IaSccOrganization[];
  initialOrganization?: IaSccOrganization | null;
  onClose: () => void;
  onCreated?: () => void;
  onSuccess?: (info: SccGoogleAccountSuccessInfo) => void;
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

export function SccCreateGoogleUserModal({
  isOpen,
  organizations,
  initialOrganization,
  onClose,
  onCreated,
  onSuccess,
}: SccCreateGoogleUserModalProps) {
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [emailPrefix, setEmailPrefix] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [orgUnitOptions, setOrgUnitOptions] = useState<string[]>([
    '/School Orgs and Clubs',
    '/',
  ]);
  const [orgUnitSelect, setOrgUnitSelect] = useState('/School Orgs and Clubs');
  const [customOrgUnitPath, setCustomOrgUnitPath] = useState('');
  const [changePasswordAtNextLogin, setChangePasswordAtNextLogin] = useState(true);
  const [updateIfExists, setUpdateIfExists] = useState(false);
  const [setAsOfficialMailbox, setSetAsOfficialMailbox] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<SccGoogleAccountSuccessInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailAvailability, setEmailAvailability] = useState<IaMailboxAvailabilityResult | null>(null);

  const activeOrg = organizations.find((o) => o.id === selectedOrgId);
  const notify = useOfficerRecipients({
    organizationId: activeOrg?.id,
    organizationAcronym: activeOrg?.acronym,
    organizationName: activeOrg?.name,
    adviserEmail: activeOrg?.adviserEmail,
    enabled: isOpen,
    defaultChecked: Boolean(activeOrg),
  });

  const applyOrgDefaults = (orgId: string) => {
    setSelectedOrgId(orgId);
    const org = organizations.find((o) => o.id === orgId);
    if (org) {
      const cleanPrefix = org.acronym.toLowerCase().replace(/[^a-z0-9._-]/g, '');
      setFirstName(org.acronym);
      setLastName('Leon NHS Club');
      setEmailPrefix(cleanPrefix);
      setSetAsOfficialMailbox(true);
    } else {
      setSetAsOfficialMailbox(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setErrorMsg(null);
    setSuccessInfo(null);
    setCopied(false);
    setTempPassword(getDefaultTempPassword());
    setCustomOrgUnitPath('');
    setChangePasswordAtNextLogin(true);
    setUpdateIfExists(false);

    if (initialOrganization) {
      applyOrgDefaults(initialOrganization.id);
    } else {
      setSelectedOrgId('');
      setFirstName('');
      setLastName('');
      setEmailPrefix('');
      setSetAsOfficialMailbox(false);
    }

    void fetchGoogleAdminOrgUnits().then((meta) => {
      if (cancelled) return;
      setOrgUnitOptions(meta.orgUnitPaths);
      setOrgUnitSelect(meta.defaultOrgUnitPath || meta.orgUnitPaths[0] || '/');
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, initialOrganization]);

  if (!isOpen) return null;

  const selectedOrg = organizations.find((o) => o.id === selectedOrgId);
  const normalizedPrefix = emailPrefix
    .trim()
    .toLowerCase()
    .replace(/@.*$/, '')
    .replace(/[^a-z0-9._-]/g, '');
  const fullEmail = normalizedPrefix ? `${normalizedPrefix}@leonnhs.edu.ph` : '';

  useEffect(() => {
    if (!isOpen || !fullEmail) {
      setEmailAvailability(null);
      setIsCheckingEmail(false);
      return;
    }

    let cancelled = false;
    setIsCheckingEmail(true);
    const timer = window.setTimeout(() => {
      void checkIaMailboxAvailability(fullEmail, {
        excludeOrganizationId: selectedOrg?.id,
      })
        .then((result) => {
          if (!cancelled) setEmailAvailability(result);
        })
        .finally(() => {
          if (!cancelled) setIsCheckingEmail(false);
        });
    }, 320);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isOpen, fullEmail, selectedOrg?.id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setErrorMsg('First Name and Last Name are required.');
      return;
    }
    if (!normalizedPrefix) {
      setErrorMsg('Please enter a valid mailbox username prefix.');
      return;
    }
    if (tempPassword.trim().length < 8) {
      setErrorMsg('Temporary password must be at least 8 characters.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const check = await checkIaMailboxAvailability(fullEmail, {
        excludeOrganizationId: selectedOrg?.id,
      });
      setEmailAvailability(check);

      if (check.existsInDatabase && check.databaseConflictOrgId && check.databaseConflictOrgId !== selectedOrg?.id) {
        setErrorMsg(formatIaDuplicateEmailMessage(check.email, check.registeredTo));
        return;
      }

      if (!updateIfExists && !check.available) {
        setErrorMsg(formatIaDuplicateEmailMessage(check.email, check.registeredTo));
        return;
      }

      const resolvedOu =
        orgUnitSelect === '__custom__' ? customOrgUnitPath.trim() || '/' : orgUnitSelect;

      const res = await provisionGoogleWorkspaceAccount({
        primaryEmail: fullEmail,
        password: tempPassword.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        organizationAcronym: selectedOrg?.acronym,
        organizationName: selectedOrg?.name,
        orgUnitPath: resolvedOu,
        changePasswordAtNextLogin,
        updateIfExists,
        linkToOrganizationId:
          selectedOrg && setAsOfficialMailbox ? selectedOrg.id : undefined,
      });

      let notificationSummary: SccGoogleAccountSuccessInfo['notificationSummary'];
      if (notify.notifyEnabled && notify.effectiveTo.length > 0) {
        try {
          const mail = buildAccountProvisionedNotificationEmail({
            action: res.action,
            organization: selectedOrg || null,
            primaryEmail: res.user.primaryEmail,
            tempPassword: tempPassword.trim(),
            orgUnitPath: res.user.orgUnitPath,
          });
          const mailRes = await sendOfficerEmailNotification({
            to: notify.effectiveTo,
            cc: notify.effectiveCc,
            replyTo: selectedOrg?.adviserEmail || undefined,
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

      const info: SccGoogleAccountSuccessInfo = {
        action: res.action,
        userId: res.user.id,
        primaryEmail: res.user.primaryEmail,
        tempPassword: tempPassword.trim(),
        orgUnitPath: res.user.orgUnitPath,
        notificationSummary,
      };
      onCreated?.();
      if (onSuccess) {
        onClose();
        onSuccess(info);
      } else {
        setSuccessInfo(info);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to create Google Workspace user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCredentials = async () => {
    if (!successInfo) return;
    const text = `Google Workspace Credentials (Leon NHS)\nEmail: ${successInfo.primaryEmail}\nTemporary Password: ${successInfo.tempPassword}\nSign In: https://mail.google.com`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div
        className="modal-dialog modal-dialog--wide ia-scc-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Create Google Workspace User"
      >
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Google Admin Console • @leonnhs.edu.ph</p>
            <h3>Create Google Workspace User</h3>
          </div>
          <button type="button" className="modal-dialog__close" onClick={onClose} aria-label="Close">
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>

        <div className="modal-dialog__body ia-scc-modal__body">
          {errorMsg ? (
            <div className="ia-scc-alert ia-scc-alert--danger" role="alert">
              <span className="material-symbols-outlined" aria-hidden="true">error</span>
              <span>{errorMsg}</span>
            </div>
          ) : null}

          {successInfo ? (
            <>
              <div className="ia-scc-provisioned-box">
                <h5>
                  Google Workspace Account {successInfo.action === 'created' ? 'Created' : 'Updated'}
                </h5>
                <p>
                  <strong>Primary Email:</strong> <code>{successInfo.primaryEmail}</code>
                </p>
                <p>
                  <strong>Temporary Password:</strong> <code>{successInfo.tempPassword}</code>
                </p>
                <p>
                  <strong>Organizational Unit:</strong> <code>{successInfo.orgUnitPath}</code>
                </p>
                {successInfo.userId ? (
                  <p>
                    <strong>Google Directory User ID:</strong> <code>{successInfo.userId}</code>
                  </p>
                ) : null}
              </div>

              <div className="modal-dialog__actions ia-scc-modal__actions">
                <button type="button" className="secondary-btn" onClick={handleCopyCredentials}>
                  {copied ? 'Copied!' : 'Copy Credentials'}
                </button>
                <div className="ia-scc-action-row">
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => {
                      setSuccessInfo(null);
                      setCopied(false);
                      setFirstName('');
                      setLastName('');
                      setEmailPrefix('');
                      setTempPassword(getDefaultTempPassword());
                    }}
                  >
                    Create Another
                  </button>
                  <button type="button" className="primary-btn" onClick={onClose}>
                    Done
                  </button>
                </div>
              </div>
            </>
          ) : (
            <form className="ia-scc-form-stack" onSubmit={handleSubmit}>
              <UsisSearchableSelect
                ariaLabel="Link to SCC Organization (Optional)"
                floatingLabel
                forcePortalMenu
                label="Link to SCC Organization (Optional)"
                value={selectedOrgId}
                onChange={applyOrgDefaults}
                options={[
                  { value: '', label: 'Standalone Account (No Organization Link)' },
                  ...organizations.map((org) => ({
                    value: org.id,
                    label: `${org.acronym} — ${org.name}`,
                  })),
                ]}
              />

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
                    value={emailPrefix}
                    onChange={(e) => setEmailPrefix(e.target.value)}
                  />
                  <span>Mailbox Username *</span>
                </label>
                <span className="ia-scc-email-row__domain">@leonnhs.edu.ph</span>
              </div>
              {isCheckingEmail ? (
                <p className="ia-scc-availability-hint ia-scc-availability-hint--checking">
                  Checking email availability...
                </p>
              ) : emailAvailability && !emailAvailability.available ? (
                <p className="ia-scc-availability-hint ia-scc-availability-hint--danger" role="alert">
                  {formatIaDuplicateEmailMessage(
                    emailAvailability.email,
                    emailAvailability.registeredTo,
                  )}
                </p>
              ) : emailAvailability?.available ? (
                <p className="ia-scc-availability-hint ia-scc-availability-hint--success">
                  <strong>{emailAvailability.email}</strong> is available.
                </p>
              ) : null}

              <div className="ia-scc-form-grid">
                <div className="ia-scc-password-row">
                  <label className="floating-field ia-scc-password-row__input">
                    <input
                      type="text"
                      placeholder=" "
                      required
                      minLength={8}
                      value={tempPassword}
                      onChange={(e) => setTempPassword(e.target.value)}
                    />
                    <span>Temporary Password (min 8 chars) *</span>
                  </label>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => setTempPassword(generateStrongPassword())}
                  >
                    Generate
                  </button>
                </div>

                <UsisSearchableSelect
                  ariaLabel="Organizational Unit"
                  floatingLabel
                  forcePortalMenu
                  label="Organizational Unit"
                  required
                  value={orgUnitSelect}
                  onChange={setOrgUnitSelect}
                  options={[
                    ...orgUnitOptions.map((ou) => ({
                      value: ou,
                      label: ou === '/' ? '/ (Root Organizational Unit)' : ou,
                    })),
                    { value: '__custom__', label: 'Custom OU Path...' },
                  ]}
                />
              </div>

              {orgUnitSelect === '__custom__' ? (
                <label className="floating-field">
                  <input
                    type="text"
                    placeholder=" "
                    required
                    value={customOrgUnitPath}
                    onChange={(e) => setCustomOrgUnitPath(e.target.value)}
                  />
                  <span>Custom Organizational Unit Path (e.g. /School Orgs and Clubs) *</span>
                </label>
              ) : null}

              <div className="ia-scc-form-stack">
                {selectedOrg ? (
                  <label className="ia-scc-checkbox-row">
                    <input
                      type="checkbox"
                      checked={setAsOfficialMailbox}
                      onChange={(e) => setSetAsOfficialMailbox(e.target.checked)}
                    />
                    <span>
                      Set as official institutional mailbox for <strong>{selectedOrg.acronym}</strong>
                    </span>
                  </label>
                ) : null}

                <label className="ia-scc-checkbox-row">
                  <input
                    type="checkbox"
                    checked={changePasswordAtNextLogin}
                    onChange={(e) => setChangePasswordAtNextLogin(e.target.checked)}
                  />
                  <span>Require password change on next sign-in</span>
                </label>

                <label className="ia-scc-checkbox-row">
                  <input
                    type="checkbox"
                    checked={updateIfExists}
                    onChange={(e) => setUpdateIfExists(e.target.checked)}
                  />
                  <span>If account already exists in Google Admin, reset password and link it</span>
                </label>

                <OfficerNotificationBox
                  title={
                    selectedOrg
                      ? `Send account credentials via email to ${selectedOrg.acronym} registered officers`
                      : 'Send account credentials via email'
                  }
                  smtpStatus={notify.smtpStatus}
                  recipients={notify.recipients}
                  allOfficersCount={notify.allOfficersCount}
                  selectedEmails={notify.selectedEmails}
                  presetMode={notify.presetMode}
                  includeAdviser={notify.includeAdviser}
                  adviserEmail={selectedOrg?.adviserEmail}
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

              <div className="modal-dialog__actions ia-scc-modal__actions">
                <button type="button" className="secondary-btn" onClick={onClose} disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating in Google Admin...' : 'Create Google Workspace User'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
