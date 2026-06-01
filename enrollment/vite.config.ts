import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  envDir: '..',
  plugins: [react()],
  server: {
    port: 3012,
    host: '0.0.0.0',
    proxy: {
      '/api/enrollment-email-queue': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/api/enrollment-email-dispatch': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
