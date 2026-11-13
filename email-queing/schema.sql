-- ==============================================================================
-- DepED USIS: Email Queing Transactional Gateway Schema
-- Module Prefix: email_queing_
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.email_queing_jobs (
  id TEXT PRIMARY KEY,
  source_module VARCHAR(60) NOT NULL DEFAULT 'gateway',
  from_email TEXT NOT NULL,
  from_name TEXT NOT NULL DEFAULT 'Leon NHS - USIS',
  reply_to TEXT,
  to_emails TEXT[] NOT NULL DEFAULT '{}',
  cc_emails TEXT[] NOT NULL DEFAULT '{}',
  subject TEXT NOT NULL,
  body_text TEXT NOT NULL,
  body_html TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'processing', 'sent', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  last_error TEXT,
  smtp_host TEXT,
  smtp_port INTEGER,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_email_queing_jobs_status_sched
  ON public.email_queing_jobs(status, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_email_queing_jobs_source
  ON public.email_queing_jobs(source_module);

CREATE INDEX IF NOT EXISTS idx_email_queing_jobs_created
  ON public.email_queing_jobs(created_at DESC);
