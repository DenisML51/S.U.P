import type { ClassDef, SpellDef } from '../types';
import { BACKGROUNDS } from './backgrounds';
import { FIGHTER } from './classes/fighter';
import { PALADIN } from './classes/paladin';
import { ARMOR, GEAR, MASTERIES, WEAPONS } from './equipment';
import { FEATS } from './feats';
import { MANEUVERS } from './maneuvers';
import { SPECIES } from './species';
import { DIVINE_SPELLS } from './spells/divine';
import { EXTRA_SPELLS } from './spells/extra';
import { WIZARD_SPELLS } from './spells/wizard';

/** Spells come from several files that may both carry a spell; a duplicate merges its lists. */
function mergeSpells(...groups: SpellDef[][]): SpellDef[] {
  const byId = new Map<string, SpellDef>();
  for (const spell of groups.flat()) {
    const known = byId.get(spell.id);
    byId.set(spell.id, known ? { ...known, lists: [...new Set([...known.lists, ...spell.lists])] } : spell);
  }
  return [...byId.values()];
}

export const DND_CLASSES: ClassDef[] = [FIGHTER, PALADIN];

/** Everything the D&D 2024 presets offer, in one place for the build engine and the screens. */
export const DND = {
  classes: DND_CLASSES,
  species: SPECIES,
  backgrounds: BACKGROUNDS,
  feats: FEATS,
  spells: mergeSpells(WIZARD_SPELLS, DIVINE_SPELLS, EXTRA_SPELLS),
  maneuvers: MANEUVERS,
  weapons: WEAPONS,
  armor: ARMOR,
  gear: GEAR,
  masteries: MASTERIES,
};

export type DndContent = typeof DND;
