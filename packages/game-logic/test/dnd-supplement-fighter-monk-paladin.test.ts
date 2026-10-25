import { describe, expect, it } from 'vitest';
import type { Build, Character } from '@itd/schema';
import { armorClassOf, startingSkills } from '../src';
import { DND, applyBuild, choiceOptions, createDndHero, levelPlan, setPicks } from '../src/dnd';
import { makeCharacter } from './helpers';

const build = (patch: Partial<Build> = {}): Build => ({
  ruleset: 'dnd2024',
  species: 'human',
  background: 'soldier',
  class: 'fighter',
  abilityMethod: 'pointBuy',
  baseAttributes: { strength: 15, dexterity: 14, constitution: 14, intelligence: 10, wisdom: 10, charisma: 10 },
  backgroundBonuses: {},
  choices: {},
  hitPoints: [],
  level: 1,
  ...patch,
});

const fresh = (): Character => makeCharacter({ skills: startingSkills(), maxHP: 10, currentHP: 10 });
const applied = (b: Build) => applyBuild(fresh(), b);
const apply = (b: Build) => applied(b).character;
const ability = (c: Character, name: string) => c.abilities.find((a) => a.name === name);
const resource = (c: Character, id: string) => c.resources.find((r) => r.id === id);

const SUPPLEMENT: { class: string; subclass: string; source: string }[] = [
  { class: 'fighter', subclass: 'banneret', source: 'Forgotten Realms: Heroes of Faerûn' },
  { class: 'fighter', subclass: 'arcane-archer', source: 'Arcana Unleashed' },
  { class: 'monk', subclass: 'warrior-of-the-mystic-arts', source: 'Arcana Unleashed' },
  { class: 'paladin', subclass: 'oath-of-the-noble-genies', source: 'Forgotten Realms: Heroes of Faerûn' },
];

describe('supplement subclasses: fighter, monk, paladin', () => {
  it('are registered after the PHB ones with their book and apply at 3 and 20 with nothing missing', () => {
    for (const entry of SUPPLEMENT) {
      const classDef = DND.classes.find((c) => c.id === entry.class)!;
      const index = classDef.subclasses.findIndex((s) => s.id === entry.subclass);
      expect(index).toBeGreaterThanOrEqual(4);
      const subclass = classDef.subclasses[index]!;
      expect(subclass.source).toBe(entry.source);
      for (const level of [3, 20]) {
        const { missing, character } = applied(build({ class: entry.class, subclass: entry.subclass, level }));
        expect(missing).toEqual([]);
        expect(character.subclass).toBe(subclass.name);
      }
    }
  });

  it('Banneret: envoy picks, Group Recovery healing and Team Resilience from Indomitable', () => {
    const b = build({ subclass: 'banneret', level: 3 });
    const plan = levelPlan(b, 3);
    expect(plan.choices.some((c) => c.key === 'subclass:banneret.knightly-envoy/language')).toBe(true);
    const skill = plan.choices.find((c) => c.key === 'subclass:banneret.knightly-envoy/skill')!;
    expect(choiceOptions(b, 3, skill).map((o) => o.id).sort()).toEqual(['insight', 'intimidation', 'performance', 'persuasion']);

    const c3 = apply(setPicks(b, 'subclass:banneret.knightly-envoy/skill', ['persuasion']));
    expect(c3.skills.find((s) => s.id === 'persuasion')?.proficient).toBe(true);
    expect(c3.spells.find((s) => s.id === 'spell-comprehend-languages')?.alwaysPrepared).toBe(true);
    expect(ability(c3, 'Групповое оздоровление')).toMatchObject({ damage: '1d4+3', damageType: 'Лечение' });
    expect(resource(c3, 'banneret.group-recovery')).toMatchObject({ max: 1, recovery: 'short' });

    const c20 = apply({ ...b, level: 20 });
    expect(ability(c20, 'Групповое оздоровление')?.damage).toBe('1d4+20');
    expect(ability(c20, 'Устойчивость команды')).toMatchObject({ actionType: 'reaction', resourceId: 'fighter.indomitable' });
    expect(ability(c20, 'Вдохновляющий командир')).toBeTruthy();
  });

  it('Arcane Archer: lore, Arcane Shot uses, die and DC, options in one pool and their swap', () => {
    // Intelligence 16 (+3).
    const base = build({ subclass: 'arcane-archer', level: 3, baseAttributes: { ...build().baseAttributes, intelligence: 15 }, backgroundBonuses: { intelligence: 1 } });
    const plan = levelPlan(base, 3);
    const shots = plan.choices.find((c) => c.key === 'subclass:arcane-archer.arcane-shot/arcane-shots')!;
    expect(shots.count).toBe(2);
    expect(choiceOptions(base, 3, shots)).toHaveLength(8);
    expect(plan.choices.some((c) => c.key === 'subclass:arcane-archer.lore/cantrip')).toBe(true);

    let b = setPicks(base, 'subclass:arcane-archer.arcane-shot/arcane-shots', ['bursting-arrow', 'banishing-arrow']);
    b = setPicks(b, 'subclass:arcane-archer.lore/cantrip', ['prestidigitation']);
    const c3 = apply(b);
    expect(c3.skills.find((s) => s.id === 'arcana')?.proficient).toBe(true);
    expect(c3.skills.find((s) => s.id === 'nature')?.proficient).toBe(true);
    expect(c3.spells.find((s) => s.id === 'spell-prestidigitation')?.alwaysPrepared).toBe(true);
    expect(resource(c3, 'arcane-archer.arcane-shot')).toMatchObject({ max: 3, recovery: 'short' });
    expect(ability(c3, 'Взрывной выстрел')).toMatchObject({ damage: '2d6', damageType: 'Силовой', resourceId: 'arcane-archer.arcane-shot' });
    expect(ability(c3, 'Изгоняющий выстрел')).toMatchObject({ damage: '1d6', saveAttribute: 'charisma', saveDC: 8 + 2 + 3 });

    // One more option at 7, 10, 15 and 18; nothing at 8.
    const newShots = (level: number) => levelPlan(b, level).choices.find((c) => c.key === `subclass:arcane-archer.arcane-shot-${level}/arcane-shots`)?.count ?? 0;
    expect([7, 10, 15, 18].map(newShots)).toEqual([1, 1, 1, 1]);
    expect(levelPlan(b, 8).choices.some((c) => c.choice.pool === 'arcane-shots' && c.choice.id === 'arcane-shots')).toBe(false);

    // A known option may be given up for another on a later level.
    expect(levelPlan(b, 7).choices.some((c) => c.key === 'swap:arcane-shots@7/forget')).toBe(true);
    let swapped = setPicks(b, 'swap:arcane-shots@7/forget', ['banishing-arrow']);
    swapped = setPicks(swapped, 'swap:arcane-shots@7/learn', ['shadow-arrow']);
    const c7 = apply({ ...swapped, level: 7 });
    expect(ability(c7, 'Изгоняющий выстрел')).toBeUndefined();
    expect(ability(c7, 'Тьмяной выстрел')).toMatchObject({ saveAttribute: 'wisdom' });
    expect(resource(c7, 'arcane-archer.magic-ammunition')).toMatchObject({ max: 1, recovery: 'short' });
    expect(ability(c7, 'Странствующая стрела')?.actionType).toBe('bonus');

    const at = (level: number) => ability(apply({ ...b, level }), 'Взрывной выстрел')?.damage;
    expect([at(9), at(10), at(15), at(18)]).toEqual(['2d6', '2d8', '2d10', '2d12']);
    expect(ability(apply({ ...b, level: 18 }), 'Изгоняющий выстрел')?.saveDC).toBe(8 + 6 + 3);
  });

  it('Warrior of the Mystic Arts: sorcerer spells with Wisdom on third-caster slots', () => {
    const b = build({
      class: 'monk',
      subclass: 'warrior-of-the-mystic-arts',
      level: 3,
      baseAttributes: { strength: 8, dexterity: 15, constitution: 13, intelligence: 10, wisdom: 15, charisma: 10 },
      backgroundBonuses: { dexterity: 2, wisdom: 1 },
    });
    const plan = levelPlan(b, 3);
    const cantrips = plan.choices.find((c) => c.choice.id === 'cantrips')!;
    const spells = plan.choices.find((c) => c.choice.id === 'spells')!;
    expect(cantrips.count).toBe(2);
    expect(spells.count).toBe(3);
    expect(choiceOptions(b, 3, spells).every((o) => o.meta?.startsWith('1 круг'))).toBe(true);
    expect(choiceOptions(b, 3, cantrips).some((o) => o.id === 'blade-ward')).toBe(true);

    const picked = setPicks(setPicks(b, cantrips.key, ['blade-ward', 'thunderclap']), spells.key, ['magic-missile', 'jump', 'shield']);
    const c3 = apply(picked);
    expect(c3.spells.find((s) => s.id === 'spell-shield')?.alwaysPrepared).toBe(true);
    expect(resource(c3, 'slot-1')?.max).toBe(2);
    // Wisdom 16 (+3), proficiency +2.
    expect(c3.spellcastingDifficultyValue).toBe(8 + 2 + 3);

    expect(levelPlan(picked, 4).choices.some((c) => c.key === 'swap:known-spells@4/forget')).toBe(true);
    expect(levelPlan(picked, 4).choices.some((c) => c.key === 'swap:known-cantrips@4/forget')).toBe(true);
    expect(levelPlan(b, 10).choices.find((c) => c.choice.id === 'cantrips')?.count).toBe(1);
    const spellsAt = (level: number) => levelPlan(b, level).choices.find((c) => c.choice.id === 'spells')?.count ?? 0;
    expect([4, 5, 7, 8, 13, 19, 20].map(spellsAt)).toEqual([1, 0, 1, 1, 1, 1, 1]);

    const c20 = apply({ ...b, level: 20 });
    expect(c20.resources.filter((r) => r.id.startsWith('slot-')).map((r) => r.max)).toEqual([4, 3, 3, 1]);
    expect(ability(c20, 'Мистическая сосредоточенность')).toBeTruthy();
    expect(ability(c20, 'Улучшенный стиль мистического воина')).toBeTruthy();
  });

  it('Oath of the Noble Genies: oath spells, Elemental Smite, unarmoured AC with a shield, Elemental Rebuke', () => {
    // Dexterity 14 (+2), Charisma 17 (+3).
    const b = build({
      class: 'paladin',
      subclass: 'oath-of-the-noble-genies',
      level: 3,
      baseAttributes: { strength: 15, dexterity: 14, constitution: 13, intelligence: 8, wisdom: 10, charisma: 15 },
      backgroundBonuses: { charisma: 2 },
    });
    const c3 = apply(b);
    const spells = c3.spells.filter((s) => s.alwaysPrepared).map((s) => s.id);
    expect(spells).toEqual(expect.arrayContaining(['spell-thunderous-smite', 'spell-chromatic-orb', 'spell-elementalism']));
    expect(spells).not.toContain('spell-fly');
    expect(ability(c3, 'Всплеск марида')).toMatchObject({ saveAttribute: 'strength', saveDC: 8 + 2 + 3, resourceId: 'paladin.channel-divinity' });
    expect(ability(c3, 'Ярость ифрита')).toMatchObject({ damage: '2d4', damageType: 'Огонь' });
    expect(ability(c3, 'Побег джинна')).toBeTruthy();
    expect(ability(c3, 'Давление дао')).toBeTruthy();
    const skill = levelPlan(b, 3).choices.find((c) => c.key === 'subclass:noble-genies.genies-splendor/skill')!;
    expect(choiceOptions(b, 3, skill).map((o) => o.id).sort()).toEqual(['acrobatics', 'intimidation', 'performance', 'persuasion']);

    const hero = createDndHero({ name: 'Т', build: b, classKitId: 'b', backgroundKitId: 'b' });
    // 10 + Dexterity (+2) + Charisma (+3).
    expect(armorClassOf(hero)).toBe(15);
    const withShield = {
      ...hero,
      inventory: [...hero.inventory, { id: 'sh', name: 'Щит', type: 'armor' as const, equipped: true, weight: 6, cost: 10, description: '', ref: 'shield', armorType: 'shield' }],
    };
    expect(armorClassOf(withShield as typeof hero)).toBe(17);

    const c17 = apply({ ...b, level: 17 });
    expect(c17.spells.filter((s) => s.alwaysPrepared).map((s) => s.id)).toEqual(
      expect.arrayContaining(['spell-fly', 'spell-summon-elemental', 'spell-banishing-smite', 'spell-contact-other-plane']),
    );
    expect(ability(c17, 'Стихийное возмездие')).toMatchObject({ actionType: 'reaction', damage: '2d10+3', saveAttribute: 'dexterity', saveDC: 8 + 6 + 3 });
    expect(resource(c17, 'noble-genies.elemental-rebuke')).toMatchObject({ max: 3, recovery: 'long' });
    expect(ability(c17, 'Аура стихийной защиты')).toBeTruthy();

    const c20 = apply({ ...b, level: 20 });
    expect(ability(c20, 'Благородный гений')).toMatchObject({ actionType: 'bonus' });
    expect(resource(c20, 'noble-genies.noble-genie')).toMatchObject({ max: 1, recovery: 'long' });
  });
});
