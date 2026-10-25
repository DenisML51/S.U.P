import type { Difficulty } from '@itd/game-logic/coc';
import type { Character } from '@itd/schema';

/**
 * The small rules of the investigator's sheet that are not the game's own: how the next roll is
 * modified, what a typed number means, what a sanity cost may look like. Kept apart from the
 * screens so they can be tested.
 */

export interface RollMods {
  difficulty: Difficulty;
  /** Positive: bonus dice; negative: penalty dice. */
  dice: number;
  /** Kept for the following rolls too; otherwise the modifiers go back to plain after a roll. */
  pinned?: boolean;
}

export const NO_MODS: RollMods = { difficulty: 'regular', dice: 0 };

export const modsToRoll = (mods: RollMods) => ({
  difficulty: mods.difficulty,
  bonus: Math.max(0, mods.dice),
  penalty: Math.max(0, -mods.dice),
});

/** Bonus and penalty dice only, without a difficulty (a dodge is opposed: its difficulty is the attacker's). */
export const diceOnly = (mods: RollMods) => ({
  bonus: Math.max(0, mods.dice),
  penalty: Math.max(0, -mods.dice),
});

export const isPlainMods = (mods: RollMods): boolean => mods.difficulty === 'regular' && mods.dice === 0;

/** The modifiers after a roll: they go back to plain unless the player pinned them. */
export const modsAfterRoll = (mods: RollMods): RollMods => (mods.pinned ? mods : NO_MODS);

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  regular: 'обычная',
  hard: 'трудная',
  extreme: 'экстремальная',
};

/** "трудная · 1 бонусная": what is set beyond a plain roll, or an empty string. */
export function describeMods(mods: RollMods): string {
  const dice =
    mods.dice > 0
      ? `${mods.dice} ${mods.dice === 1 ? 'бонусная' : 'бонусные'}`
      : mods.dice < 0
        ? `${-mods.dice} ${mods.dice === -1 ? 'штрафная' : 'штрафные'}`
        : '';
  return [mods.difficulty !== 'regular' && DIFFICULTY_LABEL[mods.difficulty], dice].filter(Boolean).join(' · ');
}

/**
 * A number typed into a field: an empty or unreadable entry means "no change" (null), anything
 * else is rounded and kept within bounds.
 */
export function parseNumberInput(raw: string, min = -Infinity, max = Infinity): number | null {
  const text = raw.trim().replace('−', '-').replace(',', '.');
  if (text === '') return null;
  const value = Number(text);
  if (!Number.isFinite(value)) return null;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** Money typed in: like `parseNumberInput`, but to the cent and never below zero. */
export function parseCashInput(raw: string): number | null {
  const text = raw.trim().replace(/\s/g, '').replace(',', '.').replace(/^\$/, '');
  if (text === '') return null;
  const value = Number(text);
  return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) / 100 : null;
}

const LOSS_PART = /^(\d*[dк]\d+|\d+)([+-](\d*[dк]\d+|\d+))*$/i;

/** "0/1d6", "1/1d4+1", "1d10": a sanity cost the roll can read. */
export function isSanitySpec(spec: string): boolean {
  const parts = spec.replace(/\s/g, '').split('/');
  return parts.length >= 1 && parts.length <= 2 && parts.every((part) => LOSS_PART.test(part));
}

/** The conditions the Keeper declares and the player may mark or clear by hand. */
export const MANUAL_CONDITIONS = [
  'temporary-insanity',
  'indefinite-insanity',
  'major-wound',
  'unconscious',
  'dying',
] as const;

/** A condition put on by hand; the edit is the same every time it runs. */
export const addCondition =
  (id: string) =>
  (doc: Character): Character =>
    doc.conditions.includes(id) ? doc : { ...doc, conditions: [...doc.conditions, id] };

/** The points of armour worn, 0–20 as the sheet allows. */
export const setArmor =
  (armor: number) =>
  (doc: Character): Character =>
    doc.coc ? { ...doc, coc: { ...doc.coc, armor: Math.max(0, Math.min(20, Math.round(armor))) } } : doc;

/** Property and assets, as written by the player. */
export const setAssets =
  (assets: string) =>
  (doc: Character): Character =>
    doc.coc ? { ...doc, coc: { ...doc.coc, assets } } : doc;
