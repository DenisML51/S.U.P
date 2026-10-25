import { describe, expect, it } from 'vitest';
import type { DndBuild, Character } from '@itd/schema';
import { startingSkills } from '../src';
import { DND, applyBuild, choiceOptions, levelPlan, setPicks } from '../src/dnd';
import { makeCharacter } from './helpers';

const build = (patch: Partial<DndBuild> = {}): DndBuild => ({
  ruleset: 'dnd2024',
  species: 'human',
  background: 'sage',
  class: 'druid',
  abilityMethod: 'pointBuy',
  // Wisdom 15 + 2 = 17 (+3), Constitution 14 (+2).
  baseAttributes: { strength: 8, dexterity: 12, constitution: 14, intelligence: 13, wisdom: 15, charisma: 10 },
  backgroundBonuses: { wisdom: 2, intelligence: 1 },
  choices: {},
  hitPoints: [],
  level: 1,
  ...patch,
});

const fresh = (): Character => makeCharacter({ skills: startingSkills(), maxHP: 10, currentHP: 10 });
const run = (b: DndBuild) => applyBuild(fresh(), b);
const apply = (b: DndBuild) => run(b).character;
const resource = (c: Character, id: string) => c.resources.find((r) => r.id === id);
const ability = (c: Character, name: string) => c.abilities.find((a) => a.name === name);
const classCantrips = (b: DndBuild, level: number) =>
  levelPlan(b, level).choices.find((c) => c.key.startsWith('casting:') && c.choice.id === 'cantrips');

const ORDER = 'class:druid.primal-order/order';
const LAND = 'subclass:land.circle-spells/land';

describe('druid', () => {
  it('writes a level-1 druid onto the sheet', () => {
    const c = apply(build());
    expect(c.class).toBe('Друид');
    expect(c.maxHP).toBe(8 + 2);
    expect(c.savingThrowProficiencies).toEqual(expect.arrayContaining(['intelligence', 'wisdom']));
    const proficiencies = c.traits.find((t) => t.id === 'g-proficiencies')?.description ?? '';
    expect(proficiencies).toContain('Лёгкие доспехи');
    expect(proficiencies).toContain('Щиты');
    expect(proficiencies).toContain('Набор травника');
    expect(proficiencies).toContain('Друидический');
    expect(proficiencies).not.toContain('Средние доспехи');
    const speak = c.spells.find((s) => s.id === 'spell-speak-with-animals');
    expect(speak?.alwaysPrepared && speak.prepared).toBe(true);
    expect(c.maxPreparedSpells.total).toBe(4);
    expect(resource(c, 'slot-1')?.max).toBe(2);
    expect(c.spellcastingDifficultyValue).toBe(13);
    expect(resource(c, 'druid.wild-shape')).toBeUndefined();
  });

  it('asks for two cantrips, then one more on levels 4 and 10', () => {
    expect(classCantrips(build(), 1)?.count).toBe(2);
    expect(classCantrips(build(), 4)?.count).toBe(1);
    expect(classCantrips(build(), 10)?.count).toBe(1);
    expect(classCantrips(build(), 5)).toBeUndefined();
    expect(levelPlan(build(), 1).choices.some((c) => c.key === ORDER)).toBe(true);
  });

  it('gives the Warden martial weapons and medium armour', () => {
    const c = apply(setPicks(build(), ORDER, ['warden']));
    const proficiencies = c.traits.find((t) => t.id === 'g-proficiencies')?.description ?? '';
    expect(proficiencies).toContain('Воинское оружие');
    expect(proficiencies).toContain('Средние доспехи');
  });

  it('gives the Magician a cantrip from the shared pool and a Wisdom bonus to Arcana and Nature', () => {
    let b = build({ choices: { 'casting:spells-1/cantrips': ['druidcraft', 'produce-flame'] } });
    b = setPicks(b, ORDER, ['magician']);
    const extra = levelPlan(b, 1).choices.find((c) => c.key === `${ORDER}=magician:druid.magician/cantrip`)!;
    expect(extra).toBeDefined();
    expect(choiceOptions(b, 1, extra).find((o) => o.id === 'druidcraft')?.disabled).toBeTruthy();
    const c = apply(setPicks(b, extra.key, ['guidance']));
    expect(c.skills.find((s) => s.id === 'arcana')?.bonus).toBe(3);
    expect(c.skills.find((s) => s.id === 'nature')?.bonus).toBe(3);
    expect(c.spells.find((s) => s.id === 'spell-guidance')?.alwaysPrepared).toBe(true);
  });

  it('offers to replace a cantrip on later levels', () => {
    const b = build({ level: 3, choices: { 'casting:spells-1/cantrips': ['druidcraft', 'produce-flame'] } });
    expect(levelPlan(b, 3).choices.some((c) => c.key === 'swap:known-cantrips@3/forget')).toBe(true);
  });

  it('grows Wild Shape and Elemental Fury with level', () => {
    const at = (level: number) => apply(build({ level }));
    expect(resource(at(2), 'druid.wild-shape')).toMatchObject({ max: 2, recovery: 'short', recoveryAmount: 1 });
    expect(resource(at(6), 'druid.wild-shape')?.max).toBe(3);
    expect(resource(at(17), 'druid.wild-shape')?.max).toBe(4);
    expect(ability(at(2), 'Дикий облик')?.actionType).toBe('bonus');
    expect(ability(at(2), 'Дикий спутник')?.resourceId).toBe('druid.wild-shape');
    expect(resource(at(5), 'druid.wild-resurgence')?.max).toBe(1);
    expect(resource(at(20), 'druid.nature-magician')?.max).toBe(1);

    const key = 'class:druid.elemental-fury/fury';
    const strike = (level: number) => ability(apply(setPicks(build({ level }), key, ['primal-strike'])), 'Природный удар');
    expect(strike(7)?.damage).toBe('1d8');
    expect(strike(15)?.damage).toBe('2d8');
    expect(levelPlan(setPicks(build(), key, ['potent-spellcasting']), 15).features.some((f) => f.feature.id === 'druid.improved-potent-spellcasting')).toBe(true);
  });

  it('has full-caster slots and the prepared count of the table', () => {
    const c9 = apply(build({ level: 9 }));
    expect(resource(c9, 'slot-5')?.max).toBe(1);
    expect(c9.maxPreparedSpells.total).toBe(14);
    const c20 = apply(build({ level: 20 }));
    expect(resource(c20, 'slot-9')?.max).toBe(1);
    expect(c20.maxPreparedSpells.total).toBe(22);
  });

  it('builds every circle at level 20 with nothing missing but spells still being written', () => {
    const druid = DND.classes.find((c) => c.id === 'druid')!;
    expect(druid.subclasses.map((s) => s.id)).toEqual(['circle-of-the-land', 'circle-of-the-moon', 'circle-of-the-sea', 'circle-of-the-stars']);
    for (const subclass of druid.subclasses) {
      const b = subclass.id === 'circle-of-the-land' ? setPicks(build({ level: 20, subclass: subclass.id }), LAND, ['polar']) : build({ level: 20, subclass: subclass.id });
      const { character, missing } = run(b);
      expect(character.subclass).toBe(subclass.name);
      expect(missing.filter((m) => !m.startsWith('spell:'))).toEqual([]);
      for (const spell of Object.values(subclass.alwaysPrepared ?? {}).flat()) {
        const entry = character.spells.find((s) => s.id === `spell-${spell}`);
        if (entry) expect(entry.alwaysPrepared).toBe(true);
        else expect(missing).toContain(`spell:${spell}`);
      }
    }
  });

  it('prepares the spells of the chosen land by level and resists its damage from level 10', () => {
    const land = (level: number, type: string) => apply(setPicks(build({ level, subclass: 'circle-of-the-land' }), LAND, [type]));
    const arid3 = land(3, 'arid');
    expect(arid3.spells.find((s) => s.id === 'spell-burning-hands')?.alwaysPrepared).toBe(true);
    expect(arid3.spells.find((s) => s.id === 'spell-fire-bolt')?.alwaysPrepared).toBe(true);
    expect(arid3.spells.some((s) => s.id === 'spell-fireball' && s.alwaysPrepared)).toBe(false);
    const arid5 = land(5, 'arid');
    expect(arid5.spells.find((s) => s.id === 'spell-fireball')?.alwaysPrepared).toBe(true);
    expect(arid5.resistances.some((r) => r.type === 'Огонь')).toBe(false);
    expect(land(10, 'arid').resistances.some((r) => r.type === 'Огонь')).toBe(true);
    const temperate = land(9, 'temperate');
    expect(temperate.spells.find((s) => s.id === 'spell-misty-step')?.alwaysPrepared).toBe(true);
    expect(temperate.spells.some((s) => s.id === 'spell-burning-hands' && s.alwaysPrepared)).toBe(false);
    expect(land(10, 'tropical').resistances.some((r) => r.type === 'Яд')).toBe(true);
  });

  it('writes the circle features with their numbers', () => {
    const aid = (level: number) => ability(apply(build({ level, subclass: 'circle-of-the-land' })), 'Помощь земли');
    expect(aid(3)).toMatchObject({ damage: '2d6', saveAttribute: 'constitution', saveDC: 13, resourceId: 'druid.wild-shape' });
    expect(aid(10)?.damage).toBe('3d6');
    expect(aid(14)?.damage).toBe('4d6');

    const moon3 = apply(build({ level: 3, subclass: 'circle-of-the-moon' }));
    expect(moon3.spells.find((s) => s.id === 'spell-moonbeam')?.alwaysPrepared).toBe(true);
    expect(resource(apply(build({ level: 10, subclass: 'circle-of-the-moon' })), 'moon.moonlight-step')?.max).toBe(3);
    expect(ability(apply(build({ level: 14, subclass: 'circle-of-the-moon' })), 'Лунный облик')?.damage).toBe('2d10');

    const sea = apply(build({ level: 3, subclass: 'circle-of-the-sea' }));
    expect(ability(sea, 'Гнев моря')).toMatchObject({ damage: '3d6', damageType: 'Холод', saveAttribute: 'constitution', actionType: 'bonus', resourceId: 'druid.wild-shape' });

    const stars3 = apply(build({ level: 3, subclass: 'circle-of-the-stars' }));
    expect(stars3.spells.find((s) => s.id === 'spell-guiding-bolt')?.alwaysPrepared).toBe(true);
    expect(stars3.spells.find((s) => s.id === 'spell-guidance')?.alwaysPrepared).toBe(true);
    expect(resource(stars3, 'stars.star-map')?.max).toBe(3);
    expect(ability(stars3, 'Звёздный облик: Лучник')?.damage).toBe('1d8+3');
    const stars10 = apply(build({ level: 10, subclass: 'circle-of-the-stars' }));
    expect(ability(stars10, 'Звёздный облик: Чаша')?.damage).toBe('2d8+3');
    expect(resource(stars10, 'stars.cosmic-omen')?.max).toBe(3);
  });

  it('starts with the PHB kit', () => {
    const druid = DND.classes.find((c) => c.id === 'druid')!;
    expect(druid.startingEquipment.map((k) => k.gold)).toEqual([9, 50]);
  });
});
