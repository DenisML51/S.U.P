import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

/**
 * Every Russian text of the code the interface may show, as the dictionary keys it: string
 * literals, JSX text (with JSX's own spacing), and template literals as templates (`{0}`, `{1}`…).
 * What the dictionary has to cover — and what translators are handed.
 */

const ROOT = path.resolve(import.meta.dirname, '../../..');

/** Where shown texts are written, relative to the repository. */
export const TEXT_SOURCES = [
  'apps/web/src',
  'packages/game-logic/src',
  'packages/schema/src',
  'apps/api/src',
];
/** Never shown to a player: development pages, the admin CLI, the dictionary itself. */
const SKIPPED = ['apps/web/src/dev', 'apps/web/src/i18n', 'apps/api/src/cli', 'apps/api/src/db'];

const CYRILLIC = /[А-Яа-яЁё]/;

const ENTITIES: Record<string, string> = {
  nbsp: ' ',
  laquo: '«',
  raquo: '»',
  mdash: '—',
  ndash: '–',
  hellip: '…',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};
const decode = (text: string) => text.replace(/&(\w+);/g, (all, name: string) => ENTITIES[name] ?? all);

/** JSX text as React receives it: lines trimmed, blank lines dropped, the rest joined by spaces. */
const jsxText = (raw: string) =>
  decode(raw)
    .split(/\r?\n/)
    .map((line) => line.replace(/^[ \t]+|[ \t]+$/g, ''))
    .filter(Boolean)
    .join(' ');

export function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      const rel = path.relative(ROOT, full).split(path.sep).join('/');
      if (SKIPPED.some((skip) => rel === skip || rel.startsWith(`${skip}/`))) continue;
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.tsx?$/.test(name) && !name.endsWith('.d.ts')) out.push(rel);
    }
  };
  for (const source of TEXT_SOURCES) walk(path.join(ROOT, source));
  return out.sort();
}

/** The Russian texts of one file (relative to the repository), in the order they are written. */
export function textsOf(file: string): string[] {
  const code = readFileSync(path.join(ROOT, file), 'utf8');
  if (!CYRILLIC.test(code)) return [];
  const source = ts.createSourceFile(
    file,
    code,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const texts: string[] = [];
  const add = (text: string) => {
    const key = text.trim();
    if (CYRILLIC.test(key)) texts.push(key);
  };
  const visit = (node: ts.Node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) add(node.text);
    else if (ts.isJsxText(node)) add(jsxText(node.getText(source)));
    else if (ts.isTemplateExpression(node)) {
      let text = node.head.text;
      node.templateSpans.forEach((span, index) => (text += `{${index}}${span.literal.text}`));
      add(text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return [...new Set(texts)];
}

const DICTIONARY = path.join(ROOT, 'apps/web/src/i18n/en');

/** Everything the dictionary files say, Russian → English (an empty English is not translated yet). */
export function dictionary(): Map<string, string> {
  const out = new Map<string, string>();
  for (const file of readdirSync(DICTIONARY)
    .filter((name) => name.endsWith('.json'))
    .sort()) {
    const entries = JSON.parse(readFileSync(path.join(DICTIONARY, file), 'utf8')) as Record<string, string>;
    for (const [ru, en] of Object.entries(entries)) if (en) out.set(ru.trim(), en);
  }
  return out;
}

/** The texts of these files (all by default) the dictionary does not have yet, by file. */
export function missing(files = sourceFiles()): Map<string, string[]> {
  const known = dictionary();
  const out = new Map<string, string[]>();
  for (const file of files) {
    const absent = textsOf(file).filter((text) => !known.has(text));
    if (absent.length) out.set(file, absent);
  }
  return out;
}

// `npx tsx apps/web/scripts/i18nTexts.ts [files…]`: what is left to translate, as a skeleton to fill.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const args = process.argv.slice(2);
  const grouped = args[0] === '--grouped';
  const files = args
    .slice(grouped ? 1 : 0)
    .map((file) => path.relative(ROOT, path.resolve(file)).split(path.sep).join('/'));
  const left = missing(
    files.length
      ? files.flatMap((f) =>
          statSync(path.join(ROOT, f)).isDirectory()
            ? sourceFiles().filter((s) => s.startsWith(`${f}/`))
            : [f],
        )
      : undefined,
  );
  if (grouped) {
    process.stdout.write(`${JSON.stringify(Object.fromEntries(left), null, 2)}
`);
    process.exit(0);
  }
  const skeleton: Record<string, string> = {};
  for (const texts of left.values()) for (const text of texts) skeleton[text] = '';
  process.stdout.write(`${JSON.stringify(skeleton, null, 2)}\n`);
  process.stderr.write(`${Object.keys(skeleton).length} texts left in ${left.size} files\n`);
}
