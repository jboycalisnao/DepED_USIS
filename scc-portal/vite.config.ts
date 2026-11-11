import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { checkEmailInGoogleAdminDirectory } from './lib/server/googleDirectoryCheck';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '..', '');

  const sccCheckEmailPlugin = {
    name: 'scc-portal-check-email-api',
    configureServer(server: any) {
      server.middlewares.use('/api/scc-check-email', async (req: any, res: any, next: any) => {
        if (req.method !== 'GET') return next();
        try {
          const parsedUrl = new URL(String(req.url || ''), 'http://localhost');
          const email = parsedUrl.searchParams.get('email') || '';
          const result = await checkEmailInGoogleAdminDirectory(email, env);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              ok: true,
              checked: false,
              existsInGoogleAdmin: false,
              reason: err?.message || 'Unable to inspect Google Admin Directory.',
            }),
          );
        }
      });
    },
  };

  return {
    cacheDir: '.vite-cache',
    envDir: '..',
    plugins: [react(), sccCheckEmailPlugin],
    server: {
      port: 3025,
      host: '0.0.0.0',
    },
  };
});
