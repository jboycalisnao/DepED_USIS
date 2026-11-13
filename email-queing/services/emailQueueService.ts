import { supabase } from '@deped-usis/shared-supabase';
import type {
  EmailGatewayStatus,
  EmailJobStatus,
  EmailQueueJob,
  EnqueueEmailInput,
} from '../types';

const EMAIL_JOBS_TABLE = 'email_queing_jobs';
const LOCAL_STORAGE_KEY = 'usis_email_queing_jobs_v1';
const ALLOWED_DOMAIN = 'leonnhs.edu.ph';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sleepMs = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

export function parseRecipientList(raw: string): string[] {
  const seen = new Set<string>();
  const list: string[] = [];
  for (const part of String(raw || '').split(/[\s,;]+/)) {
    const email = part.trim().toLowerCase();
    if (!email || !EMAIL_REGEX.test(email) || seen.has(email)) continue;
    seen.add(email);
    list.push(email);
  }
  return list;
}

export function isValidGatewaySender(email: string): boolean {
  const clean = String(email || '').trim().toLowerCase();
  return EMAIL_REGEX.test(clean) && clean.endsWith(`@${ALLOWED_DOMAIN}`);
}

function readLocalJobs(): EmailQueueJob[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalJobs(jobs: EmailQueueJob[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(jobs));
  } catch {
    // ignore storage quota failures
  }
}

function mapDbRowToJob(row: any): EmailQueueJob {
  return {
    id: String(row.id),
    sourceModule: String(row.source_module || 'gateway'),
    fromEmail: String(row.from_email || `noreply@${ALLOWED_DOMAIN}`),
    fromName: String(row.from_name || 'Leon NHS - USIS'),
    replyTo: row.reply_to ? String(row.reply_to) : undefined,
    toEmails: Array.isArray(row.to_emails) ? row.to_emails.map(String) : [],
    ccEmails: Array.isArray(row.cc_emails) ? row.cc_emails.map(String) : [],
    subject: String(row.subject || ''),
    bodyText: String(row.body_text || ''),
    bodyHtml: row.body_html ? String(row.body_html) : undefined,
    status: (row.status || 'queued') as EmailJobStatus,
    attempts: Number(row.attempts || 0),
    maxAttempts: Number(row.max_attempts || 3),
    lastError: row.last_error ? String(row.last_error) : undefined,
    smtpHost: row.smtp_host ? String(row.smtp_host) : undefined,
    smtpPort: row.smtp_port != null ? Number(row.smtp_port) : undefined,
    scheduledAt: String(row.scheduled_at || row.created_at || new Date().toISOString()),
    sentAt: row.sent_at ? String(row.sent_at) : undefined,
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || row.created_at || new Date().toISOString()),
  };
}

export async function fetchGatewayStatus(): Promise<EmailGatewayStatus> {
  const res = await fetch('/api/email-gateway');
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || 'Unable to inspect email gateway configuration.');
  }
  return data as EmailGatewayStatus;
}

export async function fetchQueueJobs(): Promise<EmailQueueJob[]> {
  try {
    const { data, error } = await supabase
      .from(EMAIL_JOBS_TABLE)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (!error && Array.isArray(data)) {
      const mapped = data.map(mapDbRowToJob);
      writeLocalJobs(mapped);
      return mapped;
    }
  } catch {
    // fallback to localStorage when offline or table not yet created
  }
  return readLocalJobs();
}

async function persistJobUpdate(job: EmailQueueJob): Promise<EmailQueueJob> {
  const local = readLocalJobs();
  const nextLocal = local.some((item) => item.id === job.id)
    ? local.map((item) => (item.id === job.id ? job : item))
    : [job, ...local];
  writeLocalJobs(nextLocal);

  try {
    await supabase.from(EMAIL_JOBS_TABLE).upsert(
      [
        {
          id: job.id,
          source_module: job.sourceModule,
          from_email: job.fromEmail,
          from_name: job.fromName,
          reply_to: job.replyTo || null,
          to_emails: job.toEmails,
          cc_emails: job.ccEmails,
          subject: job.subject,
          body_text: job.bodyText,
          body_html: job.bodyHtml || null,
          status: job.status,
          attempts: job.attempts,
          max_attempts: job.maxAttempts,
          last_error: job.lastError || null,
          smtp_host: job.smtpHost || null,
          smtp_port: job.smtpPort ?? null,
          scheduled_at: job.scheduledAt,
          sent_at: job.sentAt || null,
          created_at: job.createdAt,
          updated_at: job.updatedAt,
        },
      ],
      { onConflict: 'id' },
    );
  } catch {
    // local cache preserved if offline
  }

  return job;
}

export async function enqueueEmailJob(input: EnqueueEmailInput): Promise<EmailQueueJob> {
  const fromEmail = input.fromEmail.trim().toLowerCase();
  if (!isValidGatewaySender(fromEmail)) {
    throw new Error(`Sender email must end with @${ALLOWED_DOMAIN}.`);
  }
  if (input.to.length === 0) {
    throw new Error('At least one valid recipient email address is required.');
  }
  if (!input.subject.trim()) {
    throw new Error('Subject is required.');
  }
  if (!input.bodyText.trim()) {
    throw new Error('Message body is required.');
  }

  const now = new Date().toISOString();
  const newJob: EmailQueueJob = {
    id: `em-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sourceModule: input.sourceModule.trim() || 'gateway',
    fromEmail,
    fromName: (input.fromName || '').trim() || 'Leon NHS - USIS',
    replyTo: input.replyTo?.trim() || undefined,
    toEmails: input.to,
    ccEmails: input.cc || [],
    subject: input.subject.trim(),
    bodyText: input.bodyText.trim(),
    bodyHtml: input.bodyHtml?.trim() || undefined,
    status: 'queued',
    attempts: 0,
    maxAttempts: 3,
    scheduledAt: now,
    createdAt: now,
    updatedAt: now,
  };

  return persistJobUpdate(newJob);
}

export async function dispatchEmailJob(job: EmailQueueJob): Promise<EmailQueueJob> {
  const processingJob: EmailQueueJob = {
    ...job,
    status: 'processing',
    attempts: job.attempts + 1,
    lastError: undefined,
    updatedAt: new Date().toISOString(),
  };
  await persistJobUpdate(processingJob);

  try {
    const res = await fetch('/api/email-gateway', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromEmail: processingJob.fromEmail,
        fromName: processingJob.fromName,
        replyTo: processingJob.replyTo,
        to: processingJob.toEmails,
        cc: processingJob.ccEmails,
        subject: processingJob.subject,
        text: processingJob.bodyText,
        html: processingJob.bodyHtml,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || 'SMTP relay rejected transactional email.');
    }

    const now = new Date().toISOString();
    return persistJobUpdate({
      ...processingJob,
      status: 'sent',
      smtpHost: data?.host ? String(data.host) : processingJob.smtpHost,
      smtpPort: data?.port != null ? Number(data.port) : processingJob.smtpPort,
      sentAt: now,
      updatedAt: now,
    });
  } catch (err: any) {
    return persistJobUpdate({
      ...processingJob,
      status: 'failed',
      lastError: err?.message || 'Unable to send transactional email.',
      updatedAt: new Date().toISOString(),
    });
  }
}

export async function processQueuedJobsSequentially(
  jobs: EmailQueueJob[],
  onProgress?: (updatedJob: EmailQueueJob, index: number, total: number) => void,
): Promise<{ sent: number; failed: number }> {
  const pending = [...jobs]
    .filter((job) => job.status === 'queued')
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < pending.length; i += 1) {
    if (i > 0) {
      await sleepMs(1000);
    }
    const result = await dispatchEmailJob(pending[i]);
    if (result.status === 'sent') {
      sent += 1;
    } else {
      failed += 1;
    }
    onProgress?.(result, i + 1, pending.length);
  }

  return { sent, failed };
}

export async function deleteQueueJob(jobId: string): Promise<void> {
  const remaining = readLocalJobs().filter((item) => item.id !== jobId);
  writeLocalJobs(remaining);
  try {
    await supabase.from(EMAIL_JOBS_TABLE).delete().eq('id', jobId);
  } catch {
    // ignore offline delete failures
  }
}
