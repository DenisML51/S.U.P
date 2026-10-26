import { describe, expect, it } from 'vitest';
import type { DndBuild, Character } from '@itd/schema';
import { armorClassOf, speedOf, startingSkills } from '../src';
import { DND, applyBuild, createDndHero, levelPlan } from '../src/dnd';
import { makeCharacter } from './helpers';

const build = (patch: Partial<DndBuild> = {}): DndBuild => ({
  ruleset: 'dnd2024',
  species: 'human',
  background: 'soldier',
  class: 'monk',
  abilityMethod: 'pointBuy',
  baseAttributes: { strength: 8, dexterity: 15, constitution: 13, intelligence: 10, wisdom: 14, charisma: 10 },
  backgroundBonuses: { dexterity: 2, wisdom: 1 },
  choices: {},
  hitPoints: [],
  level: 1,
  ...patch,
});

const fresh = (): Character => makeCharacter({ skills: startingSkills(), maxHP: 10, currentHP: 10 });
const apply = (b: DndBuild) => applyBuild(fresh(), b).character;
const ability = (c: Character, name: string) => c.abilities.find((a) => a.name === name);

describe('Monk', () => {
  it('writes a level-1 monk onto the sheet', () => {
    const c = apply(build());
    expect(c.class).toBe('Монах');
    // d8 + Constitution 13 (+1).
    expect(c.maxHP).toBe(9);
    expect(c.savingThrowProficiencies).toEqual(expect.arrayContaining(['strength', 'dexterity']));
    const proficiencies = c.traits.find((t) => t.id === 'g-proficiencies')?.description ?? '';
    expect(proficiencies).toContain('Воинское оружие (лёгкое)');
    expect(proficiencies).not.toContain('доспехи');
    expect(c.resources.some((r) => r.id === 'monk.focus')).toBe(false);
    const unarmed = c.attacks.find((a) => a.id === 'g-attack-monk.unarmed-strike')!;
    // Martial Arts d6 with Dexterity 17 (+3), proficiency +2.
    expect(unarmed).toMatchObject({ damage: '1d6+3', damageType: 'Дробящий', hitBonus: 5, attribute: 'dexterity' });
    expect(levelPlan(build(), 1).choices.some((c) => c.key === 'class:monk.tool-proficiency/tool')).toBe(true);
  });

  it('has Unarmored Defense from Wisdom, lost with a shield, and attacks with Dexterity using monk weapons', () => {
    const hero = createDndHero({ name: 'Т', build: build(), classKitId: 'a', backgroundKitId: 'b' });
    // 10 + Dexterity 17 (+3) + Wisdom 15 (+2).
    expect(armorClassOf(hero)).toBe(15);
    const withShield = {
      ...hero,
      inventory: [...hero.inventory, { id: 'sh', name: 'Щит', type: 'armor' as const, equipped: true, weight: 6, cost: 10, description: '', ref: 'shield', armorType: 'shield' }],
    };
    // Wisdom no longer counts: 10 + Dexterity (+3) + shield 2.
    expect(armorClassOf(withShield as typeof hero)).toBe(15);
    const wise = createDndHero({ name: 'Т', build: build({ baseAttributes: { ...build().baseAttributes, wisdom: 16 } }), classKitId: 'a', backgroundKitId: 'b' });
    expect(armorClassOf(wise)).toBe(16);
    expect(armorClassOf({ ...wise, inventory: [...wise.inventory, withShield.inventory.at(-1)!] } as typeof wise)).toBe(15);
    expect(hero.attacks.find((a) => a.name === 'Копьё')?.attribute).toBe('dexterity');
  });

  it('grows focus, speed, the Martial Arts die and the capstone with level', () => {
    const at = (level: number) => apply(build({ level }));
    expect(at(2).resources.find((r) => r.id === 'monk.focus')).toMatchObject({ max: 2, recovery: expect.anything() });
    expect(at(11).resources.find((r) => r.id === 'monk.focus')?.max).toBe(11);
    expect([2, 6, 10, 14, 18].map((l) => speedOf(at(l)))).toEqual([40, 45, 50, 55, 60]);
    const die = (level: number) => at(level).attacks.find((a) => a.id === 'g-attack-monk.unarmed-strike')?.damage;
    expect([1, 5, 11, 17].map(die)).toEqual(['1d6+3', '1d8+3', '1d10+3', '1d12+3']);
    // 8 + Wisdom 15 (+2) + proficiency 3.
    expect(ability(at(5), 'Ошеломляющий удар')).toMatchObject({ saveDC: 13, saveAttribute: 'constitution', resourceId: 'monk.focus' });
    expect(ability(at(2), 'Шквал ударов')?.resourceId).toBe('monk.focus');
    const fourteen = at(14);
    expect(fourteen.savingThrowProficiencies).toEqual(
      expect.arrayContaining(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']),
    );
    const twenty = at(20);
    expect(twenty.attributes.dexterity).toBe(21);
    expect(twenty.attributes.wisdom).toBe(19);
    expect(ability(twenty, 'Совершенная защита')?.resourceCost).toBe(3);
  });

  it('computes subclass numbers', () => {
    const mercy = apply(build({ subclass: 'warrior-of-mercy', level: 3 }));
    expect(ability(mercy, 'Исцеляющая рука')?.damage).toBe('1d6+2');
    expect(ability(mercy, 'Повреждающая рука')?.damageType).toBe('Некротический');
    expect(mercy.savingThrowProficiencies).toBeDefined();
    const elements = apply(build({ subclass: 'warrior-of-the-elements', level: 6 }));
    expect(ability(elements, 'Стихийный выброс')).toMatchObject({ damage: '3d8', resourceCost: 2, saveDC: 13 });
    const openHand = apply(build({ subclass: 'warrior-of-the-open-hand', level: 17 }));
    // 8 + Wisdom 15 (+2) + proficiency 6.
    expect(ability(openHand, 'Дрожащая ладонь')).toMatchObject({ damage: '10d12', saveDC: 16, resourceCost: 4 });
    expect(openHand.resources.find((r) => r.id === 'open-hand.wholeness-of-body')?.max).toBe(2);
    const shadow = apply(build({ subclass: 'warrior-of-shadow', level: 3 }));
    expect(shadow.spells.find((s) => s.id === 'spell-darkness')?.resourceId).toBe('monk.focus');
    expect(shadow.spells.some((s) => s.id === 'spell-minor-illusion')).toBe(true);
  });

  it('applies every subclass at level 20 with nothing missing', () => {
    const monk = DND.classes.find((c) => c.id === 'monk')!;
    expect(monk.subclasses.filter((s) => !s.source).map((s) => s.id).sort()).toEqual([
      'warrior-of-mercy',
      'warrior-of-shadow',
      'warrior-of-the-elements',
      'warrior-of-the-open-hand',
    ]);
    for (const subclass of monk.subclasses) {
      const { missing, character } = applyBuild(fresh(), build({ subclass: subclass.id, level: 20 }));
      expect(missing).toEqual([]);
      expect(character.subclass).toBe(subclass.name);
    }
  });
});
