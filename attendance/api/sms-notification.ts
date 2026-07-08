import type { VercelRequest, VercelResponse } from '@vercel/node';

const DEFAULT_GATEWAY_URL = 'https://skysms.skyio.site/api/v1/sms/send';

const normalize = (value: unknown) => String(value ?? '').trim();

const json = (res: VercelResponse, statusCode: number, payload: Record<string, unknown>) => {
  res.status(statusCode).setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(payload));
};

const normalizePhilippineMobileNumber = (value: string) => {
  const digits = normalize(value).replace(/[^\d+]/g, '');
  if (/^\+639\d{9}$/.test(digits)) return digits;
  if (/^639\d{9}$/.test(digits)) return `+${digits}`;
  if (/^09\d{9}$/.test(digits)) return `+63${digits.slice(1)}`;
  return '';
};

const readBody = (req: VercelRequest) => {
  if (req.body && typeof req.body === 'object') return req.body as Record<string, unknown>;
  if (typeof req.body === 'string' && req.body.trim()) return JSON.parse(req.body) as Record<string, unknown>;
  return {};
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return json(res, 405, { ok: false, message: 'Method not allowed.' });
    }

    const body = readBody(req);
    const apiKey = normalize(body.apiKey);
    const phoneNumber = normalizePhilippineMobileNumber(normalize(body.phoneNumber) || normalize(body.phone_number));
    const message = normalize(body.message);
    const gatewayUrl = DEFAULT_GATEWAY_URL;

    if (!apiKey) {
      return json(res, 400, { ok: false, message: 'API key is required.' });
    }
    if (!phoneNumber) {
      return json(res, 400, { ok: false, message: 'A valid Philippine mobile number is required.' });
    }
    if (!message) {
      return json(res, 400, { ok: false, message: 'Message is required.' });
    }

    const forwardResponse = await fetch(gatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        phone_number: phoneNumber,
        message,
      }),
    });

    const forwardText = await forwardResponse.text().catch(() => '');
    let forwarded: unknown = null;
    try {
      forwarded = forwardText ? JSON.parse(forwardText) : null;
    } catch {
      forwarded = forwardText;
    }

    if (!forwardResponse.ok) {
      return json(res, forwardResponse.status, {
        ok: false,
        message: 'SMS gateway returned an error.',
        details: forwarded,
      });
    }

    return json(res, 200, {
      ok: true,
      message: 'SMS request sent through the SkySMS gateway.',
      forwarded,
    });
  } catch (error: any) {
    return json(res, 500, {
      ok: false,
      message: 'Unable to send SMS through the gateway.',
      details: error?.message || String(error),
    });
  }
}
