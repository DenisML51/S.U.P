import type { Ability, Character, Concentration } from '@itd/schema';

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

/**
 * Ends what the hero can no longer keep up at 0 hit points or incapacitated: concentration, and
 * the features that are on (Rage, Wild Shape).
 */
export const keepConcentration = (character: Character): Character =>
  canConcentrate(character) ? character : endAllFeatures(endConcentration(character));

// ------------------------------------------------------------------------------------------------
// Features that are on (Rage, Bladesong): kept, like concentration, while the hero can act
// ------------------------------------------------------------------------------------------------

/** Whether the ability is on now. */
export const isActiveFeature = (character: Pick<Character, 'activeFeatures'>, id: string): boolean =>
  !!character.activeFeatures?.includes(id);

/** The abilities that are on now, in the order of the sheet. */
export const activeFeaturesOf = (character: Pick<Character, 'abilities' | 'activeFeatures'>): Ability[] =>
  character.abilities.filter((a) => a.stance && isActiveFeature(character, a.id));

/** A feature that is on and forbids spells (Rage, Wild Shape), if any. */
export const spellBlocker = (character: Pick<Character, 'abilities' | 'activeFeatures'>): Ability | undefined =>
  activeFeaturesOf(character).find((a) => a.stanceNoSpells);

/**
 * Turns an ability on. Another of its group goes off (a new form of Wild Shape replaces the old);
 * one that forbids concentration ends it; temporary hit points it gives replace smaller ones.
 */
export function startFeature(
  character: Character,
  ability: Pick<Ability, 'id' | 'stanceEndsConcentration' | 'stanceGroup' | 'stanceTempHP'>,
): Character {
  const rivals = ability.stanceGroup
    ? character.abilities.filter((a) => a.id !== ability.id && a.stanceGroup === ability.stanceGroup).map((a) => a.id)
    : [];
  const active = (character.activeFeatures ?? []).filter((id) => !rivals.includes(id));
  let next: Character = { ...character, activeFeatures: active.includes(ability.id) ? active : [...active, ability.id] };
  if (ability.stanceTempHP) next = { ...next, tempHP: Math.max(next.tempHP, ability.stanceTempHP) };
  return ability.stanceEndsConcentration ? endConcentration(next) : next;
}

/** Turns an ability off; the field goes away with the last one. */
export function endFeature(character: Character, id: string): Character {
  const active = (character.activeFeatures ?? []).filter((a) => a !== id);
  if (active.length === (character.activeFeatures?.length ?? 0)) return character;
  if (active.length > 0) return { ...character, activeFeatures: active };
  const { activeFeatures: _ended, ...rest } = character;
  return rest;
}

/** Turns every ability off (a long rest, falling unconscious). */
export const endAllFeatures = (character: Character): Character =>
  (character.activeFeatures ?? []).reduce(endFeature, character);
