import { describe, expect, it } from 'vitest';
import { createCharacterDocument, type Character, type DndBuild } from '@itd/schema';
import { activeFeaturesOf, armorClassOf, endFeature, performAction, speedOf } from '../src';
import { applyBuild, choiceOptions, createDndHero, levelPlan, setPicks, sheetChoices } from '../src/dnd';

const FORMS = 'class:druid.wild-shape/forms';

const build = (patch: Partial<DndBuild> = {}): DndBuild => ({
  ruleset: 'dnd2024',
  species: 'human',
  background: 'sage',
  class: 'druid',
  abilityMethod: 'pointBuy',
  // Wisdom 17 (+3), Constitution 14 (+2), Dexterity 12.
  baseAttributes: { strength: 8, dexterity: 12, constitution: 14, intelligence: 13, wisdom: 15, charisma: 10 },
  backgroundBonuses: { wisdom: 2, intelligence: 1 },
  choices: { [FORMS]: ['wolf', 'cat', 'giant-lizard', 'boar'] },
  hitPoints: [],
  level: 2,
  ...patch,
});

const hero = (patch: Partial<DndBuild> = {}): Character =>
  createCharacterDocument(createDndHero({ name: 'Т', build: build(patch), classKitId: 'a', backgroundKitId: 'a' }));
/** What the store does: an edit that turns a feature on or off is followed by a rebuild. */
const rebuilt = (c: Character): Character => applyBuild(c, c.build as DndBuild).character;
const shift = (c: Character, name: string): Character => {
  const form = c.abilities.find((a) => a.name === `Облик: ${name}`)!;
  const result = performAction(c, { kind: 'ability', id: form.id });
  if (!result.ok) throw new Error(result.message);
  return rebuilt(result.character);
};

describe('Wild Shape', () => {
  it('turns every known beast into an ability that spends a use', () => {
    const druid = hero();
    const forms = druid.abilities.filter((a) => a.name.startsWith('Облик: ')).map((a) => a.name);
    expect(forms).toEqual(['Облик: Волк', 'Облик: Кошка', 'Облик: Гигантская ящерица', 'Облик: Кабан']);
    expect(druid.abilities.find((a) => a.name === 'Облик: Волк')).toMatchObject({ actionType: 'bonus', resourceId: 'druid.wild-shape', stance: true, stanceTempHP: 2 });
  });

  it('offers beasts by challenge and flight as the level allows, and four, six, eight of them', () => {
    const open = (level: number) => sheetChoices(build({ level })).find((c) => c.key === FORMS)!;
    expect([2, 4, 8].map((l) => open(l).count)).toEqual([4, 6, 8]);
    const options = (level: number) => choiceOptions(build({ level }), level, open(level));
    const available = (level: number) => options(level).filter((o) => !o.disabled).map((o) => o.id);
    expect(available(2)).toContain('giant-poisonous-snake');
    expect(available(2)).not.toContain('black-bear');
    expect(available(2)).not.toContain('raven');
    expect(available(4)).toContain('black-bear');
    expect(available(8)).toEqual(expect.arrayContaining(['brown-bear', 'giant-eagle', 'raven']));
    expect(available(8)).not.toContain('polar-bear');
    expect(levelPlan(build(), 2).choices.some((c) => c.key === FORMS)).toBe(true);
  });

  it('takes the beast’s body: armour class, speed, physical scores, attacks and temporary hit points', () => {
    const druid = hero();
    const wolf = shift(druid, 'Волк');
    expect(activeFeaturesOf(wolf).map((a) => a.name)).toEqual(['Облик: Волк']);
    expect(wolf.resources.find((r) => r.id === 'druid.wild-shape')!.current).toBe(1);
    expect(wolf.tempHP).toBe(2);
    expect(armorClassOf(wolf)).toBe(13);
    expect(speedOf(wolf)).toBe(40);
    expect(wolf.attributes).toMatchObject({ strength: 12, dexterity: 15, constitution: 12, wisdom: 17 });
    expect(wolf.maxHP).toBe(druid.maxHP);
    expect(wolf.attacks[0]).toMatchObject({ name: 'Укус', hitBonus: 4, damage: '2d4+2', damageType: 'Колющий' });

    const lizard = shift({ ...wolf, resources: druid.resources }, 'Гигантская ящерица');
    expect(activeFeaturesOf(lizard).map((a) => a.name)).toEqual(['Облик: Гигантская ящерица']);
    expect(lizard.movement).toEqual({ climb: 30, swim: undefined, fly: undefined });
    expect(lizard.darkvision).toBe(30);

    const back = rebuilt(endFeature(lizard, activeFeaturesOf(lizard)[0]!.id));
    expect(back.attributes).toMatchObject({ strength: 8, dexterity: 12, constitution: 14 });
    expect(back.attacks.some((a) => a.name === 'Укус')).toBe(false);
    expect(armorClassOf(back)).toBe(armorClassOf(druid));
    expect(back.movement).toBeUndefined();
  });

  it('forbids spells in a form until level 18', () => {
    const wolf = shift(hero(), 'Волк');
    const withSpell: Character = { ...wolf, spells: [{ id: 's', name: 'Огонёк', level: 0, prepared: true } as Character['spells'][number]] };
    expect(performAction(withSpell, { kind: 'spell', id: 's' })).toMatchObject({ ok: false, reason: 'blocked_by_feature' });
    const old = shift(hero({ level: 18 }), 'Волк');
    expect(old.abilities.find((a) => a.name === 'Облик: Волк')?.stanceNoSpells).toBeUndefined();
  });

  it('gives a Circle of the Moon druid sturdier forms and bigger beasts', () => {
    const moon = (level: number, forms: string[] = ['wolf']) =>
      hero({ level, subclass: 'circle-of-the-moon', choices: { [FORMS]: forms } });
    const wolf = shift(moon(3), 'Волк');
    // 13 + Wisdom 3 beats the wolf's 13; three times the druid level in temporary hit points.
    expect(armorClassOf(wolf)).toBe(16);
    expect(wolf.tempHP).toBe(9);
    const open = sheetChoices(build({ level: 6, subclass: 'circle-of-the-moon' })).find((c) => c.key === FORMS)!;
    const available = choiceOptions(build({ level: 6, subclass: 'circle-of-the-moon' }), 6, open).filter((o) => !o.disabled).map((o) => o.id);
    expect(available).toContain('polar-bear');
    expect(available).not.toContain('ankylosaurus');
  });

  it('changes the known forms on the sheet', () => {
    const swapped = applyBuild(hero(), setPicks(build(), FORMS, ['wolf', 'cat', 'giant-lizard', 'poisonous-snake'])).character;
    expect(swapped.abilities.some((a) => a.name === 'Облик: Ядовитая змея')).toBe(true);
    expect(swapped.abilities.some((a) => a.name === 'Облик: Кабан')).toBe(false);
  });
});
