import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  envDir: '..',
  plugins: [react()],
  server: {
    port: 3014,
    host: '0.0.0.0',
  },
});
