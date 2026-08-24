import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { parseSmtpRecipients, resolveSmtpSecure, sendSmtpMail } from './server/smtpMailer';

const DEFAULT_SKYSMS_URL = 'https://skysms.skyio.site/api/v1/sms/send';
const SKYSMS_USER_AGENT = 'DepED-USIS-Attendance/1.0 (local-dev; school-sms-notification)';
const normalize = (value: unknown) => String(value ?? '').trim();
const normalizePhilippineMobileNumber = (value: string) => {
  const digits = normalize(value).replace(/[^\d+]/g, '');
  if (/^\+639\d{9}$/.test(digits)) return digits;
  if (/^639\d{9}$/.test(digits)) return `+${digits}`;
  if (/^09\d{9}$/.test(digits)) return `+63${digits.slice(1)}`;
  return '';
};

const forwardSmsRequest = async (gatewayUrl: string, apiKey: string, phoneNumber: string, message: string) => {
  const requestBody = JSON.stringify({
    phone_number: phoneNumber,
    message,
  });

  const response = await fetch(gatewayUrl, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': SKYSMS_USER_AGENT,
    },
    body: requestBody,
  });

  return {
    response,
    requestBody,
  };
};

const isGatewayAccepted = (forwardResponseOk: boolean, forwarded: unknown) => {
  if (!forwardResponseOk) return false;
  if (forwarded && typeof forwarded === 'object' && 'success' in forwarded) {
    return Boolean((forwarded as { success?: unknown }).success);
  }
  if (forwarded && typeof forwarded === 'object' && 'message' in forwarded) {
    const gatewayMessage = String((forwarded as { message?: unknown }).message || '').toLowerCase();
    if (gatewayMessage.includes('access denied') || gatewayMessage.includes('bot-protection')) {
      return false;
    }
  }
  return true;
};

const smsNotificationDevProxy = () => ({
  name: 'attendance-sms-notification-dev-proxy',
  configureServer(server: any) {
    server.middlewares.use('/api/sms-notification', async (req: any, res: any, next: any) => {
      if (req.method !== 'POST') return next();

      try {
        const bodyText = await new Promise<string>((resolve, reject) => {
          let raw = '';
          req.on('data', (chunk: Buffer) => {
            raw += chunk.toString('utf8');
          });
          req.on('end', () => resolve(raw));
          req.on('error', reject);
        });

        const body = bodyText ? JSON.parse(bodyText) : {};
        const apiKey = normalize(body.apiKey);
        const phoneNumber = normalizePhilippineMobileNumber(normalize(body.phoneNumber) || normalize(body.phone_number));
        const message = normalize(body.message);
        const gatewayUrl = DEFAULT_SKYSMS_URL;

        if (!apiKey) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: false, message: 'API key is required.' }));
          return;
        }
        if (!phoneNumber) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: false, message: 'A valid Philippine mobile number is required.' }));
          return;
        }
        if (!message) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: false, message: 'Message is required.' }));
          return;
        }

        const forwardedRequest = await forwardSmsRequest(gatewayUrl, apiKey, phoneNumber, message);
        const forwardResponse = forwardedRequest.response;

        const forwardText = await forwardResponse.text().catch(() => '');
        let forwarded: unknown = null;
        try {
          forwarded = forwardText ? JSON.parse(forwardText) : null;
        } catch {
          forwarded = forwardText;
        }

        const gatewayAccepted = isGatewayAccepted(forwardResponse.ok, forwarded);

        res.statusCode = gatewayAccepted ? forwardResponse.status : 502;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(
          gatewayAccepted
            ? {
                ok: true,
                message: 'SMS request sent through the SkySMS gateway.',
                forwarded,
                gatewayStatus: forwardResponse.status,
              }
            : {
                ok: false,
                message: 'SMS gateway returned an error.',
                details: forwarded,
                gatewayStatus: forwardResponse.status,
                gatewayResponseText: forwardText,
                gatewayRequest: {
                  url: gatewayUrl,
                  method: 'POST',
                  headers: {
                    'X-API-Key': '[configured]',
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'User-Agent': SKYSMS_USER_AGENT,
                  },
                  body: forwardedRequest.requestBody,
                },
              },
        ));
      } catch (error: any) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          ok: false,
          message: 'Unable to send SMS through the gateway.',
          details: error?.message || String(error),
        }));
      }
    });
  },
});

const readRequestBody = (req: any) =>
  new Promise<string>((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk: Buffer) => {
      raw += chunk.toString('utf8');
    });
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });

const emailNotificationDevProxy = (env: Record<string, string>) => ({
  name: 'attendance-kiosk-disconnect-email-dev-proxy',
  configureServer(server: any) {
    server.middlewares.use('/api/kiosk-disconnect-email', async (req: any, res: any, next: any) => {
      if (req.method !== 'POST') return next();

      try {
        const bodyText = await readRequestBody(req);
        const body = bodyText ? JSON.parse(bodyText) : {};
        const host = normalize(env.ATTENDANCE_SMTP_HOST || 'smtp.gmail.com');
        const port = Number(env.ATTENDANCE_SMTP_PORT || 465);
        const secure = resolveSmtpSecure(env.ATTENDANCE_SMTP_SECURE, port);
        const username = normalize(env.ATTENDANCE_SMTP_USER);
        const password = normalize(env.ATTENDANCE_SMTP_PASSWORD || env.ATTENDANCE_SMTP_APP_PASSWORD);
        const from = normalize(env.ATTENDANCE_SMTP_FROM || username);
        const recipients = parseSmtpRecipients(
          normalize(env.ATTENDANCE_KIOSK_ALERT_RECIPIENTS || env.ATTENDANCE_KIOSK_ALERT_RECIPIENT),
        );
        const missing = [
          !host ? 'ATTENDANCE_SMTP_HOST' : '',
          !port ? 'ATTENDANCE_SMTP_PORT' : '',
          !username ? 'ATTENDANCE_SMTP_USER' : '',
          !password ? 'ATTENDANCE_SMTP_PASSWORD or ATTENDANCE_SMTP_APP_PASSWORD' : '',
          !from ? 'ATTENDANCE_SMTP_FROM' : '',
          recipients.length === 0 ? 'ATTENDANCE_KIOSK_ALERT_RECIPIENTS' : '',
        ].filter(Boolean);

        if (missing.length > 0) {
          res.statusCode = 503;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            ok: false,
            message: 'Kiosk email notification is not configured.',
            missing,
          }));
          return;
        }

        const stationName = normalize(body.stationName) || 'Attendance kiosk';
        const status = normalize(body.status) || 'disconnected';
        const occurredAt = normalize(body.occurredAt) || new Date().toISOString();
        const details = normalize(body.details) || 'The kiosk serial device link was lost.';

        await sendSmtpMail({
          host,
          port,
          secure,
          username,
          password,
          from,
          to: recipients,
          subject: `[DepED USIS Attendance] ${stationName} serial device disconnected`,
          text: [
            'DepED USIS Attendance Kiosk Alert',
            '',
            `Station: ${stationName}`,
            `Status: ${status}`,
            `Time: ${occurredAt}`,
            '',
            details,
            '',
            'Check the kiosk computer, USB cable, RFID reader, and Arduino/serial device connection.',
          ].join('\n'),
        });

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          ok: true,
          message: 'Kiosk disconnect email notification sent.',
        }));
      } catch (error: any) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          ok: false,
          message: 'Unable to send kiosk disconnect email notification.',
          details: error?.message || String(error),
        }));
      }
    });
  },
});

export default defineConfig(({ mode }) => {
    const rootEnv = loadEnv(mode, '..', '');
    const attendanceEnv = loadEnv(mode, '.', '');
    const env = { ...rootEnv, ...attendanceEnv };
    return {
      envDir: '..',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), smsNotificationDevProxy(), emailNotificationDevProxy(env)],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
