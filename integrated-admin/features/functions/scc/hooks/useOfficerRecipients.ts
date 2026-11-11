import { useCallback, useEffect, useState } from 'react';
import type { SccOfficerRecipient, SccSmtpStatus } from '../types';
import {
  fetchSmtpNotificationStatus,
  resolveOrganizationOfficerRecipients,
} from '../services/iaSccService';

export type RecipientPresetMode = 'president' | 'signatories' | 'all' | 'custom';

function pickDefaultEmails(recipients: SccOfficerRecipient[]): {
  emails: string[];
  mode: RecipientPresetMode;
} {
  if (recipients.length === 0) return { emails: [], mode: 'president' };
  const presidents = recipients.filter((r) => r.isPresident);
  if (presidents.length > 0) {
    return { emails: presidents.map((r) => r.email), mode: 'president' };
  }
  const signatories = recipients.filter((r) => r.isAuthorizedSignatory);
  if (signatories.length > 0) {
    return { emails: signatories.map((r) => r.email), mode: 'signatories' };
  }
  return { emails: [recipients[0].email], mode: 'all' };
}

export function useOfficerRecipients(params: {
  organizationId?: string;
  organizationAcronym?: string;
  organizationName?: string;
  adviserEmail?: string;
  enabled: boolean;
  defaultChecked?: boolean;
}) {
  const {
    organizationId,
    organizationAcronym,
    organizationName,
    adviserEmail,
    enabled,
    defaultChecked = true,
  } = params;

  const [smtpStatus, setSmtpStatus] = useState<SccSmtpStatus | null>(null);
  const [recipients, setRecipients] = useState<SccOfficerRecipient[]>([]);
  const [allOfficersCount, setAllOfficersCount] = useState(0);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [presetMode, setPresetMode] = useState<RecipientPresetMode>('president');
  const [includeAdviser, setIncludeAdviser] = useState(false);
  const [manualEmail, setManualEmail] = useState('');
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setIsLoading(true);
    setManualEmail('');
    setIncludeAdviser(false);

    const loadSmtp = fetchSmtpNotificationStatus();
    const loadRoster =
      organizationId && (organizationAcronym || organizationName)
        ? resolveOrganizationOfficerRecipients({
            organizationId,
            organizationAcronym: organizationAcronym || '',
            organizationName: organizationName || '',
          })
        : Promise.resolve({ recipients: [], allOfficersCount: 0 });

    void Promise.all([loadSmtp, loadRoster])
      .then(([smtp, roster]) => {
        if (cancelled) return;
        setSmtpStatus(smtp);
        setRecipients(roster.recipients);
        setAllOfficersCount(roster.allOfficersCount);
        const picked = pickDefaultEmails(roster.recipients);
        setSelectedEmails(picked.emails);
        setPresetMode(picked.mode);
        setNotifyEnabled(
          defaultChecked && smtp.configured && picked.emails.length > 0,
        );
      })
      .catch(() => {
        if (cancelled) return;
        setRecipients([]);
        setSelectedEmails([]);
        setNotifyEnabled(false);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    organizationId,
    organizationAcronym,
    organizationName,
    defaultChecked,
  ]);

  const applyPreset = useCallback(
    (mode: Exclude<RecipientPresetMode, 'custom'>) => {
      setPresetMode(mode);
      if (mode === 'president') {
        const pres = recipients.filter((r) => r.isPresident);
        setSelectedEmails(
          pres.length > 0
            ? pres.map((r) => r.email)
            : recipients.slice(0, 1).map((r) => r.email),
        );
      } else if (mode === 'signatories') {
        const sigs = recipients.filter((r) => r.isAuthorizedSignatory);
        setSelectedEmails(
          sigs.length > 0
            ? sigs.map((r) => r.email)
            : recipients.map((r) => r.email),
        );
      } else {
        setSelectedEmails(recipients.map((r) => r.email));
      }
    },
    [recipients],
  );

  const toggleEmail = useCallback((email: string) => {
    setPresetMode('custom');
    setSelectedEmails((prev) =>
      prev.includes(email) ? prev.filter((item) => item !== email) : [...prev, email],
    );
  }, []);

  const manualList = manualEmail
    .split(/[,;\s]+/)
    .map((val) => val.trim().toLowerCase())
    .filter((val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val));

  const effectiveTo = Array.from(new Set([...selectedEmails, ...manualList]));
  const effectiveCc =
    includeAdviser && adviserEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adviserEmail.trim())
      ? [adviserEmail.trim().toLowerCase()]
      : [];

  return {
    smtpStatus,
    recipients,
    allOfficersCount,
    selectedEmails,
    presetMode,
    includeAdviser,
    setIncludeAdviser,
    manualEmail,
    setManualEmail,
    notifyEnabled,
    setNotifyEnabled,
    isLoading,
    applyPreset,
    toggleEmail,
    effectiveTo,
    effectiveCc,
  };
}
