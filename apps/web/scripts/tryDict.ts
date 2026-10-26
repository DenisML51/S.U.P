import { readFileSync } from 'node:fs';
import path from 'node:path';
import { compileDictionary } from './i18nDictionary';
import { createTranslator } from '../src/i18n/engine';

// `npx tsx scripts/tryDict.ts texts.json`: how the English dictionary shows each text of a JSON array.
const t = createTranslator(compileDictionary(path.resolve(import.meta.dirname, '../src/i18n/en')).dictionary);
const texts = JSON.parse(readFileSync(process.argv[2]!, 'utf8')) as string[];
for (const text of texts) console.log(JSON.stringify(text), '\n  →', JSON.stringify(t(text)));
