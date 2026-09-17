import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  cacheDir: '.vite-cache',
  envDir: '..',
  plugins: [react()],
  server: {
    port: 3022,
    host: '0.0.0.0',
  },
});
