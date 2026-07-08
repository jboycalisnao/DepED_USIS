import { useEffect, useMemo, useRef, useState } from 'react';
import type { AttendanceSmsRecipientState, AttendanceSmsSettings, Learner } from '../../../types';
import { normalizePhilippineMobileNumber } from '../services/skySmsNotification';
import SmsLogsAndQueueTab from './SmsLogsAndQueueTab';
import { useSmsNotificationQueue, type SmsQueueRequest } from '../hooks/useSmsNotificationQueue';
import {
  UsisGradeSectionList,
  type UsisGradeSectionListGrade,
} from '../../../../common/components/ui/UsisGradeSectionList';

type Props = {
  learners: Learner[];
  smsSettings: AttendanceSmsSettings;
  smsRecipientState: AttendanceSmsRecipientState;
  onSmsRecipientStateChange: (value: AttendanceSmsRecipientState) => void;
  isSettingsLoading: boolean;
};

const DEFAULT_EVENT_TIME = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const normalize = (value: unknown) => String(value ?? '').trim();

const naturalSort = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

const resolveGenderTerm = (gender: string | null | undefined) => {
  const normalized = normalize(gender).toLowerCase();
  if (normalized === 'm' || normalized === 'male' || normalized.startsWith('male')) return 'son';
  if (normalized === 'f' || normalized === 'female' || normalized.startsWith('female')) return 'daughter';
  return 'child';
};

const resolveAction = (value: string) => (value === 'exit' ? 'exited' : 'entered');

const renderTemplate = (template: string, learner: Learner, eventTime: string, action: 'entry' | 'exit') =>
  template
    .replaceAll('{time}', eventTime || DEFAULT_EVENT_TIME)
    .replaceAll('{action}', resolveAction(action))
    .replaceAll('{gender_term}', resolveGenderTerm(learner.gender))
    .replaceAll('{learner_name}', `${learner.first_name || ''} ${learner.last_name || ''}`.trim() || 'your learner')
    .replaceAll('{school}', 'Leon NHS');

const SmsNotificationPage = ({
  learners,
  smsSettings,
  smsRecipientState,
  onSmsRecipientStateChange,
  isSettingsLoading,
}: Props) => {
  const [recipientIds, setRecipientIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'recipient-availability' | 'sms-logs'>('recipient-availability');
  const [isQueueing, setIsQueueing] = useState(false);
  const [eventTime, setEventTime] = useState(DEFAULT_EVENT_TIME);
  const [action, setAction] = useState<'entry' | 'exit'>('entry');
  const [statusMessage, setStatusMessage] = useState('');
  const [statusTone, setStatusTone] = useState<'idle' | 'success' | 'error'>('idle');
  const [resultSummary, setResultSummary] = useState('');
  const hasHydratedRecipientState = useRef(false);
  const { queueItems, logEntries, enqueueRequests, clearHistory, isProcessing, stats } = useSmsNotificationQueue();

  useEffect(() => {
    if (isSettingsLoading) return;

    const nextRecipientIds = Array.from(
      new Set((smsRecipientState.enabledLearnerIds || []).map((value) => String(value || '').trim()).filter(Boolean)),
    );
    setRecipientIds(nextRecipientIds);
    hasHydratedRecipientState.current = true;
  }, [isSettingsLoading, smsRecipientState]);

  useEffect(() => {
    if (!hasHydratedRecipientState.current) return;
    onSmsRecipientStateChange({ enabledLearnerIds: recipientIds });
  }, [onSmsRecipientStateChange, recipientIds]);

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

  const selectedRecipients = useMemo(
    () => learnersWithContacts.filter((row) => recipientIds.includes(row.learner.id) && Boolean(normalize(row.guardianContactNumber))),
    [learnersWithContacts, recipientIds],
  );

  const previewRecipient =
    selectedRecipients[0] ||
    learnersWithContacts.find((row) => Boolean(normalize(row.guardianContactNumber))) ||
    null;
  const previewMessage = previewRecipient
    ? renderTemplate(smsSettings.messageTemplate, previewRecipient.learner, eventTime, action)
    : '';
  const previewLength = previewMessage.length;
  const canSend = Boolean(smsSettings.apiKey.trim() && smsSettings.messageTemplate.trim() && selectedRecipients.length > 0 && !isQueueing);

  const toggleRecipient = (learnerId: string) => {
    setRecipientIds((current) =>
      current.includes(learnerId) ? current.filter((value) => value !== learnerId) : [...current, learnerId],
    );
  };

  const setSectionSelection = (sectionLearners: typeof learnersWithContacts, enabled: boolean) => {
    const eligibleIds = sectionLearners.filter((row) => Boolean(row.guardianContactNumber)).map((row) => row.learner.id);
    setRecipientIds((current) => {
      const currentSet = new Set(current);
      if (!enabled) {
        eligibleIds.forEach((id) => currentSet.delete(id));
        return Array.from(currentSet);
      }

      eligibleIds.forEach((id) => currentSet.add(id));
      return Array.from(currentSet);
    });
  };

  const setAllRecipients = (enabled: boolean) => {
    if (!enabled) {
      setRecipientIds([]);
      return;
    }
    setRecipientIds(learnersWithContacts.filter((row) => Boolean(row.guardianContactNumber)).map((row) => row.learner.id));
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
                            onChange={() => toggleRecipient(row.learner.id)}
                          />
                          <div className="attendance-sms-page__recipient-copy">
                            <strong>{row.fullName}</strong>
                            <span>
                              {row.gradeLabel} | {row.sectionLabel}
                            </span>
                            <span>{eligible ? row.guardianContactNumber : 'No guardian or parent contact number'}</span>
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

  const handleSend = async () => {
    if (!smsSettings.apiKey) {
      setStatusTone('error');
      setStatusMessage('Configure the SkySMS API key in Settings first.');
      return;
    }

    if (!smsSettings.messageTemplate.trim()) {
      setStatusTone('error');
      setStatusMessage('Configure a message template in Settings first.');
      return;
    }

    if (selectedRecipients.length === 0) {
      setStatusTone('error');
      setStatusMessage('Select at least one learner with a guardian or parent contact number.');
      return;
    }

    setIsQueueing(true);
    setStatusMessage('');
    setStatusTone('idle');

    try {
      const requests: SmsQueueRequest[] = [];

      selectedRecipients.forEach((row) => {
        const phoneNumber = normalizePhilippineMobileNumber(row.guardianContactNumber);
        if (!phoneNumber) {
          throw new Error(`Invalid guardian or parent contact number for ${row.fullName}.`);
        }

        const message = renderTemplate(smsSettings.messageTemplate, row.learner, eventTime, action);
        if (message.length > 160) {
          throw new Error(`Template exceeded 160 characters for ${row.fullName}.`);
        }

        requests.push({
          learnerId: row.learner.id,
          learnerName: row.fullName,
          phoneNumber,
          message,
          apiKey: smsSettings.apiKey,
        });
      });

      const queuedCount = enqueueRequests(requests);
      setStatusTone('success');
      setStatusMessage(`Queued ${queuedCount} SMS request${queuedCount === 1 ? '' : 's'} for delivery.`);
      setResultSummary(requests.map((request) => `${request.learnerName} -> ${request.phoneNumber}`).join('\n'));
    } catch (error: any) {
      setStatusTone('error');
      setStatusMessage(error?.message || 'Unable to send SMS notifications.');
    } finally {
      setIsQueueing(false);
    }
  };

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
                The SkySMS API key and template are edited in Attendance Settings. This page uses the saved settings and only sends to opted-in learners.
              </p>
            </div>
            <div className="attendance-sms-page__status-badge">{smsSettings.apiKey ? 'Gateway Ready' : 'API Key Missing'}</div>
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
                  <p>Select who can receive SMS notifications. Only learners with a guardian or parent contact number can be enabled.</p>
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
                <small>Search by name, section, or guardian / parent number</small>
              </label>

              <UsisGradeSectionList
                className="attendance-sms-page__grade-list"
                grades={groupedGrades}
                expandAll={Boolean(query.trim())}
                emptyMessage="No learners loaded."
              />

              <div className="attendance-sms-page__preview-grid">
                <label className="attendance-sms-page__field">
                  <span>Event Time</span>
                  <input type="text" value={eventTime} onChange={(event) => setEventTime(event.target.value)} placeholder="08:20 AM" className="rounded-md" />
                </label>

                <label className="attendance-sms-page__field">
                  <span>Action</span>
                  <select value={action} onChange={(event) => setAction(event.target.value as 'entry' | 'exit')} className="rounded-md">
                    <option value="entry">Entered</option>
                    <option value="exit">Exited</option>
                  </select>
                </label>

                <label className="attendance-sms-page__field attendance-sms-page__field--full">
                  <span>Message Preview</span>
                  <textarea value={previewMessage} readOnly rows={4} className="rounded-md" />
                  <small>{previewLength}/160 characters</small>
                </label>
              </div>

              <div className="form-actions attendance-sms-page__actions">
                <button type="button" className="primary-button rounded-md" onClick={() => void handleSend()} disabled={!canSend}>
                  {isQueueing ? 'Queueing...' : `Queue ${selectedCount} learner${selectedCount === 1 ? '' : 's'}`}
                </button>
              </div>

              {statusMessage ? <p className={`attendance-sms-page__status attendance-sms-page__status--${statusTone}`}>{statusMessage}</p> : null}

              {resultSummary ? <pre className="attendance-sms-page__payload rounded-md">{resultSummary}</pre> : null}
            </div>
          </section>
        ) : (
          <SmsLogsAndQueueTab
            queueItems={queueItems}
            logEntries={logEntries}
            stats={stats}
            isProcessing={isProcessing}
            onClearHistory={clearHistory}
          />
        )}
      </div>
    </section>
  );
};

export default SmsNotificationPage;
