import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { AttendanceSmsRecipientState, AttendanceSmsSettings, Learner, SmsQueueItem, SmsQueueLogEntry } from '../../../types';
import { normalizePhilippineMobileNumber, sendSkySmsNotification } from '../services/skySmsNotification';
import SmsLogsAndQueueTab from './SmsLogsAndQueueTab';
import type { SmsQueueStats } from '../hooks/useSmsNotificationQueue';
import {
  UsisGradeSectionList,
  type UsisGradeSectionListGrade,
} from '../../../../common/components/ui/UsisGradeSectionList';

type Props = {
  learners: Learner[];
  smsSettings: AttendanceSmsSettings;
  smsRecipientState: AttendanceSmsRecipientState;
  onSmsRecipientStateChange: (value: AttendanceSmsRecipientState) => void;
  queueItems: SmsQueueItem[];
  logEntries: SmsQueueLogEntry[];
  clearHistory: () => void;
  retryTodayFailedMessages: () => number;
  isProcessing: boolean;
  stats: SmsQueueStats;
  isSettingsLoading: boolean;
};

const normalize = (value: unknown) => String(value ?? '').trim();

const naturalSort = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

const normalizeRecipientIds = (value: unknown): string[] =>
  Array.isArray(value)
    ? Array.from(new Set(value.map((item) => String(item || '').trim()).filter(Boolean))).sort()
    : [];

const areSameRecipientIds = (left: string[], right: string[]) => {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
};

const SmsNotificationPage = ({
  learners,
  smsSettings,
  smsRecipientState,
  onSmsRecipientStateChange,
  queueItems,
  logEntries,
  clearHistory,
  retryTodayFailedMessages,
  isProcessing,
  stats,
  isSettingsLoading,
}: Props) => {
  const [recipientIds, setRecipientIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'recipient-availability' | 'sms-logs'>('recipient-availability');
  const [isManualSmsOpen, setIsManualSmsOpen] = useState(false);
  const [manualPhoneNumber, setManualPhoneNumber] = useState('');
  const [manualMessage, setManualMessage] = useState('Hello from DepED USIS SkySMS test.');
  const [manualStatus, setManualStatus] = useState<{ tone: 'idle' | 'success' | 'error'; message: string }>({ tone: 'idle', message: '' });
  const [isManualSending, setIsManualSending] = useState(false);
  const hasHydratedRecipientState = useRef(false);

  useEffect(() => {
    if (isSettingsLoading) return;

    const nextRecipientIds = normalizeRecipientIds(smsRecipientState.enabledLearnerIds);
    if (!hasHydratedRecipientState.current) {
      setRecipientIds((current) => (areSameRecipientIds(normalizeRecipientIds(current), nextRecipientIds) ? current : nextRecipientIds));
    }
    hasHydratedRecipientState.current = true;
  }, [isSettingsLoading, smsRecipientState]);

  useEffect(() => {
    if (!hasHydratedRecipientState.current) return;
    const nextRecipientIds = normalizeRecipientIds(recipientIds);
    if (areSameRecipientIds(nextRecipientIds, normalizeRecipientIds(smsRecipientState.enabledLearnerIds))) return;
    const syncTimer = window.setTimeout(() => {
      onSmsRecipientStateChange({ enabledLearnerIds: nextRecipientIds });
    }, 250);
    return () => window.clearTimeout(syncTimer);
  }, [onSmsRecipientStateChange, recipientIds, smsRecipientState.enabledLearnerIds]);

  const learnersWithContacts = useMemo(
    () =>
      learners
        .map((learner) => ({
          learner,
          guardianContactNumber: normalize(learner.guardian_contact_number || ''),
          fullName: `${learner.last_name || ''}, ${learner.first_name || ''}`.replace(/^,\s*/, '').trim() || 'Unnamed learner',
          gradeLabel: learner.grade_level || 'NO GRADE ASSIGNED',
          sectionLabel: learner.section_name || 'Unassigned',
        }))
        .filter((row) => {
          const rawQuery = query.trim().toLowerCase();
          if (!rawQuery) return true;
          return `${row.fullName} ${row.guardianContactNumber} ${row.gradeLabel} ${row.sectionLabel}`.toLowerCase().includes(rawQuery);
        }),
    [learners, query],
  );

  const normalizedManualPhone = normalizePhilippineMobileNumber(manualPhoneNumber);
  const trimmedManualMessage = manualMessage.trim();

  const handleManualSmsSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!smsSettings.apiKey.trim()) {
      setManualStatus({ tone: 'error', message: 'SkySMS API key is missing. Add it in Attendance Settings first.' });
      return;
    }

    if (!normalizedManualPhone) {
      setManualStatus({ tone: 'error', message: 'Use a valid Philippine mobile number.' });
      return;
    }

    if (!trimmedManualMessage) {
      setManualStatus({ tone: 'error', message: 'Message is required.' });
      return;
    }

    if (trimmedManualMessage.length > 160) {
      setManualStatus({ tone: 'error', message: 'Message must be 160 characters or fewer.' });
      return;
    }

    setIsManualSending(true);
    setManualStatus({ tone: 'idle', message: `Sending manual test SMS to ${normalizedManualPhone}.` });
    try {
      const response = await sendSkySmsNotification({
        apiKey: smsSettings.apiKey,
        phoneNumber: normalizedManualPhone,
        message: trimmedManualMessage,
      });
      setManualStatus({
        tone: 'success',
        message: response.message || `Manual test SMS sent to ${normalizedManualPhone}.`,
      });
    } catch (error) {
      setManualStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Manual test SMS failed.',
      });
    } finally {
      setIsManualSending(false);
    }
  };

  const toggleRecipient = (learnerId: string) => {
    setRecipientIds((current) =>
      normalizeRecipientIds(current.includes(learnerId) ? current.filter((value) => value !== learnerId) : [...current, learnerId]),
    );
  };

  const setSectionSelection = (sectionLearners: typeof learnersWithContacts, enabled: boolean) => {
    const eligibleIds = sectionLearners.filter((row) => Boolean(row.guardianContactNumber)).map((row) => row.learner.id);
    setRecipientIds((current) => {
      const currentSet = new Set(current);
      if (!enabled) {
        eligibleIds.forEach((id) => currentSet.delete(id));
        return normalizeRecipientIds(Array.from(currentSet));
      }

      eligibleIds.forEach((id) => currentSet.add(id));
      return normalizeRecipientIds(Array.from(currentSet));
    });
  };

  const setAllRecipients = (enabled: boolean) => {
    if (!enabled) {
      setRecipientIds([]);
      return;
    }
    setRecipientIds(normalizeRecipientIds(learnersWithContacts.filter((row) => Boolean(row.guardianContactNumber)).map((row) => row.learner.id)));
  };

  const groupedGrades = useMemo<UsisGradeSectionListGrade[]>(() => {
    const grouped = new Map<string, Map<string, typeof learnersWithContacts>>();

    learnersWithContacts.forEach((row) => {
      const grade = row.gradeLabel;
      const section = row.sectionLabel;
      if (!grouped.has(grade)) grouped.set(grade, new Map());
      const sectionMap = grouped.get(grade)!;
      if (!sectionMap.has(section)) sectionMap.set(section, []);
      sectionMap.get(section)!.push(row);
    });

    return Array.from(grouped.entries())
      .sort(([left], [right]) => {
        if (left === 'NO GRADE ASSIGNED') return 1;
        if (right === 'NO GRADE ASSIGNED') return -1;
        return naturalSort(left, right);
      })
      .map(([grade, sectionMap]) => {
        const sections = Array.from(sectionMap.entries())
          .sort(([left], [right]) => naturalSort(left, right))
          .map(([section, sectionLearners]) => {
            const selectedCount = sectionLearners.filter((row) => recipientIds.includes(row.learner.id) && Boolean(row.guardianContactNumber)).length;
            const eligibleCount = sectionLearners.filter((row) => Boolean(row.guardianContactNumber)).length;

            return {
              key: section,
              label: section,
              count: sectionLearners.length,
              content: (
                <div className="attendance-sms-page__section-shell rounded-md">
                  <div className="attendance-sms-page__section-actions">
                    <p>
                      {selectedCount} of {eligibleCount} learners opted in
                    </p>
                    <div className="attendance-sms-page__bulk-actions">
                      <button
                        type="button"
                        className="secondary-button rounded-md"
                        onClick={() => setSectionSelection(sectionLearners, true)}
                        disabled={eligibleCount === 0}
                      >
                        Select Section
                      </button>
                      <button
                        type="button"
                        className="secondary-button rounded-md"
                        onClick={() => setSectionSelection(sectionLearners, false)}
                        disabled={selectedCount === 0}
                      >
                        Clear Section
                      </button>
                    </div>
                  </div>

                  <div className="attendance-sms-page__recipient-grid">
                    {sectionLearners.map((row) => {
                      const eligible = Boolean(row.guardianContactNumber);
                      const selected = recipientIds.includes(row.learner.id);
                      return (
                        <label
                          key={row.learner.id}
                          className={`attendance-sms-page__recipient rounded-md ${selected ? 'is-selected' : ''} ${eligible ? '' : 'is-disabled'}`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            disabled={!eligible}
                            onClick={(event) => event.stopPropagation()}
                            onChange={() => toggleRecipient(row.learner.id)}
                          />
                          <div className="attendance-sms-page__recipient-copy">
                            <strong>{row.fullName}</strong>
                            <span>
                              {row.gradeLabel} | {row.sectionLabel}
                            </span>
                            <span>{eligible ? row.guardianContactNumber : 'No guardian mobile number'}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ),
            };
          });

        return {
          key: grade,
          label: grade,
          countLabel: `${sectionMap.size} ${sectionMap.size === 1 ? 'Section' : 'Sections'}`,
          sections,
        };
      });
  }, [learnersWithContacts, recipientIds]);

  const selectedCount = recipientIds.filter((id) => learnersWithContacts.some((row) => row.learner.id === id && Boolean(row.guardianContactNumber))).length;
  const eligibleCount = learnersWithContacts.filter((row) => Boolean(row.guardianContactNumber)).length;

  return (
    <section className="portal-panel attendance-sms-page rounded-md">
      <div className="portal-panel__header">
        <p className="attendance-sms-page__eyebrow">Experimental Service</p>
        <h1>SMS Notification</h1>
        <p className="attendance-sms-page__subtitle">
          Manage who can receive attendance notifications, preview the gender-aware message, and send test messages through the configured gateway.
        </p>
      </div>

      <div className="portal-panel__body attendance-sms-page__body">
        <section className="section-card attendance-sms-page__intro-card rounded-md">
          <div className="section-card__bar" />
          <div className="section-card__content attendance-sms-page__intro-content">
            <div>
              <h3>Configured Gateway</h3>
              <p>
                The SkySMS API key and template are edited in Attendance Settings. Manual testing uses the saved key and sends directly through the local SMS proxy.
              </p>
            </div>
            <div className="attendance-sms-page__intro-actions">
              <div className="attendance-sms-page__status-badge">{smsSettings.apiKey ? 'Gateway Ready' : 'API Key Missing'}</div>
              <button
                type="button"
                className="primary-button rounded-md"
                onClick={() => {
                  setManualStatus({ tone: 'idle', message: '' });
                  setIsManualSmsOpen(true);
                }}
              >
                Manual SMS Test
              </button>
            </div>
          </div>
        </section>

        <div className="attendance-sms-page__tabs" role="tablist" aria-label="SMS notification sections">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'recipient-availability'}
            className={`attendance-sms-page__tab ${activeTab === 'recipient-availability' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('recipient-availability')}
          >
            Recipient Availability
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'sms-logs'}
            className={`attendance-sms-page__tab ${activeTab === 'sms-logs' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('sms-logs')}
          >
            SMS logs and queue
          </button>
        </div>

        {activeTab === 'recipient-availability' ? (
          <section className="section-card attendance-sms-page__form-card rounded-md">
            <div className="section-card__bar" />
            <div className="section-card__content">
              <div className="attendance-sms-page__form-head">
                <div>
                  <h3>Recipient Availability</h3>
                  <p>Select who can receive SMS notifications. Only learners with a guardian mobile number can be enabled.</p>
                </div>
                <div className="attendance-sms-page__bulk-actions">
                  <button type="button" className="secondary-button rounded-md" onClick={() => setAllRecipients(true)} disabled={eligibleCount === 0}>
                    Select All
                  </button>
                  <button type="button" className="secondary-button rounded-md" onClick={() => setAllRecipients(false)} disabled={recipientIds.length === 0}>
                    Clear All
                  </button>
                </div>
              </div>

              <label
                className="attendance-sms-page__field attendance-sms-page__field--search floating-field"
                data-has-value={query.trim().length > 0 ? 'true' : 'false'}
              >
                <div className="floating-field__control attendance-sms-page__search-control">
                  <input
                    id="attendance-sms-recipient-search"
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder=" "
                    aria-label="Search learners"
                    className="attendance-sms-page__search-input rounded-md"
                  />
                  <span>Search learners</span>
                </div>
                <small>Search by name, section, or guardian mobile number</small>
              </label>

              <UsisGradeSectionList
                className="attendance-sms-page__grade-list"
                grades={groupedGrades}
                expandAll={Boolean(query.trim())}
                emptyMessage="No learners loaded."
              />
            </div>
          </section>
        ) : (
          <SmsLogsAndQueueTab
            queueItems={queueItems}
            logEntries={logEntries}
            stats={stats}
            isProcessing={isProcessing}
            onRetryTodayFailedMessages={retryTodayFailedMessages}
            onClearHistory={clearHistory}
          />
        )}
      </div>

      {isManualSmsOpen ? (
        <div className="modal-overlay modal-overlay--high" role="presentation">
          <button type="button" className="modal-backdrop" onClick={() => setIsManualSmsOpen(false)} aria-label="Close manual SMS test modal" />
          <form className="modal-dialog modal-dialog--wide attendance-sms-manual-modal" role="dialog" aria-modal="true" aria-labelledby="manual-sms-test-title" onSubmit={handleManualSmsSubmit}>
            <div className="modal-dialog__header">
              <div className="modal-dialog__title-group">
                <p className="modal-dialog__eyebrow">SkySMS Gateway</p>
                <h3 id="manual-sms-test-title">Manual SMS Test</h3>
              </div>
              <button type="button" className="modal-dialog__close" onClick={() => setIsManualSmsOpen(false)} aria-label="Close manual SMS test modal">
                <span aria-hidden="true">x</span>
              </button>
            </div>

            <div className="modal-dialog__body">
              <div className="form-grid attendance-manual-modal__grid">
                <label className="floating-field">
                  <div className="floating-field__control">
                    <input
                      type="tel"
                      value={manualPhoneNumber}
                      onChange={(event) => setManualPhoneNumber(event.target.value)}
                      placeholder=" "
                      data-has-value={manualPhoneNumber.trim() ? 'true' : 'false'}
                    />
                    <span>Recipient Mobile Number</span>
                  </div>
                  <small>{manualPhoneNumber.trim() && !normalizedManualPhone ? 'Use 09xxxxxxxxx or +639xxxxxxxxx.' : 'The request is normalized before sending.'}</small>
                </label>

                <label className="floating-field attendance-sms-page__field--full">
                  <div className="floating-field__control">
                    <textarea
                      value={manualMessage}
                      onChange={(event) => setManualMessage(event.target.value)}
                      placeholder=" "
                      data-has-value={manualMessage.trim() ? 'true' : 'false'}
                      maxLength={160}
                    />
                    <span>Message</span>
                  </div>
                  <small>{trimmedManualMessage.length}/160 characters</small>
                </label>
              </div>

              <div className="notice-box attendance-sms-manual-modal__request">
                <strong>Gateway Request</strong>
                <pre className="attendance-sms-page__payload">
{JSON.stringify(
  {
    url: '/api/sms-notification',
    method: 'POST',
    body: {
      phoneNumber: normalizedManualPhone || manualPhoneNumber,
      message: trimmedManualMessage,
      apiKey: smsSettings.apiKey ? '[saved settings key]' : '',
    },
  },
  null,
  2,
)}
                </pre>
              </div>

              {manualStatus.message ? (
                <p className={`attendance-sms-page__status attendance-sms-page__status--${manualStatus.tone === 'success' ? 'success' : manualStatus.tone === 'error' ? 'error' : 'idle'}`}>
                  {manualStatus.message}
                </p>
              ) : null}
            </div>

            <div className="modal-dialog__actions">
              <button type="button" className="modal-dialog__secondary" onClick={() => setIsManualSmsOpen(false)}>
                Close
              </button>
              <button type="submit" className="modal-dialog__blue" disabled={isManualSending || !smsSettings.apiKey.trim()}>
                {isManualSending ? 'Sending...' : 'Send Test SMS'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
};

export default SmsNotificationPage;
