import type { Character } from '@itd/schema';
import { deriveArmorClassBonuses } from './armor';
import { clampLimbHP } from './health';
import { hitDiceId } from './rest';
import { boundSanity } from './sanity';

/**
 * A preset hero kept their hit dice in one pool `hit-dice` before multiclassing; each die size has
 * its own pool now. The pool takes the id of its size, so the dice already spent stay spent.
 */
const LEGACY_HIT_DICE = 'hit-dice';
const splitHitDice = (character: Character): Character =>
  character.resources.some((r) => r.id === LEGACY_HIT_DICE && r.grant && r.hitDie)
    ? {
        ...character,
        resources: character.resources.map((r) => (r.id === LEGACY_HIT_DICE && r.grant && r.hitDie ? { ...r, id: hitDiceId(r.hitDie) } : r)),
      }
    : character;

/**
 * Brings a stored sheet up to the current rules: values that rules now bound (sanity, limb hit
 * points) are bounded, and fields that replaced older ones are derived from what the sheet showed.
 *
 * The schema cannot do this, since it knows nothing of the rules; the client runs it on every read
 * of a stored document, before any edit. Running it again changes nothing.
 */
export function upgradeCharacter(character: Character): Character {
  const derived = deriveArmorClassBonuses(splitHitDice(character));
  return boundSanity({ ...derived, limbs: derived.limbs.map(clampLimbHP) });
}
