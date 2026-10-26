import { hasCyrillic } from './cyrillic';
import { textKey } from './hash';

/**
 * A dictionary as the build ships it: whole texts by the hash of their Russian (`textKey`), and
 * templates — texts around values that change (`Ожидают отправки: {0}`) — with their Russian, since
 * they are matched, not looked up.
 */
export interface CompiledDictionary {
  exact: Record<string, string>;
  templates: [ru: string, en: string][];
}

export type Translate = (text: string) => string;

export { hasCyrillic };

interface Template {
  /** The longest fixed piece: a text without it cannot match, and is not run through the pattern. */
  anchor: string;
  /** Its own words are enough to stand for the text even with a value left as written. */
  wordy: boolean;
  pattern: RegExp;
  en: string;
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function compile([ru, en]: [string, string]): Template {
  const pieces = ru.split(/\{(\d+)\}/);
  let source = '^';
  let anchor = '';
  pieces.forEach((piece, index) => {
    if (index % 2 === 1) source += `(?<p${piece}>[\\s\\S]+?)`;
    else {
      source += escape(piece);
      if (piece.length > anchor.length) anchor = piece;
    }
  });
  const letters =
    pieces
      .filter((_, index) => index % 2 === 0)
      .join('')
      .match(/[А-Яа-яЁё]/g)?.length ?? 0;
  return { anchor, wordy: letters >= 4, pattern: new RegExp(`${source}$`), en };
}

/**
 * What texts are joined by, in the order they are taken apart: lines, then the separators of the
 * interface's one-liners and of lists. The capture keeps the joint itself.
 */
const SEPARATORS = [/(\n+)/, /( · )/, /( — )/, /(: )/, /(; )/, /(, )/, /( \/ )/, /( или )/, /( и )/];
/** Separators of a label ("Доспехи: надето"), where one side may be a name the player gave. */
const LABEL_JOINTS = new Set([1, 2, 3]);
/** A text between a lead and a tail without words: `(lead )(words)( tail)`. */
const AFFIXES = /^([^А-Яа-яЁё\n]*[ \u00a0])?([^\n]*?[А-Яа-яЁё][^\n]*?)([ \u00a0][^А-Яа-яЁё\n]*)?$/;
/** A text in brackets or quotes: "(преимущество)", "«Ярость»". */
const WRAPPED = /^([(«"“[])([^\n]*)([)»"”\]])$/;
/** More pieces than this are not regrouped: such a text is the player's own, not put together. */
const MAX_GROUPED_PIECES = 40;
const MAX_DEPTH = 4;

/** What may stay as written beside translated words: a name, not a sentence. */
const nameLike = (text: string) =>
  text.length <= 48 && text.trim().split(/\s+/).length <= 5 && !/[.!?;\n]/.test(text);

/**
 * Russian → English for whatever the interface shows: a text the dictionary has whole; a template
 * whose values are numbers, names or texts it can translate in turn; a text put together from texts
 * it has (lines, a list, "Заговор · Воплощение"). Anything else — the player's own words — is shown
 * as it is; a name of theirs inside a label of the interface ("Лист: Мирабель") stays a name.
 * Results are remembered, so a text costs one lookup however often it is drawn.
 */
export function createTranslator(dictionary: CompiledDictionary): Translate {
  const { exact } = dictionary;
  let templates: Template[] | null = null;
  // By the separators a text may still be taken apart by: inside a group, fewer are left. The last
  // one is for whole texts, which alone may keep a name as written.
  const caches = SEPARATORS.map(() => new Map<string, string | null>()).concat(new Map(), new Map());
  const WHOLE = SEPARATORS.length + 1;

  /**
   * The first template that fits, its values translated in turn. Strictly, every value has to be
   * one the dictionary can say; loosely (when nothing fits strictly), a name may stay as written —
   * a hero's name in "Лист: {0}" — if the template's own words carry the text.
   */
  const withTemplates = (core: string, depth: number, loose: boolean): string | null => {
    templates ??= dictionary.templates.map(compile);
    for (const template of templates) {
      if (loose && !template.wordy) continue;
      if (!core.includes(template.anchor)) continue;
      const match = template.pattern.exec(core);
      if (!match?.groups) continue;
      const values: Record<string, string> = {};
      let ok = true;
      for (const [name, value] of Object.entries(match.groups)) {
        let translated = hasCyrillic(value) ? lookup(value, depth + 1, 0) : value;
        if (translated === null && loose && nameLike(value)) translated = value;
        if (translated === null) {
          ok = false;
          break;
        }
        values[name.slice(1)] = translated;
      }
      if (ok) return template.en.replace(/\{(\d+)\}/g, (all, index: string) => values[index] ?? all);
    }
    return null;
  };

  /**
   * A text put together from texts the dictionary knows, joined by a separator: grouped so that
   * every group is known (the longest groups first). Groups may be split again by the separators
   * after this one only. Loosely, a label's name stays as written beside the words it knows.
   */
  const bySeparator = (core: string, level: number, depth: number, loose: boolean): string | null => {
    const separator = SEPARATORS[level]!;
    const parts = core.split(separator);
    const pieces = parts.filter((_, i) => i % 2 === 0);
    const joints = parts.filter((_, i) => i % 2 === 1);
    if (pieces.length > MAX_GROUPED_PIECES) return null;
    // A Russian joint ("или") is said in English too; a joint the dictionary does not know fails.
    const said = joints.map((joint) =>
      hasCyrillic(joint) ? lookup(joint, depth + 1, SEPARATORS.length) : joint,
    );
    if (said.some((joint) => joint === null)) return null;
    const join = (from: number, to: number) => {
      let text = pieces[from]!;
      for (let i = from + 1; i < to; i++) text += joints[i - 1]! + pieces[i]!;
      return text;
    };
    const one = (text: string) => (hasCyrillic(text) ? lookup(text, depth + 1, level + 1) : text);
    if (loose) {
      const out = pieces.map((piece) => one(piece) ?? (nameLike(piece) ? piece : null));
      if (out.some((piece) => piece === null) || out.every((piece, i) => piece === pieces[i])) return null;
      return out.map((piece, i) => (i ? said[i - 1]! : '') + piece!).join('');
    }
    const best: (string | null)[] = [''];
    for (let to = 1; to <= pieces.length; to++) {
      best[to] = null;
      for (let from = 0; from < to; from++) {
        if (best[from] === null || (from === 0 && to === pieces.length)) continue;
        const translated = one(join(from, to));
        if (translated !== null) {
          best[to] = best[from] + (from ? said[from - 1]! : '') + translated;
          break;
        }
      }
    }
    return best[pieces.length] ?? null;
  };

  /** A text without its outer spaces, or null when the dictionary cannot say it. */
  function find(core: string, depth: number, level: number): string | null {
    const hit = exact[textKey(core)];
    if (hit !== undefined) return hit;
    if (depth > MAX_DEPTH) return null;
    // "волк" inside "Удар зверя (волк)" is the dictionary's "Волк"; "ЯРОСТЬ" is its "Ярость".
    const first = core[0]!;
    if (first !== first.toUpperCase()) {
      const upper = find(first.toUpperCase() + core.slice(1), depth + 1, SEPARATORS.length);
      if (upper !== null) return upper[0]!.toLowerCase() + upper.slice(1);
    } else if (core.length > 1 && core === core.toUpperCase() && hasCyrillic(core)) {
      const title = find(first + core.slice(1).toLowerCase(), depth + 1, SEPARATORS.length);
      if (title !== null) return title.toUpperCase();
    }
    // Dice are written with a Russian "к": "к20: 9 + 0", "2к6".
    const dice = core.replace(/(^|[\d\s(+\-−×*/])к(?=\d)/g, '$1d');
    if (dice !== core && !hasCyrillic(dice)) return dice;
    const templated = withTemplates(core, depth, false);
    if (templated !== null) return templated;
    const wrapped = WRAPPED.exec(core);
    if (wrapped) {
      const inner = lookup(wrapped[2]!, depth + 1, level);
      if (inner !== null) return wrapped[1] + inner + wrapped[3];
    }
    // "3 участника", "+2 к атаке", "Сила 15": numbers and signs around words are kept as they are.
    const affixed = AFFIXES.exec(core);
    if (affixed && (affixed[1] || affixed[3])) {
      const middle = lookup(affixed[2]!, depth + 1, level);
      if (middle !== null) return (affixed[1] ?? '') + middle + (affixed[3] ?? '');
    }
    for (let next = level; next < SEPARATORS.length; next++) {
      if (!SEPARATORS[next]!.test(core)) continue;
      const joined = bySeparator(core, next, depth, false);
      if (joined !== null) return joined;
    }
    if (depth > 0) return null;
    const loose = withTemplates(core, depth, true);
    if (loose !== null) return loose;
    for (const next of LABEL_JOINTS) {
      if (!SEPARATORS[next]!.test(core)) continue;
      const joined = bySeparator(core, next, depth, true);
      if (joined !== null) return joined;
    }
    return null;
  }

  const lookup = (text: string, depth: number, level: number): string | null => {
    const start = text.search(/\S/);
    if (start < 0) return text;
    const end = text.search(/\s*$/);
    const core = text.slice(start, end);
    // A text inside another is remembered with how deep it sat: deeper, less is tried on it.
    const key = depth === 0 ? core : `${depth}\u0001${core}`;
    const cache = caches[depth === 0 ? WHOLE : level]!;
    let found = cache.get(key);
    if (found === undefined) {
      found = find(core, depth, level);
      cache.set(key, found);
    }
    return found === null ? null : text.slice(0, start) + found + text.slice(end);
  };

  return (text) => (hasCyrillic(text) ? (lookup(text, 0, 0) ?? text) : text);
}
