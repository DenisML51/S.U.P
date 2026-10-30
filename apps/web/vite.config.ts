import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import Icons from 'unplugin-icons/vite';
import path from 'node:path';
import { i18nDictionary } from './i18nPlugin';

/** Where `npm run dev` forwards `/api`; the API runs on 4000 by default. */
const apiTarget = process.env.VITE_DEV_API_TARGET ?? 'http://localhost:4000';

export default defineConfig({
  // Icons compile to inline React components at build time: offline and tree-shaken. JSX goes
  // through the app's own runtime, which shows texts in the chosen language (src/i18n).
  plugins: [react({ jsxImportSource: '@itd/i18n' }), Icons({ compiler: 'jsx', jsx: 'react', scale: 1 }), i18nDictionary()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@itd/i18n': path.resolve(__dirname, './src/i18n'),
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
