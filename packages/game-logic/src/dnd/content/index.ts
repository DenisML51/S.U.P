import type { ClassDef, SpellDef, SpellListId } from '../types';
import { BACKGROUNDS } from './backgrounds';
import { BARBARIAN } from './classes/barbarian';
import { BARD } from './classes/bard';
import { CLERIC } from './classes/cleric';
import { DRUID } from './classes/druid';
import { MONK } from './classes/monk';
import { RANGER } from './classes/ranger';
import { ROGUE } from './classes/rogue';
import { SORCERER } from './classes/sorcerer';
import { WARLOCK } from './classes/warlock';
import { WIZARD } from './classes/wizard';
import { FIGHTER } from './classes/fighter';
import { PALADIN } from './classes/paladin';
import { ARMOR, GEAR, MASTERIES, WEAPONS } from './equipment';
import { FEATS } from './feats';
import { INVOCATIONS } from './invocations';
import { MANEUVERS } from './maneuvers';
import { METAMAGIC } from './metamagic';
import { SPECIES } from './species';
import { DIVINE_SPELLS } from './spells/divine';
import { EXTRA_SPELLS } from './spells/extra';
import { FIVE_SPELLS } from './spells/five';
import { HIGH_SPELLS } from './spells/high';
import { LOW_SPELLS } from './spells/low';
import { SIX_SPELLS } from './spells/six';
import { SPELL_LISTS } from './spells/lists';
import { WIZARD_SPELLS } from './spells/wizard';

/**
 * Spells come from several files that may both carry a spell; a duplicate merges its lists, and the
 * class lists of the Player's Handbook (`SPELL_LISTS`) are added to every spell they name.
 */
function mergeSpells(...groups: SpellDef[][]): SpellDef[] {
  const byId = new Map<string, SpellDef>();
  for (const spell of groups.flat()) {
    const known = byId.get(spell.id);
    byId.set(spell.id, known ? { ...known, lists: [...new Set([...known.lists, ...spell.lists])] } : spell);
  }
  for (const [list, ids] of Object.entries(SPELL_LISTS) as [SpellListId, string[]][]) {
    for (const id of ids) {
      const spell = byId.get(id);
      if (spell && !spell.lists.includes(list)) byId.set(id, { ...spell, lists: [...spell.lists, list] });
    }
  }
  return [...byId.values()];
}

export const DND_CLASSES: ClassDef[] = [BARBARIAN, BARD, FIGHTER, CLERIC, DRUID, MONK, PALADIN, RANGER, ROGUE, SORCERER, WARLOCK, WIZARD];

/** Everything the D&D 2024 presets offer, in one place for the build engine and the screens. */
export const DND = {
  classes: DND_CLASSES,
  species: SPECIES,
  backgrounds: BACKGROUNDS,
  feats: FEATS,
  spells: mergeSpells(WIZARD_SPELLS, DIVINE_SPELLS, EXTRA_SPELLS, LOW_SPELLS, FIVE_SPELLS, SIX_SPELLS, HIGH_SPELLS),
  maneuvers: MANEUVERS,
  catalogs: { invocations: INVOCATIONS, metamagic: METAMAGIC },
  weapons: WEAPONS,
  armor: ARMOR,
  gear: GEAR,
  masteries: MASTERIES,
};

export type DndContent = typeof DND;
