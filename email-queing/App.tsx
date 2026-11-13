import React, { useEffect, useMemo, useState } from 'react';
import { UsisUnifiedHeader } from '../common/header/UsisUnifiedHeader';
import { UsisGlobalFooter } from '../common/footer/UsisGlobalFooter';
import { UsisPortalGate } from '../common/components/UsisPortalGate';
import { UsisBreadcrumbBar } from '../common/components/UsisBreadcrumbBar';
import { UsisAlertModal } from '../common/components/UsisAlertModal';
import { UsisSearchableSelect } from '../common/components/ui/UsisSearchableSelect';
import { UsisSearchInput } from '../common/components/ui/UsisSearchInput';
import {
  deleteQueueJob,
  dispatchEmailJob,
  enqueueEmailJob,
  fetchGatewayStatus,
  fetchQueueJobs,
  isValidGatewaySender,
  parseRecipientList,
  processQueuedJobsSequentially,
} from './services/emailQueueService';
import type { EmailGatewayStatus, EmailJobStatus, EmailQueueJob } from './types';

const MODULE_OPTIONS = [
  { value: 'gateway', label: 'Email Queing Gateway' },
  { value: 'registrar', label: 'Registrar' },
  { value: 'scc-portal', label: 'SCC Portal' },
  { value: 'integrated-admin', label: 'Integrated Admin' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'enrollment', label: 'Enrollment' },
  { value: 'spta', label: 'SPTA' },
  { value: 'merch', label: 'Merch' },
];

const formatTimestamp = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
};

export default function App() {
  const [gatewayStatus, setGatewayStatus] = useState<EmailGatewayStatus | null>(null);
  const [jobs, setJobs] = useState<EmailQueueJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [queueProgress, setQueueProgress] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'danger' | 'info'; text: string } | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<EmailQueueJob | null>(null);

  // Composer form
  const [sourceModule, setSourceModule] = useState('gateway');
  const [fromEmail, setFromEmail] = useState('noreply@leonnhs.edu.ph');
  const [fromName, setFromName] = useState('Leon NHS - USIS');
  const [replyTo, setReplyTo] = useState('');
  const [toInput, setToInput] = useState('');
  const [ccInput, setCcInput] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');

  // Queue filters
  const [statusFilter, setStatusFilter] = useState<'all' | EmailJobStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [statusRes, jobsRes] = await Promise.allSettled([
        fetchGatewayStatus(),
        fetchQueueJobs(),
      ]);
      if (statusRes.status === 'fulfilled') {
        setGatewayStatus(statusRes.value);
        if (
          statusRes.value.defaultFrom &&
          isValidGatewaySender(statusRes.value.defaultFrom) &&
          fromEmail === 'noreply@leonnhs.edu.ph'
        ) {
          setFromEmail(statusRes.value.defaultFrom);
        }
      }
      if (jobsRes.status === 'fulfilled') {
        setJobs(jobsRes.value);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const counts = useMemo(() => {
    let queued = 0;
    let sent = 0;
    let failed = 0;
    for (const job of jobs) {
      if (job.status === 'queued' || job.status === 'processing') queued += 1;
      else if (job.status === 'sent') sent += 1;
      else if (job.status === 'failed') failed += 1;
    }
    return { queued, sent, failed };
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (statusFilter !== 'all' && job.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        return (
          job.fromEmail.toLowerCase().includes(q) ||
          job.toEmails.join(', ').toLowerCase().includes(q) ||
          job.subject.toLowerCase().includes(q) ||
          job.sourceModule.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [jobs, statusFilter, searchQuery]);

  const handleCreateJob = async (sendImmediately: boolean) => {
    const to = parseRecipientList(toInput);
    const cc = parseRecipientList(ccInput);

    if (!isValidGatewaySender(fromEmail)) {
      setBanner({
        type: 'danger',
        text: 'Sender address must be a valid @leonnhs.edu.ph institutional email.',
      });
      return;
    }
    if (to.length === 0) {
      setBanner({
        type: 'danger',
        text: 'Please provide at least one valid recipient email address.',
      });
      return;
    }
    if (!subject.trim() || !bodyText.trim()) {
      setBanner({
        type: 'danger',
        text: 'Subject and message body are required.',
      });
      return;
    }

    try {
      setIsSending(true);
      setBanner(null);

      const created = await enqueueEmailJob({
        sourceModule,
        fromEmail,
        fromName,
        replyTo,
        to,
        cc,
        subject,
        bodyText,
      });

      setJobs((prev) => [created, ...prev]);

      if (sendImmediately) {
        const dispatched = await dispatchEmailJob(created);
        setJobs((prev) => prev.map((item) => (item.id === dispatched.id ? dispatched : item)));
        if (dispatched.status === 'sent') {
          setBanner({
            type: 'success',
            text: `Transactional email sent from ${dispatched.fromEmail} to ${dispatched.toEmails.join(', ')}.`,
          });
          setToInput('');
          setCcInput('');
          setSubject('');
          setBodyText('');
        } else {
          setBanner({
            type: 'danger',
            text: dispatched.lastError || 'Gateway dispatch failed.',
          });
        }
      } else {
        setBanner({
          type: 'info',
          text: `Queued email "${created.subject}" from ${created.fromEmail}. Click "Process Queue" to dispatch.`,
        });
        setToInput('');
        setCcInput('');
        setSubject('');
        setBodyText('');
      }
    } catch (err: any) {
      setBanner({
        type: 'danger',
        text: err?.message || 'Unable to queue transactional email.',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleDispatchSingle = async (job: EmailQueueJob) => {
    setBanner(null);
    const updated = await dispatchEmailJob(job);
    setJobs((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    if (updated.status === 'sent') {
      setBanner({
        type: 'success',
        text: `Sent "${updated.subject}" via ${updated.smtpHost || 'SMTP Relay'}.`,
      });
    } else {
      setBanner({
        type: 'danger',
        text: updated.lastError || `Failed to dispatch "${updated.subject}".`,
      });
    }
  };

  const handleProcessQueue = async () => {
    if (counts.queued === 0) return;
    setIsProcessingQueue(true);
    setBanner(null);
    setQueueProgress(`Processing ${counts.queued} queued email(s) at 1 email/second...`);

    try {
      const summary = await processQueuedJobsSequentially(jobs, (updatedJob, index, total) => {
        setJobs((prev) => prev.map((item) => (item.id === updatedJob.id ? updatedJob : item)));
        setQueueProgress(`Processed ${index} of ${total} (${updatedJob.subject})...`);
      });

      setBanner({
        type: summary.failed > 0 ? 'info' : 'success',
        text: `Queue finished: ${summary.sent} sent, ${summary.failed} failed.`,
      });
    } finally {
      setIsProcessingQueue(false);
      setQueueProgress(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    await deleteQueueJob(id);
    setJobs((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="eq-app">
      <UsisPortalGate moduleKey="email_queing" />

      <header className="site-chrome">
        <div className="content-width">
          <UsisUnifiedHeader
            searchId="eq-header-search"
            searchLabel="Search Email Queue"
            searchPlaceholder="Search sender, recipient, or subject"
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>
      </header>

      <main className="page-frame eq-main">
        <div className="content-width eq-stack">
          <UsisBreadcrumbBar
            rootLabel="Email Queing"
            currentLabel="@leonnhs.edu.ph Transactional Gateway"
          />

          {/* Header & Queue Controls */}
          <section className="section-card">
            <div className="section-card__bar" />
            <div className="section-card__content">
              <div className="eq-page-head">
                <div>
                  <h1 className="eq-page-title">@leonnhs.edu.ph Transactional Email Gateway</h1>
                  <p className="eq-page-subtitle">
                    Centralized SMTP relay gateway and 1-email/second outbound queue for all
                    institutional USIS notifications.
                  </p>
                </div>
                <div className="eq-actions-row">
                  <button
                    type="button"
                    className="eq-btn"
                    onClick={() => void loadAll()}
                    disabled={isLoading || isProcessingQueue}
                  >
                    Refresh
                  </button>
                  <button
                    type="button"
                    className="eq-btn eq-btn--primary"
                    onClick={() => void handleProcessQueue()}
                    disabled={counts.queued === 0 || isProcessingQueue}
                  >
                    {isProcessingQueue
                      ? 'Sending Queue...'
                      : `Process Queue (${counts.queued})`}
                  </button>
                </div>
              </div>

              {queueProgress ? (
                <div className="eq-alert eq-alert--info" style={{ marginTop: 14 }}>
                  {queueProgress}
                </div>
              ) : null}

              {banner ? (
                <div className={`eq-alert eq-alert--${banner.type}`} style={{ marginTop: 14 }}>
                  {banner.text}
                </div>
              ) : null}
            </div>
          </section>

          {/* Metrics Strip using shared section-card */}
          <section className="eq-metrics" aria-label="Gateway summary">
            <div className="section-card">
              <div className="section-card__content">
                <p className="info-card__eyebrow">Relay Host</p>
                <div className="eq-metric-value eq-metric-value--host">
                  {gatewayStatus ? `${gatewayStatus.host}:${gatewayStatus.port}` : 'Checking...'}
                </div>
                <span className="eq-helper">
                  {gatewayStatus?.configured
                    ? `Domain lock: @${gatewayStatus.allowedDomain}`
                    : gatewayStatus?.missing?.length
                      ? `Missing: ${gatewayStatus.missing.join(', ')}`
                      : 'Inspecting SMTP configuration'}
                </span>
              </div>
            </div>

            <div className="section-card">
              <div className="section-card__content">
                <p className="info-card__eyebrow">Queued</p>
                <div className="eq-metric-value">{counts.queued}</div>
                <span className="eq-helper">Dispatches sequentially at 1 email/sec</span>
              </div>
            </div>

            <div className="section-card">
              <div className="section-card__content">
                <p className="info-card__eyebrow">Sent</p>
                <div className="eq-metric-value">{counts.sent}</div>
                <span className="eq-helper">Delivered via @leonnhs.edu.ph relay</span>
              </div>
            </div>

            <div className="section-card">
              <div className="section-card__content">
                <p className="info-card__eyebrow">Failed</p>
                <div className="eq-metric-value">{counts.failed}</div>
                <span className="eq-helper">Retryable from the queue table</span>
              </div>
            </div>
          </section>

          {/* Transactional Email Composer using shared portal-panel & floating-field */}
          <section className="portal-panel">
            <div className="portal-panel__header">
              <h2>Queue or Send Transactional Email</h2>
            </div>
            <div className="portal-panel__body">
              <div className="eq-form">
                <div className="floating-field-grid floating-field-grid--two">
                  <label className="floating-field">
                    <div
                      className="floating-field__control"
                      data-has-value={fromEmail.trim() ? 'true' : 'false'}
                    >
                      <input
                        id="eq-from-email"
                        type="email"
                        placeholder=" "
                        value={fromEmail}
                        onChange={(e) => setFromEmail(e.target.value)}
                      />
                      <span>Sender Address (@leonnhs.edu.ph) *</span>
                    </div>
                    <small>
                      Any @leonnhs.edu.ph transactional alias (e.g. registrar@, scc@, noreply@).
                    </small>
                  </label>

                  <UsisSearchableSelect
                    ariaLabel="Originating USIS Module"
                    label="Originating USIS Module"
                    floatingLabel
                    allowTyping={false}
                    value={sourceModule}
                    onChange={setSourceModule}
                    options={MODULE_OPTIONS}
                  />

                  <label className="floating-field">
                    <div
                      className="floating-field__control"
                      data-has-value={fromName.trim() ? 'true' : 'false'}
                    >
                      <input
                        id="eq-from-name"
                        type="text"
                        placeholder=" "
                        value={fromName}
                        onChange={(e) => setFromName(e.target.value)}
                      />
                      <span>Display Name</span>
                    </div>
                  </label>

                  <label className="floating-field">
                    <div
                      className="floating-field__control"
                      data-has-value={replyTo.trim() ? 'true' : 'false'}
                    >
                      <input
                        id="eq-reply-to"
                        type="email"
                        placeholder=" "
                        value={replyTo}
                        onChange={(e) => setReplyTo(e.target.value)}
                      />
                      <span>Reply-To (Optional)</span>
                    </div>
                  </label>

                  <label className="floating-field">
                    <div
                      className="floating-field__control"
                      data-has-value={toInput.trim() ? 'true' : 'false'}
                    >
                      <input
                        id="eq-to"
                        type="text"
                        placeholder=" "
                        value={toInput}
                        onChange={(e) => setToInput(e.target.value)}
                      />
                      <span>Recipient(s) * (comma-separated for multiple)</span>
                    </div>
                  </label>

                  <label className="floating-field">
                    <div
                      className="floating-field__control"
                      data-has-value={ccInput.trim() ? 'true' : 'false'}
                    >
                      <input
                        id="eq-cc"
                        type="text"
                        placeholder=" "
                        value={ccInput}
                        onChange={(e) => setCcInput(e.target.value)}
                      />
                      <span>CC (Optional)</span>
                    </div>
                  </label>
                </div>

                <label className="floating-field">
                  <div
                    className="floating-field__control"
                    data-has-value={subject.trim() ? 'true' : 'false'}
                  >
                    <input
                      id="eq-subject"
                      type="text"
                      placeholder=" "
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                    <span>Subject *</span>
                  </div>
                </label>

                <label className="floating-field">
                  <div
                    className="floating-field__control"
                    data-has-value={bodyText.trim() ? 'true' : 'false'}
                  >
                    <textarea
                      id="eq-body"
                      placeholder=" "
                      value={bodyText}
                      onChange={(e) => setBodyText(e.target.value)}
                    />
                    <span>Message Body *</span>
                  </div>
                </label>

                <div className="eq-actions-row">
                  <button
                    type="button"
                    className="eq-btn"
                    disabled={isSending || isProcessingQueue}
                    onClick={() => void handleCreateJob(false)}
                  >
                    Add to Queue
                  </button>
                  <button
                    type="button"
                    className="eq-btn eq-btn--primary"
                    disabled={isSending || isProcessingQueue}
                    onClick={() => void handleCreateJob(true)}
                  >
                    {isSending ? 'Sending...' : 'Queue & Send Now'}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Queue & Delivery Log Table */}
          <section className="portal-panel">
            <div className="portal-panel__header">
              <h2>Outbound Email Queue &amp; Delivery Log</h2>
            </div>
            <div className="portal-panel__body">
              <div className="eq-toolbar">
                <div className="eq-tabs" role="tablist" aria-label="Filter queue jobs">
                  {(['all', 'queued', 'sent', 'failed'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      aria-selected={statusFilter === tab}
                      className={`eq-tab ${statusFilter === tab ? 'eq-tab--active' : ''}`}
                      onClick={() => setStatusFilter(tab)}
                    >
                      {tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>

                <div className="eq-toolbar__search">
                  <UsisSearchInput
                    ariaLabel="Filter queue rows"
                    label="Filter by email or subject..."
                    value={searchQuery}
                    onChange={setSearchQuery}
                  />
                </div>
              </div>

              {isLoading ? (
                <div className="eq-empty">Loading email queue...</div>
              ) : filteredJobs.length === 0 ? (
                <div className="eq-empty">
                  No queued or transactional email logs match the current filter.
                </div>
              ) : (
                <div className="eq-table-wrap">
                  <table className="eq-table">
                    <thead>
                      <tr>
                        <th>Sender &amp; Module</th>
                        <th>Recipients</th>
                        <th>Subject</th>
                        <th>Status</th>
                        <th>Updated</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredJobs.map((job) => (
                        <tr key={job.id}>
                          <td>
                            <div className="eq-mono">{job.fromEmail}</div>
                            <span className="eq-helper">{job.sourceModule}</span>
                          </td>
                          <td>
                            <div className="eq-mono">{job.toEmails.join(', ')}</div>
                            {job.ccEmails.length > 0 ? (
                              <span className="eq-helper">CC: {job.ccEmails.join(', ')}</span>
                            ) : null}
                          </td>
                          <td>
                            <div>{job.subject}</div>
                            {job.lastError ? (
                              <span className="eq-helper" style={{ color: '#b42318' }}>
                                {job.lastError}
                              </span>
                            ) : null}
                          </td>
                          <td>
                            <span className={`eq-badge eq-badge--${job.status}`}>
                              {job.status}
                            </span>
                            <div className="eq-helper">Attempts: {job.attempts}</div>
                          </td>
                          <td>{formatTimestamp(job.sentAt || job.updatedAt)}</td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="eq-actions-row" style={{ justifyContent: 'flex-end' }}>
                              {job.status === 'queued' || job.status === 'failed' ? (
                                <button
                                  type="button"
                                  className="eq-btn eq-btn--sm eq-btn--primary"
                                  disabled={isProcessingQueue}
                                  onClick={() => void handleDispatchSingle(job)}
                                >
                                  {job.status === 'failed' ? 'Retry' : 'Send'}
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className="eq-btn eq-btn--sm eq-btn--danger"
                                disabled={isProcessingQueue || job.status === 'processing'}
                                onClick={() => setDeleteTarget(job)}
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* Gateway Integration Contract */}
          <section className="portal-panel">
            <div className="portal-panel__header">
              <h2>Gateway Endpoint Contract (POST /api/email-gateway)</h2>
            </div>
            <div className="portal-panel__body">
              <p className="eq-helper" style={{ marginTop: 0, marginBottom: 10 }}>
                USIS subsystems can dispatch @leonnhs.edu.ph transactional emails through this
                gateway endpoint with built-in 1-email/second SMTP queuing:
              </p>
              <pre className="eq-code-box">
{`POST /api/email-gateway
Content-Type: application/json

{
  "fromEmail": "noreply@leonnhs.edu.ph",
  "fromName": "Leon NHS - USIS",
  "to": ["recipient@example.com"],
  "subject": "USIS Notification",
  "text": "Plain text transactional message"
}`}
              </pre>
            </div>
          </section>
        </div>
      </main>

      <UsisGlobalFooter />

      <UsisAlertModal
        open={Boolean(deleteTarget)}
        title="Remove Email Job"
        message={
          deleteTarget
            ? `Remove "${deleteTarget.subject}" (${deleteTarget.toEmails.join(', ')}) from the email queue log?`
            : ''
        }
        tone="danger"
        confirmLabel="Remove"
        cancelLabel="Cancel"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
    </div>
  );
}
