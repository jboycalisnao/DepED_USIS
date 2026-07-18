import { useEffect, useMemo, useRef, useState } from 'react';
import type { AttendanceSmsRecipientState, AttendanceSmsSettings, AttendanceSmsTestModeConfig, Learner, SmsQueueItem, SmsQueueLogEntry } from '../../../types';
import { normalizePhilippineMobileNumber } from '../services/skySmsNotification';
import SmsLogsAndQueueTab from './SmsLogsAndQueueTab';
import type { SmsQueueStats } from '../hooks/useSmsNotificationQueue';
import { normalizeRfidValue } from '../../../utils/rfid';
import { formatSmsIsoTimestamp, renderSmsMessageTemplate } from '../utils/smsMessageTemplate';
import {
  UsisGradeSectionList,
  type UsisGradeSectionListGrade,
} from '../../../../common/components/ui/UsisGradeSectionList';
import { UsisSearchableSelect } from '../../../../common/components/ui/UsisSearchableSelect';

type Props = {
  learners: Learner[];
  smsSettings: AttendanceSmsSettings;
  smsRecipientState: AttendanceSmsRecipientState;
  smsTestMode: AttendanceSmsTestModeConfig;
  onSmsRecipientStateChange: (value: AttendanceSmsRecipientState) => void;
  onSmsTestModeChange: (value: AttendanceSmsTestModeConfig) => void;
  smsTestStatus: string;
  smsTestStatusTone: 'idle' | 'success' | 'error';
  queueItems: SmsQueueItem[];
  logEntries: SmsQueueLogEntry[];
  clearHistory: () => void;
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
  smsTestMode,
  onSmsRecipientStateChange,
  onSmsTestModeChange,
  smsTestStatus,
  smsTestStatusTone,
  queueItems,
  logEntries,
  clearHistory,
  isProcessing,
  stats,
  isSettingsLoading,
}: Props) => {
  const [recipientIds, setRecipientIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'recipient-availability' | 'sms-logs'>('recipient-availability');
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

  const learnerOptions = useMemo(
    () =>
      learners
        .map((learner) => {
          const fullName = `${learner.last_name || ''}, ${learner.first_name || ''}`.replace(/^,\s*/, '').trim() || 'Unnamed learner';
          const section = [learner.grade_level, learner.section_name].filter(Boolean).join(' | ');
          return {
            value: learner.id,
            label: section ? `${fullName} - ${section}` : fullName,
          };
        })
        .sort((left, right) => naturalSort(left.label, right.label)),
    [learners],
  );
  const selectedTestLearner = learners.find((learner) => learner.id === smsTestMode.learnerId) || null;
  const testPreviewMessage = selectedTestLearner
    ? renderSmsMessageTemplate(smsSettings.messageTemplate, selectedTestLearner, formatSmsIsoTimestamp(), smsTestMode.action)
    : '';
  const normalizedTestPhone = normalizePhilippineMobileNumber(smsTestMode.phoneNumber);

  const updateSmsTestMode = (patch: Partial<AttendanceSmsTestModeConfig>) => {
    onSmsTestModeChange({
      ...smsTestMode,
      ...patch,
    });
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

        <section className="section-card attendance-sms-page__test-card rounded-md">
          <div className="section-card__bar" />
          <div className="section-card__content">
            <div className="attendance-sms-page__form-head">
              <div>
                <h3>SMS Test Mode</h3>
                <p>Use a temporary RFID and custom mobile number for gateway testing without saving the RFID to the learner record.</p>
              </div>
              <label className="registry-choice-option registry-radio-option--toggle attendance-sms-test-toggle">
                <span className="registry-choice-option__text">
                  <span className="registry-choice-option__label">{smsTestMode.isEnabled ? 'Test Mode On' : 'Test Mode Off'}</span>
                </span>
                <input
                  type="checkbox"
                  checked={smsTestMode.isEnabled}
                  onChange={(event) => updateSmsTestMode({ isEnabled: event.target.checked })}
                />
              </label>
            </div>

            <div className="floating-field-grid floating-field-grid--two attendance-sms-page__test-grid">
              <div className="floating-field attendance-sms-page__field--full">
                <UsisSearchableSelect
                  ariaLabel="Select SMS test learner"
                  floatingLabel
                  label="Select learner from registry"
                  options={learnerOptions}
                  value={smsTestMode.learnerId}
                  onChange={(learnerId) => updateSmsTestMode({ learnerId })}
                  placeholder="Search learner"
                  forcePortalMenu
                />
                <small>The selected learner supplies the message placeholders only.</small>
              </div>

              <label className="floating-field">
                <div className="floating-field__control">
                  <input
                    type="text"
                    value={smsTestMode.temporaryRfid}
                    onChange={(event) => updateSmsTestMode({ temporaryRfid: normalizeRfidValue(event.target.value) })}
                    placeholder=" "
                    data-has-value={smsTestMode.temporaryRfid.trim() ? 'true' : 'false'}
                  />
                  <span>Temporary RFID</span>
                </div>
                <small>Stored in local browser cache only.</small>
              </label>

              <label className="floating-field">
                <div className="floating-field__control">
                  <input
                    type="tel"
                    value={smsTestMode.phoneNumber}
                    onChange={(event) => updateSmsTestMode({ phoneNumber: event.target.value })}
                    placeholder=" "
                    data-has-value={smsTestMode.phoneNumber.trim() ? 'true' : 'false'}
                  />
                  <span>Custom Mobile Number</span>
                </div>
                <small>{smsTestMode.phoneNumber.trim() && !normalizedTestPhone ? 'Use a valid Philippine mobile number.' : 'SMS is sent to this number only.'}</small>
              </label>

              <fieldset className="registry-choice-group attendance-sms-page__field--full">
                <legend>Test Message Action</legend>
                <label className="registry-choice-option">
                  <span className="registry-choice-option__text">
                    <span className="registry-choice-option__label">Enter</span>
                    <span className="registry-choice-option__description">Send the entry wording when the temporary RFID is scanned.</span>
                  </span>
                  <input
                    type="radio"
                    name="attendance-sms-test-action"
                    checked={smsTestMode.action === 'entry'}
                    onChange={() => updateSmsTestMode({ action: 'entry' })}
                  />
                </label>
                <label className="registry-choice-option">
                  <span className="registry-choice-option__text">
                    <span className="registry-choice-option__label">Exit</span>
                    <span className="registry-choice-option__description">Send the exit wording when the temporary RFID is scanned.</span>
                  </span>
                  <input
                    type="radio"
                    name="attendance-sms-test-action"
                    checked={smsTestMode.action === 'exit'}
                    onChange={() => updateSmsTestMode({ action: 'exit' })}
                  />
                </label>
                <small>The scanned test RFID sends this selected action.</small>
              </fieldset>

              <div className="notice-box attendance-sms-test-preview attendance-sms-page__field--full">
                <strong>Preview</strong>
                <p>{testPreviewMessage || 'Select a learner to preview the test message.'}</p>
              </div>
            </div>

            {smsTestStatus ? (
              <p className={`attendance-sms-page__status attendance-sms-page__status--${smsTestStatusTone === 'success' ? 'success' : smsTestStatusTone === 'error' ? 'error' : 'idle'}`}>
                {smsTestStatus}
              </p>
            ) : null}
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
