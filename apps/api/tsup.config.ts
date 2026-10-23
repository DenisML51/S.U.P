import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { main: 'src/main.ts', cli: 'src/cli/index.ts' },
  format: 'esm',
  platform: 'node',
  target: 'node22',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  // Workspace packages ship TypeScript sources: bundle them; npm dependencies stay external.
  noExternal: [/^@itd\//],
});
