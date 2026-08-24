import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parseSmtpRecipients, resolveSmtpSecure, sendSmtpMail } from '../server/smtpMailer';

const normalize = (value: unknown) => String(value ?? '').trim();

const json = (res: VercelResponse, statusCode: number, payload: Record<string, unknown>) => {
  res.status(statusCode).setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(payload));
};

const readBody = (req: VercelRequest) => {
  if (req.body && typeof req.body === 'object') return req.body as Record<string, unknown>;
  if (typeof req.body === 'string' && req.body.trim()) return JSON.parse(req.body) as Record<string, unknown>;
  return {};
};

const getSmtpConfig = () => {
  const host = normalize(process.env.ATTENDANCE_SMTP_HOST || 'smtp.gmail.com');
  const port = Number(process.env.ATTENDANCE_SMTP_PORT || 465);
  const secure = resolveSmtpSecure(process.env.ATTENDANCE_SMTP_SECURE, port);
  const username = normalize(process.env.ATTENDANCE_SMTP_USER);
  const password = normalize(process.env.ATTENDANCE_SMTP_PASSWORD || process.env.ATTENDANCE_SMTP_APP_PASSWORD);
  const from = normalize(process.env.ATTENDANCE_SMTP_FROM || username);
  const recipients = parseSmtpRecipients(
    normalize(process.env.ATTENDANCE_KIOSK_ALERT_RECIPIENTS || process.env.ATTENDANCE_KIOSK_ALERT_RECIPIENT),
  );

  return { host, port, secure, username, password, from, recipients };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return json(res, 405, { ok: false, message: 'Method not allowed.' });
    }

    const config = getSmtpConfig();
    const missing = [
      !config.host ? 'ATTENDANCE_SMTP_HOST' : '',
      !config.port ? 'ATTENDANCE_SMTP_PORT' : '',
      !config.username ? 'ATTENDANCE_SMTP_USER' : '',
      !config.password ? 'ATTENDANCE_SMTP_PASSWORD or ATTENDANCE_SMTP_APP_PASSWORD' : '',
      !config.from ? 'ATTENDANCE_SMTP_FROM' : '',
      config.recipients.length === 0 ? 'ATTENDANCE_KIOSK_ALERT_RECIPIENTS' : '',
    ].filter(Boolean);

    if (missing.length > 0) {
      return json(res, 503, {
        ok: false,
        message: 'Kiosk email notification is not configured.',
        missing,
      });
    }

    const body = readBody(req);
    const stationName = normalize(body.stationName) || 'Attendance kiosk';
    const status = normalize(body.status) || 'disconnected';
    const occurredAt = normalize(body.occurredAt) || new Date().toISOString();
    const details = normalize(body.details) || 'The kiosk serial device link was lost.';

    const subject = `[DepED USIS Attendance] ${stationName} serial device disconnected`;
    const text = [
      'DepED USIS Attendance Kiosk Alert',
      '',
      `Station: ${stationName}`,
      `Status: ${status}`,
      `Time: ${occurredAt}`,
      '',
      details,
      '',
      'Check the kiosk computer, USB cable, RFID reader, and Arduino/serial device connection.',
    ].join('\n');

    await sendSmtpMail({
      host: config.host,
      port: config.port,
      secure: config.secure,
      username: config.username,
      password: config.password,
      from: config.from,
      to: config.recipients,
      subject,
      text,
    });

    return json(res, 200, {
      ok: true,
      message: 'Kiosk disconnect email notification sent.',
    });
  } catch (error: any) {
    return json(res, 500, {
      ok: false,
      message: 'Unable to send kiosk disconnect email notification.',
      details: error?.message || String(error),
    });
  }
}
