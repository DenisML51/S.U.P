import type { Character } from '@itd/schema';
import { deriveArmorClassBonuses } from './armor';
import { clampLimbHP } from './health';
import { boundSanity } from './sanity';

/**
 * Brings a stored sheet up to the current rules: values that rules now bound (sanity, limb hit
 * points) are bounded, and fields that replaced older ones are derived from what the sheet showed.
 *
 * The schema cannot do this, since it knows nothing of the rules; the client runs it on every read
 * of a stored document, before any edit. Running it again changes nothing.
 */
export function upgradeCharacter(character: Character): Character {
  const derived = deriveArmorClassBonuses(character);
  return boundSanity({ ...derived, limbs: derived.limbs.map(clampLimbHP) });
}
