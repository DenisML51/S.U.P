import { defineConfig } from 'vitest/config';
import Icons from 'unplugin-icons/vite';

export default defineConfig({
  // The same icons as the app: the store shows messages that carry them (the undo toast).
  plugins: [Icons({ compiler: 'jsx', jsx: 'react', scale: 1 })],
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
});
