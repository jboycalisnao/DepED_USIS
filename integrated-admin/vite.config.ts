import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  envDir: '..',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../coordinator'),
    },
  },
  server: {
    port: 3024,
    host: '0.0.0.0',
  },
});
