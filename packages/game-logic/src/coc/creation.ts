import type { Attack, CharacterDraft, CocBuild, CocSheet, CocSkill, Trait } from '@itd/schema';
import { buildNewCharacter, startingAttributes } from '../rules/creation';
import { CHARACTERISTICS } from './content/characteristics';
import { occupationDef } from './content/occupations';
import { archetypeDef, talentDef } from './content/pulp';
import { skillDef } from './content/skills';
import { weaponDef } from './content/weapons';
import { derivedOf, sheetSkills, skillBase, wealthOf, type Characteristics } from './engine';
import type { WeaponDef } from './types';

export interface InvestigatorInput {
  name: string;
  build: CocBuild;
  /** After age; Pulp's core characteristic already rolled. */
  characteristics: Characteristics;
  luck: number;
  /** Final values of the skills the player raised (base plus every point spent). */
  skills: Record<string, number>;
  /** Skills bought with occupation points; marked on the sheet. */
  occupationSkills?: string[];
  /** Weapons to start with, by content id; unarmed is always there. */
  weapons?: string[];
  residence?: string;
  birthplace?: string;
  backstory?: Partial<CocSheet['backstory']>;
}

/** Specialities every investigator's sheet lists. */
export const STANDARD_SPECIALITIES = ['fighting:brawl', 'firearms:handgun', 'firearms:rifle-shotgun'];

/** A sheet entry for a weapon from the table. */
export function weaponAttack(weapon: WeaponDef): Attack {
  return {
    id: `coc-${weapon.id}`,
    name: weapon.name,
    description: weapon.description,
    damage: weapon.damage,
    damageType: '',
    hitBonus: 0,
    actionType: 'action',
    skill: weapon.skill,
    range: weapon.range,
    uses: weapon.uses,
    ammo: weapon.ammo,
    magazine: weapon.ammo,
    malfunction: weapon.malfunction,
    impale: weapon.impale,
  };
}

/** The talents of a Pulp hero as sheet traits; `grant` names the talent. */
export const talentTraits = (build: CocBuild): Trait[] =>
  build.talents.flatMap((id) => {
    const talent = talentDef(id);
    return talent ? [{ id: `talent-${id}`, name: talent.name, description: talent.description, grant: `talent:${id}` }] : [];
  });

/**
 * A new investigator: the eight characteristics, every standard skill of the era at its base or as
 * raised, derived numbers, money from Credit Rating, unarmed combat and the chosen weapons.
 */
export function createInvestigator(input: InvestigatorInput): CharacterDraft {
  const { build, characteristics: c } = input;
  const derived = derivedOf(c, build.variant, build.age);
  const occupation = new Set(input.occupationSkills ?? []);
  const listed = new Set<string>();
  const skills: CocSkill[] = [];
  const add = (id: string) => {
    if (listed.has(id)) return;
    listed.add(id);
    skills.push({ id, value: input.skills[id] ?? skillBase(id, c), check: false, occupation: occupation.has(id) || undefined });
  };
  for (const skill of sheetSkills(build.era)) if (!skill.specialities) add(skill.id);
  // The paper sheet prints these specialities; others appear once the investigator has them.
  for (const id of STANDARD_SPECIALITIES) add(id);
  for (const id of Object.keys(input.skills)) if (skillDef(id)) add(id);

  const creditRating = input.skills['credit-rating'] ?? 0;
  const wealth = wealthOf(creditRating, build.era);
  const weapons = ['unarmed', ...(input.weapons ?? [])].flatMap((id) => {
    const weapon = weaponDef(id);
    return weapon ? [weaponAttack(weapon)] : [];
  });
  const occupationName = occupationDef(build.occupation)?.name ?? build.occupation;

  const base = buildNewCharacter({
    name: input.name,
    race: '',
    class: occupationName,
    subclass: archetypeDef(build.archetype)?.name ?? '',
    attributes: startingAttributes(),
    skills: [],
    savingThrowProficiencies: [],
  });
  return {
    ...base,
    level: 1,
    speed: derived.move,
    sanity: derived.startingSanity,
    maxSanityBonus: 0,
    currentHP: derived.maxHP,
    maxHP: derived.maxHP,
    limbs: [],
    skills: [],
    attacks: weapons,
    traits: talentTraits(build),
    currency: { copper: 0, silver: 0, gold: 0 },
    build,
    coc: {
      characteristics: Object.fromEntries(CHARACTERISTICS.map((ch) => [ch.id, c[ch.id]])),
      skills,
      luck: input.luck,
      startingLuck: input.luck,
      magicPoints: derived.maxMP,
      startingSanity: derived.startingSanity,
      sanityAtDayStart: derived.startingSanity,
      residence: input.residence ?? '',
      birthplace: input.birthplace ?? '',
      cash: wealth.cash,
      assets: wealth.assets ? `$${wealth.assets.toLocaleString('en-US')}` : '',
      backstory: {
        personalDescription: '',
        ideology: '',
        significantPeople: '',
        meaningfulLocations: '',
        treasuredPossessions: '',
        traits: '',
        injuries: '',
        arcaneTomes: '',
        encounters: '',
        ...input.backstory,
      },
      madness: [],
      spells: [],
    },
  };
}
