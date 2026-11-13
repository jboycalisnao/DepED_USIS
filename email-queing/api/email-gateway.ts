import {
  getGatewaySmtpConfigStatus,
  sendGatewaySmtpEmail,
} from '../lib/server/smtpGatewayMailer';

type ApiRequest = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
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
      return sendJson(res, 200, getGatewaySmtpConfigStatus());
    } catch (err: any) {
      return sendJson(res, 500, {
        error: err?.message || 'Unable to inspect email gateway configuration.',
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const configuredKey = String(process.env.EMAIL_GATEWAY_API_KEY || '').trim();
      if (configuredKey) {
        const headerKey = String(
          req.headers?.['x-gateway-key'] ||
            String(req.headers?.authorization || '').replace(/^Bearer\s+/i, '') ||
            '',
        ).trim();
        if (headerKey && headerKey !== configuredKey) {
          return sendJson(res, 401, { error: 'Invalid email gateway API key.' });
        }
      }

      const body = parseBody(req.body);
      const recipientsRaw = Array.isArray(body.to)
        ? body.to
        : Array.isArray(body.recipients)
          ? body.recipients
          : typeof body.to === 'string'
            ? body.to.split(/[;,]/)
            : [];

      const ccRaw = Array.isArray(body.cc)
        ? body.cc
        : typeof body.cc === 'string'
          ? body.cc.split(/[;,]/)
          : [];

      const result = await sendGatewaySmtpEmail({
        fromEmail: body.fromEmail != null ? String(body.fromEmail) : undefined,
        fromName: body.fromName != null ? String(body.fromName) : undefined,
        to: recipientsRaw.map(String),
        cc: ccRaw.map(String),
        replyTo: body.replyTo != null ? String(body.replyTo) : undefined,
        subject: String(body.subject || ''),
        text: String(body.text || body.message || ''),
        html: body.html != null ? String(body.html) : undefined,
      });

      return sendJson(res, 200, result);
    } catch (err: any) {
      return sendJson(res, 400, {
        error: err?.message || 'Unable to send transactional email via gateway.',
      });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return sendJson(res, 405, { error: 'Method not allowed.' });
}
