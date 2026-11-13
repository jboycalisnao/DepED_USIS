export type EmailJobStatus = 'queued' | 'processing' | 'sent' | 'failed';

export interface EmailQueueJob {
  id: string;
  sourceModule: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
  toEmails: string[];
  ccEmails: string[];
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  status: EmailJobStatus;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  smtpHost?: string;
  smtpPort?: number;
  scheduledAt: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailGatewayStatus {
  ok: boolean;
  configured: boolean;
  host: string;
  port: number;
  defaultFrom: string;
  defaultFromName: string;
  allowedDomain: string;
  missing: string[];
}

export interface EnqueueEmailInput {
  sourceModule: string;
  fromEmail: string;
  fromName?: string;
  replyTo?: string;
  to: string[];
  cc?: string[];
  subject: string;
  bodyText: string;
  bodyHtml?: string;
}
