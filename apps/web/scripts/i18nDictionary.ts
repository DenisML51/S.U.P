import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { isTemplate, textKey } from '../src/i18n/hash';

/**
 * The English dictionary as the app gets it (`virtual:i18n/en`): the files of `src/i18n/en` (Russian →
 * English, as written by translators) merged, whole texts keyed by the hash of their Russian and
 * templates kept with theirs. Texts not yet translated (an empty value) are left out.
 */
export function compileDictionary(dir: string) {
  const exact: Record<string, string> = {};
  const templates: Record<string, string> = {};
  const files = readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .sort();
  for (const file of files) {
    const entries = JSON.parse(readFileSync(path.join(dir, file), 'utf8')) as Record<string, string>;
    for (const [ru, en] of Object.entries(entries)) {
      const key = ru.trim();
      if (!key || typeof en !== 'string' || !en) continue;
      if (isTemplate(key)) templates[key] = en;
      else exact[textKey(key)] = en;
    }
  }
  // A choice's label is shown with its count ("Заговоры (3)") and without it, in the level plan.
  for (const [ru, en] of Object.entries(templates)) {
    const bare = ru.replace(/ \(\{0\}\)$/, '');
    if (bare !== ru && en.endsWith(' ({0})') && !isTemplate(bare) && !(textKey(bare) in exact))
      exact[textKey(bare)] = en.slice(0, -' ({0})'.length);
  }
  // Longer templates first: the more of a text a template fixes, the surer its match.
  const ordered = Object.entries(templates).sort(
    ([a], [b]) => b.replace(/\{\d+\}/g, '').length - a.replace(/\{\d+\}/g, '').length,
  );
  return { files: files.map((file) => path.join(dir, file)), dictionary: { exact, templates: ordered } };
}
