import type { Character } from '@itd/schema';

/**
 * What the always-loaded rules need of Call of Cthulhu without the engine and content (those load
 * on demand, see `systems`).
 */

/** Sanity can never rise above 99 less the investigator's Cthulhu Mythos. */
export const cocMaxSanity = (coc: Character['coc']): number =>
  Math.max(0, 99 - (coc?.skills.find((skill) => skill.id === 'cthulhu-mythos')?.value ?? 0));

/** The damage bonus that goes with a Build (the 7th edition table read the other way): 2 → "+1d6". */
export function damageBonusOfBuild(build: number): string {
  if (build <= -2) return '-2';
  if (build === -1) return '-1';
  if (build === 0) return '0';
  if (build === 1) return '+1d4';
  if (build === 2) return '+1d6';
  return `+${build - 1}d6`;
}
