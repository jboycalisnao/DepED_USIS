import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  envDir: '..',
  plugins: [react(), cloudflare()],
  server: {
    port: 3014,
    host: '0.0.0.0',
  },
});