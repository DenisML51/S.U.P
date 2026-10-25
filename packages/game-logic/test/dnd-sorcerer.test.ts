import { describe, expect, it } from 'vitest';
import type { DndBuild, Character } from '@itd/schema';
import { armorClassOf, startingSkills } from '../src';
import { DND, applyBuild, choiceOptions, collect, levelPlan, setPicks } from '../src/dnd';
import { makeCharacter } from './helpers';

const build = (patch: Partial<DndBuild> = {}): DndBuild => ({
  ruleset: 'dnd2024',
  species: 'human',
  background: 'sage',
  class: 'sorcerer',
  abilityMethod: 'pointBuy',
  // Charisma 17 (+3), Dexterity 15 (+2), Constitution 14 (+2).
  baseAttributes: { strength: 8, dexterity: 14, constitution: 14, intelligence: 10, wisdom: 10, charisma: 15 },
  backgroundBonuses: { charisma: 2, dexterity: 1 },
  choices: {},
  hitPoints: [],
  level: 1,
  ...patch,
});

const fresh = (): Character => makeCharacter({ skills: startingSkills(), maxHP: 10, currentHP: 10, inventory: [] });
const applied = (b: DndBuild) => applyBuild(fresh(), b);
const apply = (b: DndBuild) => applied(b).character;
/** Spells other agents are still writing may be missing; nothing else may. */
const pending = (id: string) => id.startsWith('spell:');
const unexpectedMissing = (b: DndBuild) => applied(b).missing.filter((id) => !pending(id));

const POINTS = 'sorcerer.sorcery-points';
const resource = (c: Character, id: string) => c.resources.find((r) => r.id === id);
const ability = (c: Character, name: string) => c.abilities.find((a) => a.name === name);

describe('sorcerer', () => {
  it('writes a level-1 sorcerer onto the sheet', () => {
    const c = apply(build());
    expect(c.class).toBe('Чародей');
    expect(c.maxHP).toBe(8);
    expect(c.savingThrowProficiencies).toEqual(expect.arrayContaining(['constitution', 'charisma']));
    const proficiencies = c.traits.find((t) => t.id === 'g-proficiencies')?.description ?? '';
    expect(proficiencies).toContain('Простое оружие');
    expect(proficiencies).not.toContain('доспехи');
    expect(resource(c, 'sorcerer.innate-sorcery')).toMatchObject({ max: 2, recovery: 'long' });
    expect(ability(c, 'Врождённое чародейство')?.actionType).toBe('bonus');
    expect(resource(c, POINTS)).toBeUndefined();
    expect(resource(c, 'slot-1')?.max).toBe(2);
    expect(c.spellcastingDifficultyValue).toBe(8 + 2 + 3);
    expect(armorClassOf(c)).toBe(12);
  });

  it('asks for four cantrips and two known spells on level 1, more by the table later', () => {
    const b = build();
    const plan = levelPlan(b, 1);
    const cantrips = plan.choices.find((c) => c.key.startsWith('casting:') && c.choice.id === 'cantrips')!;
    const spells = plan.choices.find((c) => c.key.startsWith('casting:') && c.choice.id === 'spells')!;
    expect(cantrips.count).toBe(4);
    expect(spells.count).toBe(2);
    expect(choiceOptions(b, 1, spells).every((o) => o.meta?.startsWith('1 круг'))).toBe(true);
    expect(levelPlan(b, 2).choices.find((c) => c.key.startsWith('casting:') && c.choice.id === 'spells')?.count).toBe(2);
    expect(levelPlan(b, 4).choices.find((c) => c.key.startsWith('casting:') && c.choice.id === 'cantrips')?.count).toBe(1);
    expect(levelPlan(b, 4).choices.find((c) => c.key.startsWith('casting:') && c.choice.id === 'spells')?.count).toBe(1);
    expect(levelPlan(b, 10).choices.find((c) => c.key.startsWith('casting:') && c.choice.id === 'cantrips')?.count).toBe(1);
    expect(levelPlan(b, 12).choices.find((c) => c.key.startsWith('casting:') && c.choice.id === 'spells')).toBeUndefined();
    expect(levelPlan(b, 20).choices.find((c) => c.key.startsWith('casting:') && c.choice.id === 'spells')?.count).toBe(1);
    const fifth = levelPlan(b, 5).choices.find((c) => c.key.startsWith('casting:') && c.choice.id === 'spells')!;
    expect(fifth.count).toBe(2);
    expect(choiceOptions(b, 5, fifth).some((o) => o.meta?.startsWith('3 круг'))).toBe(true);
  });

  it('follows the full caster slots', () => {
    const slots = (level: number) => apply(build({ level })).resources.filter((r) => r.id.startsWith('slot-')).map((r) => r.max);
    expect(slots(3)).toEqual([4, 2]);
    expect(slots(9)).toEqual([4, 3, 3, 3, 1]);
    expect(slots(20)).toEqual([4, 3, 3, 3, 3, 2, 2, 1, 1]);
  });

  it('has Sorcery Points equal to the level, restoration and Sorcery Incarnate', () => {
    expect(resource(apply(build({ level: 2 })), POINTS)).toMatchObject({ max: 2, recovery: 'long' });
    const c = apply(build({ level: 7 }));
    expect(resource(c, POINTS)?.max).toBe(7);
    expect(resource(c, 'sorcerer.sorcerous-restoration')).toMatchObject({ max: 1, recovery: 'long' });
    expect(ability(c, 'Воплощение чародейства')).toMatchObject({ actionType: 'bonus', resourceId: POINTS, resourceCost: 2 });
    expect(resource(apply(build({ level: 20 })), POINTS)?.max).toBe(20);
    expect(ability(apply(build({ level: 20 })), 'Апофеоз чародейства')).toBeDefined();
  });

  it('learns Metamagic on 2, 10 and 17, paid with Sorcery Points, and swaps one per level', () => {
    expect(DND.catalogs.metamagic).toHaveLength(10);
    let b = build({ level: 2 });
    const first = levelPlan(b, 2).choices.find((c) => c.key === 'class:sorcerer.metamagic/metamagic')!;
    expect(first.count).toBe(2);
    expect(choiceOptions(b, 2, first)).toHaveLength(10);
    b = setPicks(b, first.key, ['metamagic.quickened-spell', 'metamagic.subtle-spell']);
    const c = apply(b);
    expect(ability(c, 'Ускоренное заклинание')).toMatchObject({ resourceId: POINTS, resourceCost: 2 });
    expect(ability(c, 'Неуловимое заклинание')).toMatchObject({ resourceId: POINTS, resourceCost: 1 });

    const tenth = levelPlan(b, 10).choices.find((c) => c.key === 'class:sorcerer.metamagic-10/metamagic')!;
    expect(tenth.count).toBe(2);
    expect(choiceOptions(b, 10, tenth).find((o) => o.id === 'metamagic.quickened-spell')?.disabled).toBeTruthy();
    expect(levelPlan(b, 17).choices.find((c) => c.key === 'class:sorcerer.metamagic-17/metamagic')?.count).toBe(2);

    b = { ...b, level: 3 };
    const forget = levelPlan(b, 3).choices.find((c) => c.key === 'swap:metamagic@3/forget')!;
    expect(forget).toBeDefined();
    b = setPicks(b, forget.key, ['metamagic.subtle-spell']);
    const learn = levelPlan(b, 3).choices.find((c) => c.key === 'swap:metamagic@3/learn')!;
    expect(learn.count).toBe(1);
    b = setPicks(b, learn.key, ['metamagic.twinned-spell']);
    const swapped = apply(b);
    expect(ability(swapped, 'Неуловимое заклинание')).toBeUndefined();
    expect(ability(swapped, 'Удвоенное заклинание')).toBeDefined();
  });

  it('gives Draconic Sorcery hit points, unarmoured defence and an element', () => {
    const plain = apply(build({ level: 3 }));
    let b = build({ level: 3, subclass: 'draconic-sorcery' });
    const dragon = apply(b);
    expect(dragon.maxHP - plain.maxHP).toBe(3);
    expect(armorClassOf(dragon)).toBe(10 + 2 + 3);
    expect(dragon.spells.find((s) => s.id === 'spell-chromatic-orb')?.alwaysPrepared).toBe(true);
    expect(apply({ ...b, level: 10 }).maxHP - apply(build({ level: 10 })).maxHP).toBe(10);

    b = { ...b, level: 6 };
    const element = levelPlan(b, 6).choices.find((c) => c.key === 'subclass:draconic.elemental-affinity/element')!;
    expect(choiceOptions(b, 6, element).map((o) => o.id)).toEqual(['acid', 'cold', 'fire', 'lightning', 'poison']);
    b = setPicks(b, element.key, ['fire']);
    expect(apply(b).resistances.some((r) => r.type === 'Огонь')).toBe(true);
    expect(resource(apply({ ...b, level: 14 }), 'draconic.dragon-wings')?.max).toBe(1);
  });

  it('computes the numbers of the other origins', () => {
    const aberrant = apply(build({ level: 18, subclass: 'aberrant-sorcery' }));
    expect(ability(aberrant, 'Искажающий взрыв')).toMatchObject({ damage: '3d10', damageType: 'Силовой', saveAttribute: 'strength', saveDC: 8 + 6 + 3 });
    expect(aberrant.resistances.some((r) => r.type === 'Психический')).toBe(true);
    expect(aberrant.spells.find((s) => s.id === 'spell-mind-sliver')?.alwaysPrepared).toBe(true);

    const clockwork = apply(build({ level: 6, subclass: 'clockwork-sorcery' }));
    expect(resource(clockwork, 'clockwork.restore-balance')).toMatchObject({ max: 3, recovery: 'long' });
    expect(ability(clockwork, 'Бастион закона')).toMatchObject({ resourceId: POINTS, resourceCost: 1 });

    const wild = apply(build({ level: 6, subclass: 'wild-magic-sorcery' }));
    expect(resource(wild, 'wild-magic.tides-of-chaos')?.max).toBe(1);
    expect(ability(wild, 'Искривление удачи')).toMatchObject({ actionType: 'reaction', resourceId: POINTS, resourceCost: 1 });
  });

  it('applies every origin at level 20 with nothing missing but pending spells', () => {
    for (const subclass of ['aberrant-sorcery', 'clockwork-sorcery', 'draconic-sorcery', 'wild-magic-sorcery']) {
      const b = build({ level: 20, subclass });
      expect(unexpectedMissing(b)).toEqual([]);
      const features = collect(b).features.filter((f) => f.source === 'subclass' && !f.feature.hidden);
      expect(features.length).toBeGreaterThanOrEqual(5);
    }
  });
});
