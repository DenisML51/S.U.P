import type { Character } from '@itd/schema';

/**
 * What the always-loaded rules need of Call of Cthulhu without the engine and content (those load
 * on demand, see `systems`).
 */

/** Sanity can never rise above 99 less the investigator's Cthulhu Mythos. */
export const cocMaxSanity = (coc: Character['coc']): number =>
  Math.max(0, 99 - (coc?.skills.find((skill) => skill.id === 'cthulhu-mythos')?.value ?? 0));
