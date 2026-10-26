import { describe, expect, it } from 'vitest';
import { createCharacterDocument, type Character, type DndBuild } from '@itd/schema';
import { performAction, slotConversions } from '../src';
import { createDndHero } from '../src/dnd';

const build = (patch: Partial<DndBuild> = {}): DndBuild => ({
  ruleset: 'dnd2024',
  species: 'human',
  background: 'soldier',
  class: 'paladin',
  abilityMethod: 'pointBuy',
  baseAttributes: { strength: 15, dexterity: 10, constitution: 14, intelligence: 8, wisdom: 12, charisma: 15 },
  backgroundBonuses: { strength: 2, constitution: 1 },
  choices: {},
  hitPoints: [],
  level: 3,
  ...patch,
});
const hero = (b: DndBuild): Character => createCharacterDocument(createDndHero({ name: 'Т', build: b, classKitId: 'a', backgroundKitId: 'a' }));
const ability = (c: Character, name: string) => c.abilities.find((a) => a.name === name)!;
const pool = (c: Character, id: string) => c.resources.find((r) => r.id === id)!;

describe('abilities of a chosen cost', () => {
  it('Lay on Hands spends as much of its pool as asked, within the pool', () => {
    const paladin = hero(build());
    const lay = ability(paladin, 'Наложение рук');
    expect(lay).toMatchObject({ resourceId: 'paladin.lay-on-hands', resourceCost: 1, resourceCostMax: 15, damagePerPoint: '1' });
    const used = performAction(paladin, { kind: 'ability', id: lay.id, resourceAmount: 7 });
    expect(used.ok && pool(used.character, 'paladin.lay-on-hands').current).toBe(8);
    const greedy = performAction(paladin, { kind: 'ability', id: lay.id, resourceAmount: 99 });
    expect(greedy.ok && pool(greedy.character, 'paladin.lay-on-hands').current).toBe(0);
  });
});

describe('Font of Magic', () => {
  const sorcerer = () =>
    hero(build({ class: 'sorcerer', background: 'sage', backgroundBonuses: { charisma: 2, constitution: 1 }, level: 5 }));

  it('turns a slot into as many points as its level, and points into a slot by the table', () => {
    const hero5 = sorcerer();
    const toPoints = ability(hero5, 'Ячейка → очки чародейства');
    const toSlot = ability(hero5, 'Очки чародейства → ячейка');
    expect(toPoints).toMatchObject({ convert: 'slotToPoints', resourceCost: undefined, actionType: 'passive' });

    // Points are full at the start: nothing to gain, but a spent slot can be made back.
    expect(slotConversions(hero5, 'sorcerer.sorcery-points', 'slotToPoints')[0]?.blocked).toBe('Очки уже полны');
    const madeSlot = performAction(
      { ...hero5, resources: hero5.resources.map((r) => (r.id === 'slot-2' ? { ...r, current: 0 } : r)) },
      { kind: 'ability', id: toSlot.id, conversionLevel: 2 },
    );
    expect(madeSlot.ok).toBe(true);
    if (!madeSlot.ok) return;
    expect(pool(madeSlot.character, 'slot-2').current).toBe(1);
    expect(pool(madeSlot.character, 'sorcerer.sorcery-points').current).toBe(2);

    const back = performAction(madeSlot.character, { kind: 'ability', id: toPoints.id, conversionLevel: 2 });
    expect(back.ok && pool(back.character, 'sorcerer.sorcery-points').current).toBe(4);
    expect(back.ok && pool(back.character, 'slot-2').current).toBe(0);
    expect(back.ok && back.message).toContain('ячейка 2 круга → очки +2');
  });

  it('makes no slot of a level the hero has none of, or above level 5', () => {
    const levels = slotConversions(sorcerer(), 'sorcerer.sorcery-points', 'pointsToSlot').map((o) => o.level);
    expect(levels).toEqual([1, 2, 3]);
  });
});
