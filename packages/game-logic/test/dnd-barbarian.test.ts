import { describe, expect, it } from 'vitest';
import type { Build, Character } from '@itd/schema';
import { armorClassOf, startingSkills } from '../src';
import { DND, applyBuild, createDndHero, levelPlan, setPicks } from '../src/dnd';
import { makeCharacter } from './helpers';

const build = (patch: Partial<Build> = {}): Build => ({
  ruleset: 'dnd2024',
  species: 'human',
  background: 'soldier',
  class: 'barbarian',
  abilityMethod: 'pointBuy',
  baseAttributes: { strength: 15, dexterity: 13, constitution: 14, intelligence: 8, wisdom: 12, charisma: 10 },
  backgroundBonuses: { strength: 2, constitution: 1 },
  choices: {},
  hitPoints: [],
  level: 1,
  ...patch,
});

const fresh = (): Character => makeCharacter({ skills: startingSkills(), maxHP: 10, currentHP: 10 });
const apply = (b: Build) => applyBuild(fresh(), b).character;
const ability = (c: Character, name: string) => c.abilities.find((a) => a.name === name);
/** Spells other agents are still writing. */
const PENDING = new Set(['spell:beast-sense']);

describe('Barbarian', () => {
  it('writes a level-1 barbarian onto the sheet', () => {
    const c = apply(build());
    expect(c.class).toBe('Варвар');
    // d12 + Constitution 15 (+2).
    expect(c.maxHP).toBe(14);
    expect(c.savingThrowProficiencies).toEqual(expect.arrayContaining(['strength', 'constitution']));
    const proficiencies = c.traits.find((t) => t.id === 'g-proficiencies')?.description ?? '';
    expect(proficiencies).toContain('Воинское оружие');
    expect(proficiencies).toContain('Средние доспехи');
    expect(proficiencies).not.toContain('Тяжёлые доспехи');
    const rage = c.resources.find((r) => r.id === 'barbarian.rage');
    expect(rage?.max).toBe(2);
    expect(ability(c, 'Ярость')?.actionType).toBe('bonus');
    expect(c.speed).toBe(30);
  });

  it('has Unarmored Defense from Constitution, kept with a shield', () => {
    const hero = createDndHero({ name: 'Т', build: build(), classKitId: 'b', backgroundKitId: 'b' });
    // 10 + Dexterity 13 (+1) + Constitution 15 (+2).
    expect(armorClassOf(hero)).toBe(13);
  });

  it('offers two melee weapon masteries at level 1 and one more at 4 and 10', () => {
    const plan = levelPlan(build(), 1);
    const mastery = plan.choices.find((c) => c.key === 'class:barbarian.weapon-mastery/mastery')!;
    expect(mastery.count).toBe(2);
    expect(mastery.choice.pool).toBe('weapon-mastery');
    expect(levelPlan(build({ level: 4 }), 4).choices.some((c) => c.choice.pool === 'weapon-mastery' && c.count === 1)).toBe(true);
    expect(levelPlan(build({ level: 10 }), 10).choices.some((c) => c.choice.pool === 'weapon-mastery' && c.count === 1)).toBe(true);
    expect(levelPlan(build({ level: 3 }), 3).choices.some((c) => c.key === 'class:barbarian.primal-knowledge/skill')).toBe(true);
  });

  it('grows rage uses, speed, Brutal Strike and the capstone with level', () => {
    const rage = (level: number) => apply(build({ level })).resources.find((r) => r.id === 'barbarian.rage')?.max;
    expect([1, 3, 6, 12, 17].map(rage)).toEqual([2, 3, 4, 5, 6]);
    expect(apply(build({ level: 5 })).speed).toBe(40);
    expect(ability(apply(build({ level: 9 })), 'Жестокий удар')?.damage).toBe('1d10');
    expect(ability(apply(build({ level: 17 })), 'Жестокий удар')?.damage).toBe('2d10');
    const twenty = apply(build({ level: 20 }));
    expect(twenty.attributes.strength).toBe(21);
    expect(twenty.attributes.constitution).toBe(19);
  });

  it('computes subclass numbers', () => {
    const berserker = apply(build({ subclass: 'path-of-the-berserker', level: 14 }));
    expect(ability(berserker, 'Бешенство')?.damage).toBe('3d6');
    // 8 + Strength 17 (+3) + proficiency 5.
    expect(ability(berserker, 'Устрашающее присутствие')?.saveDC).toBe(16);
    const zealot = apply(build({ subclass: 'path-of-the-zealot', level: 12 }));
    expect(ability(zealot, 'Божественная ярость')?.damage).toBe('1d6+6');
    expect(zealot.resources.find((r) => r.id === 'zealot.warrior-of-the-gods')?.max).toBe(6);
    const tree = apply(build({ subclass: 'path-of-the-world-tree', level: 16 }));
    expect(ability(tree, 'Жизненная сила Древа')?.damage).toBe('4d6');
  });

  it('lets a Wild Heart barbarian pick an aspect and cast its rituals with Wisdom', () => {
    let b = build({ subclass: 'path-of-the-wild-heart', level: 6 });
    const aspect = levelPlan(b, 6).choices.find((c) => c.key === 'subclass:wild-heart.aspect-of-the-wilds/aspect')!;
    expect(aspect).toBeDefined();
    b = setPicks(b, aspect.key, ['owl']);
    const c = apply(b);
    expect(c.traits.some((t) => t.name === 'Аспект совы')).toBe(true);
    expect(c.spells.find((s) => s.id === 'spell-speak-with-animals')?.alwaysPrepared).toBe(true);
  });

  it('applies every subclass at level 20 with nothing missing', () => {
    const barbarian = DND.classes.find((c) => c.id === 'barbarian')!;
    expect(barbarian.subclasses.map((s) => s.id)).toEqual([
      'path-of-the-berserker',
      'path-of-the-wild-heart',
      'path-of-the-world-tree',
      'path-of-the-zealot',
    ]);
    for (const subclass of barbarian.subclasses) {
      const { missing, character } = applyBuild(fresh(), build({ subclass: subclass.id, level: 20 }));
      expect(missing.filter((m) => !PENDING.has(m))).toEqual([]);
      expect(character.subclass).toBe(subclass.name);
    }
  });
});
