import { describe, expect, it } from 'vitest';
import type { Character, DndBuild } from '@itd/schema';
import { movementOf, speedHint, speedOf, startingSkills } from '../src';
import { applyBuild } from '../src/dnd';
import { item, makeCharacter } from './helpers';

const build = (patch: Partial<DndBuild> = {}): DndBuild => ({
  ruleset: 'dnd2024',
  species: 'human',
  background: 'soldier',
  class: 'fighter',
  abilityMethod: 'pointBuy',
  baseAttributes: { strength: 15, dexterity: 14, constitution: 13, intelligence: 8, wisdom: 12, charisma: 10 },
  backgroundBonuses: { strength: 2, constitution: 1 },
  choices: {},
  hitPoints: [],
  level: 1,
  ...patch,
});

const apply = (b: DndBuild): Character =>
  applyBuild(makeCharacter({ skills: startingSkills(), maxHP: 10, currentHP: 10, inventory: [] }), b).character;
const wearing = (c: Character, ...gear: Character['inventory']): Character => ({ ...c, inventory: [...c.inventory, ...gear] });
const plate = item('plate', { name: 'Латы', type: 'armor', equipped: true, baseAC: 18, dexModifier: false });
const leather = item('leather', { name: 'Кожаный доспех', type: 'armor', equipped: true, baseAC: 11, dexModifier: true });
const shield = item('shield', { name: 'Щит', type: 'armor', equipped: true });

describe('speed that depends on the gear', () => {
  it('gives a Monk Unarmored Movement only without armour or a shield', () => {
    const monk = apply(build({ class: 'monk', level: 6 }));
    expect(monk.speed).toBe(30);
    expect(speedOf(monk)).toBe(45);
    expect(speedOf(wearing(monk, leather))).toBe(30);
    expect(speedOf(wearing(monk, shield))).toBe(30);
    expect(speedHint(monk)).toBe('Скорость, фт: основа 30 · без доспехов +15');
  });

  it('gives a Barbarian Fast Movement in anything but heavy armour', () => {
    const barbarian = apply(build({ class: 'barbarian', level: 5 }));
    expect(speedOf(wearing(barbarian, leather, shield))).toBe(40);
    expect(speedOf(wearing(barbarian, plate))).toBe(30);
  });

  it('takes exhaustion off the whole speed', () => {
    const monk = { ...apply(build({ class: 'monk', level: 2 })), exhaustion: 2 };
    expect(speedOf(monk)).toBe(30);
    expect(speedHint(monk)).toBe('Скорость, фт: основа 30 · без доспехов +10 · истощение −10');
  });
});

describe('other movement and darkvision', () => {
  it('gives a Ranger climbing and swimming at the walking speed from Roving', () => {
    const ranger = apply(build({ class: 'ranger', level: 6 }));
    expect(ranger.movement).toEqual({ climb: 0, swim: 0 });
    expect(movementOf(ranger).map((m) => [m.mode, m.feet])).toEqual([['climb', 40], ['swim', 40]]);
    expect(movementOf(wearing(ranger, plate)).map((m) => m.feet)).toEqual([30, 30]);
  });

  it('reads darkvision from the species, the longer one of a lineage winning', () => {
    expect(apply(build()).darkvision).toBeUndefined();
    expect(apply(build({ species: 'dwarf' })).darkvision).toBe(120);
    expect(apply(build({ species: 'elf' })).darkvision).toBe(60);
    expect(apply(build({ species: 'elf', choices: { 'species:elf.lineage/lineage': ['drow'] } })).darkvision).toBe(120);
  });

  it('extends darkvision a hero has and gives it to one who has none', () => {
    const stalker = (species: string) => apply(build({ class: 'ranger', subclass: 'gloom-stalker', level: 3, species }));
    expect(stalker('human').darkvision).toBe(60);
    expect(stalker('elf').darkvision).toBe(120);
    const owl = apply(
      build({ class: 'barbarian', subclass: 'path-of-the-wild-heart', level: 6, species: 'orc', choices: { 'subclass:wild-heart.aspect-of-the-wilds/aspect': ['owl'] } }),
    );
    expect(owl.darkvision).toBe(180);
    expect(speedHint(owl)).toContain(' · тёмное зрение 180');
  });
});
