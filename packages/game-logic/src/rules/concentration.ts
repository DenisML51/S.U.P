import type { Character, Concentration } from '@itd/schema';

/** Conditions that leave the hero incapacitated, which ends concentration at once. */
export const CONCENTRATION_BREAKING_CONDITIONS: readonly string[] = [
  'incapacitated',
  'paralyzed',
  'petrified',
  'stunned',
  'unconscious',
];

/** The Constitution save after taking damage: half the damage, at least 10 and at most 30. */
export const concentrationSaveDC = (damage: number): number =>
  Math.min(30, Math.max(10, Math.floor(damage / 2)));

/** Whether the hero is in a state to concentrate at all: conscious, above 0 HP, not incapacitated. */
export const canConcentrate = (character: Pick<Character, 'currentHP' | 'conditions'>): boolean =>
  character.currentHP > 0 &&
  !character.conditions.some((id) => CONCENTRATION_BREAKING_CONDITIONS.includes(id));

export function endConcentration(character: Character): Character {
  if (!character.concentratingOn) return character;
  // The key goes away rather than holding `undefined`: stored copies and merges see an absent field.
  const { concentratingOn: _ended, ...rest } = character;
  return rest;
}

/** Starts concentrating on an entry; whatever the hero concentrated on before ends. */
export const startConcentration = (
  character: Character,
  target: Omit<Concentration, 'startedAt'>,
  now: number = Date.now(),
): Character => ({ ...character, concentratingOn: { ...target, startedAt: now } });

/** Ends concentration the hero can no longer keep (0 hit points, incapacitated). */
export const keepConcentration = (character: Character): Character =>
  character.concentratingOn && !canConcentrate(character) ? endConcentration(character) : character;
