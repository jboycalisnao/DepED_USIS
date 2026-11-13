import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import {
  getGatewaySmtpConfigStatus,
  sendGatewaySmtpEmail,
} from './lib/server/smtpGatewayMailer';

const readJsonBody = async (req: any): Promise<Record<string, unknown>> => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
};

const sendJson = (res: any, statusCode: number, payload: unknown) => {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
};

export default defineConfig(({ mode }) => {
  const getEnv = () => loadEnv(mode, '..', '');

  const emailGatewayPlugin = {
    name: 'usis-email-gateway-api',
    configureServer(server: any) {
      server.middlewares.use('/api/email-gateway', async (req: any, res: any) => {
        const env = getEnv();

        if (req.method === 'GET') {
          try {
            sendJson(res, 200, getGatewaySmtpConfigStatus(env));
          } catch (err: any) {
            sendJson(res, 500, {
              error: err?.message || 'Unable to inspect email gateway configuration.',
            });
          }
          return;
        }

        if (req.method === 'POST') {
          try {
            const body = await readJsonBody(req);
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

            const result = await sendGatewaySmtpEmail(
              {
                fromEmail: body.fromEmail != null ? String(body.fromEmail) : undefined,
                fromName: body.fromName != null ? String(body.fromName) : undefined,
                to: recipientsRaw.map(String),
                cc: ccRaw.map(String),
                replyTo: body.replyTo != null ? String(body.replyTo) : undefined,
                subject: String(body.subject || ''),
                text: String(body.text || body.message || ''),
                html: body.html != null ? String(body.html) : undefined,
              },
              env,
            );

            sendJson(res, 200, result);
          } catch (err: any) {
            sendJson(res, 400, {
              error: err?.message || 'Unable to send transactional email via gateway.',
            });
          }
          return;
        }

        res.setHeader('Allow', 'GET, POST');
        sendJson(res, 405, { error: 'Method not allowed.' });
      });
    },
  };

  return {
    cacheDir: '.vite-cache',
    envDir: '..',
    plugins: [react(), emailGatewayPlugin],
    server: {
      port: 3026,
      host: '0.0.0.0',
    },
  };
});
