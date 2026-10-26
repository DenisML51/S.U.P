import path from 'node:path';
import type { Plugin } from 'vite';
import { compileDictionary } from './scripts/i18nDictionary';

const ID = 'virtual:i18n/en';
const RESOLVED = `\0${ID}`;

/** Serves `virtual:i18n/en`: the dictionary of `src/i18n/en`, compiled by `compileDictionary`. */
export function i18nDictionary(): Plugin {
  const dir = path.resolve(import.meta.dirname, 'src/i18n/en');
  return {
    name: 'itd-i18n-dictionary',
    // plugin-react asks to pre-bundle the JSX runtime, taking `@itd/i18n` for a package; it is the
    // app's own code, and a pre-bundled copy would keep a second, stale translator.
    configResolved(config) {
      const optimize = config.optimizeDeps as { include?: string[]; exclude?: string[] };
      optimize.include = optimize.include?.filter((id) => !id.startsWith('@itd/i18n'));
      optimize.exclude = [...(optimize.exclude ?? []), '@itd/i18n/jsx-runtime', '@itd/i18n/jsx-dev-runtime'];
    },
    resolveId: (id) => (id === ID ? RESOLVED : undefined),
    load(id) {
      if (id !== RESOLVED) return;
      const { files, dictionary } = compileDictionary(dir);
      for (const file of files) this.addWatchFile(file);
      return `export default ${JSON.stringify(dictionary)};`;
    },
  };
}
