// Call of Cthulhu 7th edition with Pulp Cthulhu: the engine and the content. Its own entry point
// (`@itd/game-logic/coc`) that investigators' screens import and the rest of the app loads on demand.
import { registerRuleSystem } from '../systems';
import { COC_7 } from './system';

export * from './types';
export * from './engine';
export * from './creation';
export * from './actions';
export * from './combat';
export { CHARACTERISTICS, characteristicDef } from './content/characteristics';
export { SKILLS, SOCIAL_SKILLS, skillDef, skillName } from './content/skills';
export { OCCUPATIONS, occupationDef } from './content/occupations';
export { ARCHETYPES, TALENTS, archetypeDef, talentDef } from './content/pulp';
export { WEAPONS, weaponDef } from './content/weapons';
export { MYTHOS_SPELLS, spellDef } from './content/spells';
export { BOUTS_REAL_TIME, BOUTS_SUMMARY, MANIAS, PHOBIAS } from './content/madness';
export { COC_7 };

registerRuleSystem(COC_7);
