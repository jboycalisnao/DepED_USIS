import {
  getGoogleSmtpConfigStatus,
  sendSmtpEmailNotification,
} from '../lib/server/googleSmtpMailer';

type ApiRequest = {
  method?: string;
  url?: string;
  body?: unknown;
};

type ApiResponse = {
  status(code: number): ApiResponse;
  setHeader(name: string, value: string): void;
  send(body: string): void;
};

const sendJson = (res: ApiResponse, statusCode: number, payload: Record<string, unknown>) => {
  res.status(statusCode).setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(payload));
};

const parseBody = (raw: unknown): Record<string, unknown> => {
  if (typeof raw === 'string') {
    return JSON.parse(raw || '{}') as Record<string, unknown>;
  }
  return (raw || {}) as Record<string, unknown>;
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method === 'GET') {
    try {
      return sendJson(res, 200, getGoogleSmtpConfigStatus());
    } catch (err: any) {
      return sendJson(res, 500, {
        error: err?.message || 'Unable to inspect Google SMTP configuration.',
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = parseBody(req.body);
      const recipientsRaw = Array.isArray(body.recipients)
        ? body.recipients
        : Array.isArray(body.to)
          ? body.to
          : typeof body.to === 'string'
            ? [body.to]
            : [];

      const to = recipientsRaw.map((entry) =>
        typeof entry === 'string'
          ? entry
          : String((entry as { email?: unknown })?.email || ''),
      );

      const cc = Array.isArray(body.cc)
        ? body.cc.map(String)
        : typeof body.cc === 'string'
          ? [body.cc]
          : [];

      const result = await sendSmtpEmailNotification({
        to,
        cc,
        replyTo: body.replyTo != null ? String(body.replyTo) : undefined,
        subject: String(body.subject || ''),
        text: String(body.text || body.message || ''),
      });

      return sendJson(res, 200, result);
    } catch (err: any) {
      return sendJson(res, 400, {
        error: err?.message || 'Unable to send email notification via Google SMTP.',
      });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return sendJson(res, 405, { error: 'Method not allowed.' });
}
