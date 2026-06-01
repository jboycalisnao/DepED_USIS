import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const normalize = (value: unknown) => String(value ?? '').trim();
const MAX_ATTEMPTS = 5;

const json = (res: VercelResponse, statusCode: number, payload: unknown) => {
  res.status(statusCode).setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(payload));
};

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase service-role credentials are missing.');
  return createClient(supabaseUrl, serviceRoleKey);
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

    let sent = 0;
    let failed = 0;
    for (const row of queueRows || []) {
      try {
        const schoolId = normalize((row as any).school_id);
        if (!schoolId) throw new Error('Missing school_id in queue row.');
        const { data: settings, error: settingsError } = await supabase
          .from('registrar_enrollment_email_settings')
          .select('*')
          .eq('school_id', schoolId)
          .maybeSingle();
        if (settingsError) throw settingsError;
        if (!(settings as any)?.is_enabled) throw new Error('Email service disabled.');

        const endpoint = normalize((settings as any)?.apps_script_web_app_url);
        const bearer = normalize((settings as any)?.apps_script_bearer_token);
        if (!endpoint) throw new Error('Apps Script Web App URL is not configured.');

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (bearer) headers.Authorization = `Bearer ${bearer}`;

        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            type: 'ENROLLMENT_CONFIRMATION',
            email: String((row as any).recipient_email || ''),
            to: String((row as any).recipient_email || ''),
            subject: String((row as any).email_subject || ''),
            htmlContent: String((row as any).email_html || ''),
            html: String((row as any).email_html || ''),
            senderName: String((settings as any).from_display_name || 'DepED USIS Registrar'),
            fromDisplayName: String((settings as any).from_display_name || 'DepED USIS Registrar'),
            replyTo: normalize((settings as any).reply_to_email) || undefined,
          }),
        });
        if (!response.ok) throw new Error(`Apps Script send failed (${response.status}): ${await response.text()}`);

        await supabase
          .from('registrar_enrollment_email_queue')
          .update({ send_status: 'sent', attempts: 1, last_error: null, sent_at: new Date().toISOString() })
          .eq('id', String((row as any).id || ''));
        sent += 1;
      } catch (error: any) {
        const { data: currentRow } = await supabase
          .from('registrar_enrollment_email_queue')
          .select('attempts')
          .eq('id', String((row as any).id || ''))
          .maybeSingle();
        const nextAttempts = Number((currentRow as any)?.attempts || 0) + 1;
        const nextStatus = nextAttempts >= MAX_ATTEMPTS ? 'failed' : 'pending';
        await supabase
          .from('registrar_enrollment_email_queue')
          .update({
            attempts: nextAttempts,
            send_status: nextStatus,
            last_error: normalize(error?.message || error) || 'Unknown dispatch error.',
          })
          .eq('id', String((row as any).id || ''));
        failed += 1;
      }
    }

    return json(res, 200, { processed: (queueRows || []).length, sent, failed });
  } catch (error: any) {
    return json(res, 500, { error: 'Unable to dispatch enrollment emails.', details: error?.message || String(error) });
  }
}
