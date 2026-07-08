import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const DEFAULT_SKYSMS_URL = 'https://skysms.skyio.site/api/v1/sms/send';
const normalize = (value: unknown) => String(value ?? '').trim();
const normalizePhilippineMobileNumber = (value: string) => {
  const digits = normalize(value).replace(/[^\d+]/g, '');
  if (/^\+639\d{9}$/.test(digits)) return digits;
  if (/^639\d{9}$/.test(digits)) return `+${digits}`;
  if (/^09\d{9}$/.test(digits)) return `+63${digits.slice(1)}`;
  return '';
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

        res.statusCode = forwardResponse.status;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(
          forwardResponse.ok
            ? { ok: true, message: 'SMS request sent through the SkySMS gateway.', forwarded }
            : { ok: false, message: 'SMS gateway returned an error.', details: forwarded },
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

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '..', '');
    return {
      envDir: '..',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), smsNotificationDevProxy()],
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
