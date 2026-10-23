import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

/** Where `npm run dev` forwards `/api`; the API runs on 4000 by default. */
const apiTarget = process.env.VITE_DEV_API_TARGET ?? 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      '/api': { target: apiTarget, changeOrigin: false, ws: true },
    },
  },
  preview: {
    port: 3000,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
});
