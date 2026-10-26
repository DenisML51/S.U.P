import { describe, expect, it } from 'vitest';
import { createCharacterDocument, type Character, type DndBuild } from '@itd/schema';
import { activeFeaturesOf, endFeature, longRest, performAction, planD20, setCondition, speedOf } from '../src';
import { applyBuild, createDndHero } from '../src/dnd';

const build = (patch: Partial<DndBuild> = {}): DndBuild => ({
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

/** What the store does: an edit that turns a feature on or off is followed by a rebuild. */
const rebuilt = (c: Character): Character => applyBuild(c, c.build as DndBuild).character;
const use = (c: Character, name: string): Character => {
  const ability = c.abilities.find((a) => a.name === name)!;
  const result = performAction(c, { kind: 'ability', id: ability.id });
  if (!result.ok) throw new Error(result.message);
  return rebuilt(result.character);
};
const hero = (patch: Partial<DndBuild> = {}): Character =>
  createCharacterDocument(createDndHero({ name: 'Т', build: build(patch), classKitId: 'a', backgroundKitId: 'b' }));
const greataxe = (c: Character) => c.attacks.find((a) => a.name === 'Секира')!;

describe('Rage', () => {
  it('turns on and gives resistance, Rage Damage on Strength attacks and advantage on Strength', () => {
    const calm = hero();
    expect(greataxe(calm).damage).toBe('1d12+3');
    const raging = use(calm, 'Ярость');
    expect(activeFeaturesOf(raging).map((a) => a.name)).toEqual(['Ярость']);
    expect(raging.resources.find((r) => r.id === 'barbarian.rage')!.current).toBe(1);
    expect(raging.resistances.map((r) => r.type)).toEqual(expect.arrayContaining(['Дробящий', 'Колющий', 'Рубящий']));
    expect(greataxe(raging).damage).toBe('1d12+5');
    expect(planD20(raging, { kind: 'save', attribute: 'strength' }).mode).toBe('advantage');
    expect(planD20(raging, { kind: 'save', attribute: 'dexterity' }).mode).toBe('normal');
  });

  it('cannot be started twice and grows with the class', () => {
    const raging = use(hero(), 'Ярость');
    const again = performAction(raging, { kind: 'ability', id: activeFeaturesOf(raging)[0]!.id });
    expect(again).toMatchObject({ ok: false, reason: 'already_active' });
    expect(greataxe(use(hero({ level: 9 }), 'Ярость')).damage).toBe('1d12+6');
  });

  it('ends by choice, unconscious or on a long rest, and the numbers go back', () => {
    const raging = use(hero(), 'Ярость');
    const id = activeFeaturesOf(raging)[0]!.id;
    for (const ended of [
      rebuilt(endFeature(raging, id)),
      rebuilt(setCondition(raging, 'unconscious', true)),
      rebuilt(longRest(raging).character),
    ]) {
      expect(ended.activeFeatures).toBeUndefined();
      expect(ended.resistances).toEqual([]);
      expect(greataxe(ended).damage).toBe('1d12+3');
    }
  });

  it('ends concentration and forbids spells while it lasts', () => {
    const concentrating: Character = { ...hero(), concentratingOn: { kind: 'spell', id: 's', name: 'Благословение', startedAt: 0 } };
    const raging = use(concentrating, 'Ярость');
    expect(raging.concentratingOn).toBeUndefined();
    const withSpell: Character = { ...raging, spells: [{ id: 's', name: 'Огонёк', level: 0, prepared: true } as Character['spells'][number]] };
    expect(performAction(withSpell, { kind: 'spell', id: 's' })).toMatchObject({ ok: false, reason: 'blocked_by_feature' });
  });

  it('forgets a feature that is on once the sheet no longer has it', () => {
    const raging = use(hero(), 'Ярость');
    const fighter = applyBuild(raging, { ...(raging.build as DndBuild), class: 'fighter' }).character;
    expect(fighter.activeFeatures).toBeUndefined();
  });
});

describe('other features that are on', () => {
  it('Innate Sorcery raises the spell save DC and gives spell attacks advantage', () => {
    const sorcerer = hero({ class: 'sorcerer', baseAttributes: { strength: 8, dexterity: 13, constitution: 14, intelligence: 10, wisdom: 12, charisma: 15 }, backgroundBonuses: { charisma: 2, constitution: 1 } });
    const dc = sorcerer.spellcastingDifficultyValue!;
    const lit = use(sorcerer, 'Врождённое чародейство');
    expect(lit.spellcastingDifficultyValue).toBe(dc + 1);
    expect(planD20(lit, { kind: 'attack', spell: true }).mode).toBe('advantage');
    expect(planD20(lit, { kind: 'attack' }).mode).toBe('normal');
  });

  it('Large Form adds 10 feet of speed and Draconic Flight a flying speed equal to it', () => {
    const goliath = hero({ species: 'goliath', level: 5 });
    expect(speedOf(use(goliath, 'Большая форма'))).toBe(speedOf(goliath) + 10);
    const dragonborn = use(hero({ species: 'dragonborn', level: 5 }), 'Драконий полёт');
    expect(dragonborn.movement).toEqual({ fly: 0 });
  });
});
