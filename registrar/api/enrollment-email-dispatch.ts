import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, normalize, type RegistrarEnrollmentEmailSettings } from './enrollment-email-shared.js';

const json = (res: VercelResponse, statusCode: number, payload: unknown) => {
  res.status(statusCode).setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(payload));
};

const MAX_ATTEMPTS = 5;

type QueueRow = {
  id: string;
  school_id: string | null;
  recipient_email: string;
  email_subject: string;
  email_html: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

    const expectedToken = normalize(process.env.REGISTRAR_EMAIL_DISPATCH_KEY);
    const providedToken = normalize(req.headers['x-dispatch-key'] || req.headers.authorization || '');
    if (expectedToken && providedToken !== expectedToken && providedToken !== `Bearer ${expectedToken}`) {
      return json(res, 401, { error: 'Unauthorized dispatch request.' });
    }

    const limit = Math.max(1, Math.min(50, Number((req.body as any)?.limit || 10)));
    const supabase = getSupabaseAdmin();
    const { data: queueRows, error: queueError } = await supabase
      .from('registrar_enrollment_email_queue')
      .select('id,school_id,recipient_email,email_subject,email_html')
      .eq('send_status', 'pending')
      .lt('attempts', MAX_ATTEMPTS)
      .order('created_at', { ascending: true })
      .limit(limit);
    if (queueError) throw queueError;
    const rows = (queueRows || []) as QueueRow[];

    let sent = 0;
    let failed = 0;
    for (const row of rows) {
      try {
        const schoolId = normalize(row.school_id);
        if (!schoolId) throw new Error('Missing school_id in queue row.');

        const { data: settings, error: settingsError } = await supabase
          .from('registrar_enrollment_email_settings')
          .select('*')
          .eq('school_id', schoolId)
          .maybeSingle();
        if (settingsError) throw settingsError;

        const cfg = (settings || {}) as Partial<RegistrarEnrollmentEmailSettings>;
        if (!cfg.is_enabled) throw new Error('Email service disabled.');
        const endpoint = normalize(cfg.apps_script_web_app_url);
        if (!endpoint) throw new Error('Apps Script Web App URL is not configured.');
        const bearerToken = normalize(cfg.apps_script_bearer_token);
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            type: 'ENROLLMENT_CONFIRMATION',
            email: row.recipient_email,
            to: row.recipient_email,
            subject: row.email_subject,
            htmlContent: row.email_html,
            html: row.email_html,
            senderName: normalize(cfg.from_display_name) || 'DepED USIS Registrar',
            fromDisplayName: normalize(cfg.from_display_name) || 'DepED USIS Registrar',
            replyTo: normalize(cfg.reply_to_email) || undefined,
          }),
        });
        if (!response.ok) {
          throw new Error(`Apps Script send failed (${response.status}): ${await response.text()}`);
        }

        const { error: markSentError } = await supabase
          .from('registrar_enrollment_email_queue')
          .update({
            send_status: 'sent',
            attempts: 1,
            last_error: null,
            sent_at: new Date().toISOString(),
          })
          .eq('id', row.id);
        if (markSentError) throw markSentError;
        sent += 1;
      } catch (error: any) {
        const message = normalize(error?.message || error);
        const { data: currentRow } = await supabase
          .from('registrar_enrollment_email_queue')
          .select('attempts')
          .eq('id', row.id)
          .maybeSingle();
        const nextAttempts = Number((currentRow as any)?.attempts || 0) + 1;
        const nextStatus = nextAttempts >= MAX_ATTEMPTS ? 'failed' : 'pending';
        await supabase
          .from('registrar_enrollment_email_queue')
          .update({
            attempts: nextAttempts,
            send_status: nextStatus,
            last_error: message || 'Unknown dispatch error.',
          })
          .eq('id', row.id);
        failed += 1;
      }
    }

    return json(res, 200, { processed: rows.length, sent, failed });
  } catch (error: any) {
    return json(res, 500, { error: 'Unable to dispatch enrollment emails.', details: error?.message || String(error) });
  }
}
