import { useMemo, useState } from 'react';
import type { SmsQueueStats } from '../hooks/useSmsNotificationQueue';
import type { SmsQueueItem, SmsQueueLogEntry, SmsQueueLogLevel } from '../../../types';
import { formatSmsIsoTimestamp } from '../utils/smsMessageTemplate';
import { UsisSearchableSelect } from '../../../../common/components/ui/UsisSearchableSelect';

type Props = {
  queueItems: SmsQueueItem[];
  logEntries: SmsQueueLogEntry[];
  stats: SmsQueueStats;
  isProcessing: boolean;
  onRetryTodayFailedMessages: () => number;
  onClearHistory: () => void;
};

const formatTimestamp = (value: string) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return formatSmsIsoTimestamp(date);
};

const getStatusLabel = (status: SmsQueueItem['status']) => {
  if (status === 'sending') return 'Sending';
  if (status === 'sent') return 'Sent';
  if (status === 'failed') return 'Failed';
  return 'Queued';
};

const isToday = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
};

const SmsLogsAndQueueTab = ({ queueItems, logEntries, stats, isProcessing, onRetryTodayFailedMessages, onClearHistory }: Props) => {
  const [logFilter, setLogFilter] = useState<'all' | SmsQueueLogLevel>('all');
  const logFilterOptions = [
    { value: 'all', label: 'All logs' },
    { value: 'info', label: 'Info' },
    { value: 'success', label: 'Success' },
    { value: 'error', label: 'Error' },
  ];

  const visibleLogEntries = useMemo(
    () => (logFilter === 'all' ? logEntries : logEntries.filter((entry) => entry.level === logFilter)),
    [logEntries, logFilter],
  );
  const todayFailedCount = useMemo(
    () => queueItems.filter((item) => item.status === 'failed' && isToday(item.queuedAt)).length,
    [queueItems],
  );

  return (
    <div className="attendance-sms-page__logs-tab">
      <section className="section-card attendance-sms-page__logs-card rounded-md">
        <div className="section-card__bar" />
        <div className="section-card__content attendance-sms-page__logs-content">
          <div className="attendance-sms-page__logs-head">
            <div>
              <h3>SMS logs and queue</h3>
              <p>
                Requests are queued locally, sent one at a time, and spaced to stay inside the SkySMS limit of 60 messages per minute.
              </p>
            </div>
            <div className="attendance-sms-page__logs-actions">
              <div className={`attendance-sms-page__processing-pill registry-choice-option ${isProcessing ? 'is-active' : ''}`}>
                {isProcessing ? 'Processing queue' : 'Queue idle'}
              </div>
              <button
                type="button"
                className="primary-button rounded-md"
                onClick={onRetryTodayFailedMessages}
                disabled={isProcessing || todayFailedCount === 0}
              >
                Try Send Failed Today
              </button>
              <button type="button" className="secondary-button" onClick={onClearHistory} disabled={queueItems.length === 0 && logEntries.length === 0}>
                Clear History
              </button>
            </div>
          </div>

          <div className="attendance-sms-page__queue-metrics">
            <div className="attendance-sms-page__metric-card rounded-md">
              <span>Queued</span>
              <strong>{stats.queued}</strong>
            </div>
            <div className="attendance-sms-page__metric-card rounded-md">
              <span>Sending</span>
              <strong>{stats.sending}</strong>
            </div>
            <div className="attendance-sms-page__metric-card rounded-md">
              <span>Sent</span>
              <strong>{stats.sent}</strong>
            </div>
            <div className="attendance-sms-page__metric-card rounded-md">
              <span>Failed</span>
              <strong>{stats.failed}</strong>
            </div>
          </div>

          <div className="attendance-sms-page__queue-block">
            <div className="attendance-sms-page__block-title">
              <h4>Local Queue</h4>
              <p>{stats.total} request{stats.total === 1 ? '' : 's'} tracked locally.</p>
            </div>

            <div className="attendance-sms-page__queue-table-wrap">
              <table className="attendance-sms-page__queue-table">
                <thead>
                  <tr>
                    <th>Learner</th>
                    <th>Recipient</th>
                    <th>Status</th>
                    <th>Queued</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {queueItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="attendance-sms-page__empty-cell">
                        No SMS requests have been queued yet.
                      </td>
                    </tr>
                  ) : (
                    queueItems
                      .slice()
                      .reverse()
                      .map((item) => (
                        <tr key={item.id}>
                          <td>
                            <div className="attendance-sms-page__queue-learner">
                              <strong>{item.learnerName}</strong>
                              <span>{item.attempts} attempt{item.attempts === 1 ? '' : 's'}</span>
                            </div>
                          </td>
                          <td>{item.phoneNumber}</td>
                          <td>
                            <span className={`attendance-sms-page__status-chip attendance-sms-page__status-chip--${item.status}`}>
                              {getStatusLabel(item.status)}
                            </span>
                            {item.errorMessage ? <span className="attendance-sms-page__status-note">{item.errorMessage}</span> : null}
                            {item.responseMessage ? <span className="attendance-sms-page__status-note">{item.responseMessage}</span> : null}
                          </td>
                          <td>{formatTimestamp(item.queuedAt)}</td>
                          <td>{formatTimestamp(item.updatedAt)}</td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="attendance-sms-page__queue-block">
            <div className="attendance-sms-page__block-title attendance-sms-page__block-title--with-filter">
              <div>
                <h4>Activity Log</h4>
                <p>Every queue change, delivery attempt, success, or failure is recorded here.</p>
              </div>

              <div className="attendance-sms-page__logs-filter">
                <UsisSearchableSelect
                  ariaLabel="Filter SMS activity logs"
                  floatingLabel
                  label="Filter"
                  options={logFilterOptions}
                  value={logFilter}
                  onChange={(value) => setLogFilter(value as 'all' | SmsQueueLogLevel)}
                  allowTyping={false}
                  forcePortalMenu
                />
              </div>
            </div>

            <div className="attendance-sms-page__queue-table-wrap">
              <table className="attendance-sms-page__queue-table attendance-sms-page__log-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Level</th>
                    <th>Event</th>
                    <th>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleLogEntries.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="attendance-sms-page__empty-cell">
                        No activity recorded yet.
                      </td>
                    </tr>
                  ) : (
                    visibleLogEntries
                      .slice()
                      .reverse()
                      .map((entry) => (
                        <tr key={entry.id}>
                          <td>{formatTimestamp(entry.timestamp)}</td>
                          <td>
                            <span className={`attendance-sms-page__status-chip attendance-sms-page__status-chip--${entry.level}`}>
                              {entry.level}
                            </span>
                          </td>
                          <td>{entry.title}</td>
                          <td>{entry.detail || '--'}</td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SmsLogsAndQueueTab;
