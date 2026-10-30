import { defineConfig } from 'vitest/config';
import path from 'node:path';
import Icons from 'unplugin-icons/vite';
import { i18nDictionary } from './i18nPlugin';

export default defineConfig({
  // The same icons as the app: the store shows messages that carry them (the undo toast).
  // The dictionary too: components under test reach the i18n module.
  plugins: [Icons({ compiler: 'jsx', jsx: 'react', scale: 1 }), i18nDictionary()],
  resolve: { alias: { '@itd/i18n': path.resolve(import.meta.dirname, './src/i18n') } },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
});
