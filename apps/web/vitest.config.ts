import { defineConfig } from 'vitest/config';
import path from 'node:path';
import Icons from 'unplugin-icons/vite';

export default defineConfig({
  // The same icons as the app: the store shows messages that carry them (the undo toast).
  plugins: [Icons({ compiler: 'jsx', jsx: 'react', scale: 1 })],
  resolve: { alias: { '@itd/i18n': path.resolve(import.meta.dirname, './src/i18n') } },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
});
