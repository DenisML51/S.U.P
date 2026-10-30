import { describe, expect, it } from 'vitest';
import type { Character, DndBuild, DndClass } from '@itd/schema';
import { castableSlots, preparationBlocker, preparedCount, slotPoolFor, spellAttackBonusFor, spellDamageAt, spellSaveDCFor, startingSkills } from '../src';
import { ATTRIBUTES_LIST } from '../src/content/attributes';
import {
  DND,
  addLevel,
  applyBuild,
  classAtLevel,
  collect,
  describeGrant,
  dropLastLevel,
  heroLevel,
  levelPlan,
  multiclassBlocker,
  setPicks,
  setSubclass,
} from '../src/dnd';
import { makeCharacter } from './helpers';

/** A soldier with every score 14 unless given: fit for any class. */
const hero = (classes: DndClass[], patch: Partial<DndBuild> = {}): DndBuild => ({
  ruleset: 'dnd2024',
  species: 'human',
  background: 'soldier',
  abilityMethod: 'manual',
  baseAttributes: { strength: 14, dexterity: 14, constitution: 14, intelligence: 14, wisdom: 14, charisma: 14 },
  backgroundBonuses: {},
  choices: {},
  hitPoints: [],
  classes,
  ...patch,
});
const apply = (b: DndBuild): Character =>
  applyBuild(makeCharacter({ skills: startingSkills(), maxHP: 10, currentHP: 10, savingThrowProficiencies: [] }), b).character;
const has = (c: Character, name: string) => [...c.abilities, ...c.traits].some((entry) => entry.name === name);
const proficiencies = (c: Character) => c.traits.find((t) => t.id === 'g-proficiencies')?.description ?? '';

const attributes = new Set<string>(ATTRIBUTES_LIST.map((a) => a.id));
const classOf = (id: string) => DND.classes.find((c) => c.id === id)!;

describe('multiclass content', () => {
  it('gives every class a requirement of real scores', () => {
    for (const classDef of DND.classes) {
      expect(classDef.multiclass.requires.length, classDef.id).toBeGreaterThan(0);
      for (const group of classDef.multiclass.requires) {
        expect(group.length, classDef.id).toBeGreaterThan(0);
        for (const attribute of group) expect(attributes.has(attribute), `${classDef.id}: ${attribute}`).toBe(true);
      }
    }
  });

  it('follows the 2024 requirements: "or" between groups, "and" within one', () => {
    expect(classOf('fighter').multiclass.requires).toEqual([['strength'], ['dexterity']]);
    expect(classOf('monk').multiclass.requires).toEqual([['dexterity', 'wisdom']]);
    expect(classOf('paladin').multiclass.requires).toEqual([['strength', 'charisma']]);
    expect(classOf('ranger').multiclass.requires).toEqual([['dexterity', 'wisdom']]);
    expect(classOf('wizard').multiclass.requires).toEqual([['intelligence']]);
  });

  it('gives no saving throws and only the multiclass part of the proficiencies', () => {
    const names = (id: string) => classOf(id).multiclass.proficiencies.map((e) => (e.type === 'proficiency' ? e.value : e.type));
    expect(names('barbarian')).toEqual(['Щиты', 'Воинское оружие']);
    expect(names('cleric')).toEqual(['Лёгкие доспехи', 'Средние доспехи', 'Щиты']);
    expect(names('rogue')).toEqual(['Лёгкие доспехи', 'Воровские инструменты']);
    expect(names('monk')).toEqual([]);
    expect(names('wizard')).toEqual([]);
    for (const classDef of DND.classes) expect(classDef.multiclass.proficiencies.every((e) => e.type === 'proficiency'), classDef.id).toBe(true);
  });

  it('gives a skill to a bard, a ranger and a rogue only', () => {
    const withSkills = DND.classes.filter((c) => c.multiclass.skills).map((c) => c.id);
    expect(withSkills.sort()).toEqual(['bard', 'ranger', 'rogue']);
  });

  it('keeps the starting-only picks out of the class levels', () => {
    const bard = classOf('bard');
    expect(bard.starting?.[0]?.choices?.[0]?.count).toBe(3);
    expect(bard.multiclass.features?.[0]?.choices?.[0]?.count).toBe(1);
    expect(bard.levels[1]!.some((f) => f.id === 'bard.instruments')).toBe(false);
    expect(classOf('monk').levels[1]!.some((f) => f.id === 'monk.tool-proficiency')).toBe(false);
  });

  it('names a slot progression for every casting', () => {
    const castings = DND.classes.flatMap((c) => [c.spellcasting, ...c.subclasses.map((s) => s.spellcasting)]).filter((s) => !!s);
    for (const casting of castings) {
      expect(['full', 'half', 'third', 'pact']).toContain(casting.progression);
      expect(!!casting.pact).toBe(casting.progression === 'pact');
    }
    expect(classOf('paladin').spellcasting?.progression).toBe('half');
    expect(classOf('fighter').subclasses.find((s) => s.id === 'eldritch-knight')?.spellcasting?.progression).toBe('third');
  });
});

describe('a hero of several classes', () => {
  const fighterWizard = hero([
    { class: 'fighter', levels: [1, 2] },
    { class: 'wizard', levels: [3] },
  ]);

  it('takes the saving throws and the full proficiencies of the starting class only', () => {
    const c = apply(fighterWizard);
    expect(c.savingThrowProficiencies.sort()).toEqual(['constitution', 'strength']);
    expect(proficiencies(c)).toContain('Тяжёлые доспехи');
    // A wizard taken later adds no saving throw, and its skill pick is not asked for.
    expect(levelPlan(fighterWizard, 3).choices.some((choice) => choice.key === 'class:wizard.skills/skills')).toBe(false);
  });

  it('gives a later class its row of the multiclass table: a rogue a skill and thieves’ tools, a bard one instrument', () => {
    const rogue = hero([{ class: 'fighter', levels: [1] }, { class: 'rogue', levels: [2] }]);
    expect(levelPlan(rogue, 2).choices.find((choice) => choice.key === 'class:rogue.skills/skills')?.count).toBe(1);
    expect(proficiencies(apply(rogue))).toContain('Воровские инструменты');
    const bard = hero([{ class: 'fighter', levels: [1] }, { class: 'bard', levels: [2] }]);
    expect(levelPlan(bard, 2).choices.find((choice) => choice.key === 'class:bard.instruments/tools')?.count).toBe(1);
    expect(levelPlan(bard, 2).choices.find((choice) => choice.key === 'class:bard.skills/skills')?.count).toBe(1);
  });

  it('gains each class’s features by its own class level', () => {
    const c = apply(fighterWizard);
    expect(has(c, 'Всплеск действий')).toBe(true); // fighter 2
    expect(has(c, 'Магическое восстановление')).toBe(true); // wizard 1
    const plan = levelPlan(fighterWizard, 3);
    expect(plan).toMatchObject({ classId: 'wizard', classLevel: 1, hitDie: 6 });
    expect(plan.choices.find((choice) => choice.key === 'casting:wizard.spells-1/spellbook')?.count).toBe(6);
  });

  it('counts numbers that grow with a class by that class’s level, the proficiency bonus by the hero’s', () => {
    const b = hero([
      { class: 'barbarian', levels: [1] },
      { class: 'fighter', levels: [2, 3, 4, 5, 6, 7, 8, 9] },
    ]);
    const c = apply(b);
    expect(c.resources.find((r) => r.id === 'barbarian.rage')?.max).toBe(2);
    expect(c.proficiencyBonus).toBe(4);
    expect(describeGrant(b, collect(b).features.find((f) => f.feature.id === 'fighter.action-surge')?.key)).toBe('Воин, 2 уровень');
  });

  it('gets the full hit die only on the first character level', () => {
    // Constitution 14 (+2): fighter d10 → 10 + 2, wizard d6 average 4 + 2.
    const c = apply(hero([{ class: 'fighter', levels: [1] }, { class: 'wizard', levels: [2] }]));
    expect(c.maxHP).toBe(12 + 6);
    const startedAsWizard = apply(hero([{ class: 'wizard', levels: [1] }, { class: 'fighter', levels: [2] }]));
    expect(startedAsWizard.maxHP).toBe(8 + 8);
  });

  it('does not stack Extra Attack from two classes', () => {
    const c = apply(hero([{ class: 'fighter', levels: [1, 2, 3, 4, 5] }, { class: 'barbarian', levels: [6, 7, 8, 9, 10] }]));
    expect(c.attacksPerAction).toBe(2);
  });

  it('writes every class with its level on the sheet, in the order taken', () => {
    const c = apply(setSubclass(hero([{ class: 'fighter', levels: [1, 2, 3] }, { class: 'wizard', levels: [4] }]), 'fighter', 'champion'));
    expect(c.class).toBe('Воин 3 / Волшебник 1');
    expect(c.subclass).toBe('Чемпион');
    expect(c.level).toBe(4);
  });
});

describe('taking and giving back levels', () => {
  it('lets a new class in only with 13 in the scores of the new class and of every class the hero has', () => {
    const scores = (patch: Record<string, number>) => ({ ...hero([]).baseAttributes, ...patch });
    const fighter = hero([{ class: 'fighter', levels: [1] }], { baseAttributes: scores({ strength: 15, intelligence: 12 }) });
    expect(multiclassBlocker(fighter, 'wizard')).toBe('Волшебник: Интеллект 13');
    expect(multiclassBlocker({ ...fighter, baseAttributes: scores({ strength: 15, intelligence: 13 }) }, 'wizard')).toBeUndefined();
    // A fighter needs Strength or Dexterity; a monk Dexterity and Wisdom.
    const weak = hero([{ class: 'fighter', levels: [1] }], { baseAttributes: scores({ strength: 10, dexterity: 13, wisdom: 12 }) });
    expect(multiclassBlocker(weak, 'monk')).toBe('Монах: Ловкость и Мудрость 13');
    expect(multiclassBlocker(hero([{ class: 'fighter', levels: [1] }], { baseAttributes: scores({ strength: 10, dexterity: 10 }) }), 'rogue')).toBe(
      'Плут: Ловкость 13; Воин: Сила или Ловкость 13',
    );
    expect(multiclassBlocker(fighter, 'fighter')).toBe('Уже есть');
  });

  it('adds a level to a class, a new class joining the end of the list', () => {
    let b = hero([{ class: 'fighter', levels: [1] }]);
    b = addLevel(addLevel(addLevel(b, 'fighter'), 'wizard'), 'fighter');
    expect(b.classes).toEqual([
      { class: 'fighter', levels: [1, 2, 4] },
      { class: 'wizard', levels: [3] },
    ]);
    expect(heroLevel(b)).toBe(4);
    expect(classAtLevel(b, 3)).toMatchObject({ classLevel: 1, entry: { def: { id: 'wizard' } } });
  });

  it('gives back the last level with its picks, its hit points and, below its level, the subclass', () => {
    let b = hero([{ class: 'fighter', levels: [1, 2] }, { class: 'wizard', levels: [3] }], {
      hitPoints: [
        { level: 2, method: 'average', value: 6 },
        { level: 3, method: 'roll', value: 5 },
      ],
    });
    b = setPicks(b, 'casting:wizard.spells-1/spellbook', ['shield', 'sleep']);
    const back = dropLastLevel(b);
    expect(back.classes).toEqual([{ class: 'fighter', levels: [1, 2] }]);
    expect(back.choices).not.toHaveProperty('casting:wizard.spells-1/spellbook');
    expect(back.hitPoints.map((e) => e.level)).toEqual([2]);

    const champion = setSubclass(hero([{ class: 'fighter', levels: [1, 2, 3] }]), 'fighter', 'champion');
    expect(dropLastLevel(champion).classes).toEqual([{ class: 'fighter', subclass: undefined, levels: [1, 2] }]);
    // The first level is never given back.
    expect(dropLastLevel(hero([{ class: 'fighter', levels: [1] }])).classes).toHaveLength(1);
  });

  it('forgets the picks of a subclass when another one is chosen, and its spells when it cast them', () => {
    let b = setSubclass(hero([{ class: 'fighter', levels: [1, 2, 3] }]), 'fighter', 'eldritch-knight');
    b = setPicks(b, 'casting:fighter.spells-3/spells', ['shield']);
    b = setSubclass(b, 'fighter', 'champion');
    expect(b.classes[0]?.subclass).toBe('champion');
    expect(b.choices).not.toHaveProperty('casting:fighter.spells-3/spells');
  });
});

describe('spellcasting of several classes', () => {
  const levels = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const slots = (classes: DndClass[]) =>
    apply(hero(classes))
      .resources.filter((r) => r.id.startsWith('slot-'))
      .map((r) => r.max);

  it('adds the casters’ levels up on the full caster table: all, half rounded up, a third rounded down', () => {
    // Wizard 3 + cleric 2 = caster level 5.
    expect(slots([{ class: 'wizard', levels: levels(1, 3) }, { class: 'cleric', levels: [4, 5] }])).toEqual([4, 3, 2]);
    // Paladin 3 (half: 2) + sorcerer 2 = 4.
    expect(slots([{ class: 'paladin', levels: levels(1, 3) }, { class: 'sorcerer', levels: [4, 5] }])).toEqual([4, 3]);
    // The book's example: ranger 4 (2) + sorcerer 3 = 5.
    expect(slots([{ class: 'ranger', levels: levels(1, 4) }, { class: 'sorcerer', levels: levels(5, 7) }])).toEqual([4, 3, 2]);
    // An Eldritch Knight 7 (a third: 2) + wizard 1 = 3.
    const knight = hero([{ class: 'fighter', subclass: 'eldritch-knight', levels: levels(1, 7) }, { class: 'wizard', levels: [8] }]);
    expect(apply(knight).resources.filter((r) => r.id.startsWith('slot-')).map((r) => r.max)).toEqual([4, 2]);
  });

  it('keeps the table of a lone casting class, whatever else the hero has', () => {
    expect(slots([{ class: 'paladin', levels: levels(1, 3) }])).toEqual([3]);
    // A fighter without a casting subclass casts nothing: the wizard's own table stands.
    expect(slots([{ class: 'fighter', levels: levels(1, 3) }, { class: 'wizard', levels: [4] }])).toEqual([2]);
  });

  it('keeps Pact Magic apart from spell slots, and adds a Profane Soul’s third to a warlock’s pact', () => {
    const c = apply(hero([{ class: 'warlock', levels: levels(1, 3) }, { class: 'wizard', levels: [4, 5] }]));
    expect(c.resources.find((r) => r.id === 'pact-slots')).toMatchObject({ max: 2, spellSlotLevel: 2 });
    expect(c.resources.filter((r) => r.id.startsWith('slot-')).map((r) => r.max)).toEqual([3]);
    // Warlock 3 + Profane Soul 6 (a third: 2) = pact level 5 of the warlock's table.
    const profane = apply(
      hero([
        { class: 'warlock', levels: levels(1, 3) },
        { class: 'blood-hunter', subclass: 'order-of-the-profane-soul', levels: levels(4, 9) },
      ]),
    );
    expect(profane.resources.find((r) => r.id === 'pact-slots')).toMatchObject({ max: 2, spellSlotLevel: 3 });
  });

  it('lists a class’s spells only up to the level that class could cast alone', () => {
    // Cleric 1 / wizard 4: slots reach the 3rd level, cleric spells stay of the 1st.
    const c = apply(hero([{ class: 'cleric', levels: [1] }, { class: 'wizard', levels: levels(2, 5) }]));
    expect(c.resources.find((r) => r.id === 'slot-3')?.max).toBe(2);
    expect(c.spells.filter((s) => s.caster === 'cleric').every((s) => s.level <= 1)).toBe(true);
    expect(c.spells.some((s) => s.caster === 'cleric' && s.level === 1)).toBe(true);
  });

  it('casts each class’s spells with its own ability, DC and prepared limit', () => {
    const b = hero([{ class: 'cleric', levels: [1, 2] }, { class: 'wizard', levels: [3] }], {
      baseAttributes: { ...hero([]).baseAttributes, wisdom: 16, intelligence: 12 },
    });
    const c = apply(b);
    expect(c.casters).toEqual([
      { id: 'cleric', name: 'Жрец', ability: 'wisdom', saveDC: 8 + 2 + 3, attackBonus: 2 + 3, prepared: 5 },
      { id: 'wizard', name: 'Волшебник', ability: 'intelligence', saveDC: 8 + 2 + 1, attackBonus: 2 + 1, prepared: 4 },
    ]);
    const bless = c.spells.find((s) => s.id === 'spell-bless')!;
    expect(bless.caster).toBe('cleric');
    expect(spellSaveDCFor(c, { caster: 'wizard' })).toBe(11);
    expect(spellAttackBonusFor(c, bless)).toBe(5);
    // Five cleric spells prepared fill the cleric's limit, not the wizard's.
    const cleric = c.spells.filter((s) => s.caster === 'cleric' && s.level === 1).slice(0, 6);
    const full = { ...c, spells: c.spells.map((s) => (cleric.slice(0, 5).includes(s) ? { ...s, prepared: true } : s)) };
    expect(preparationBlocker(full, cleric[5]!)).toBe('Подготовлено максимум заклинаний класса «Жрец»');
    expect(preparedCount(full, 1, 'wizard')).toBe(0);
  });

  it('keeps a spell of two classes’ lists as an entry of each, the first class keeping its plain id', () => {
    const c = apply(hero([{ class: 'cleric', levels: [1] }, { class: 'druid', levels: [2] }]));
    expect(c.spells.find((s) => s.id === 'spell-cure-wounds')?.caster).toBe('cleric');
    expect(c.spells.find((s) => s.id === 'spell-cure-wounds-druid')?.caster).toBe('druid');
  });

  it('casts with the slot of a chosen level from the spell’s own pool first, then from any pool that has one', () => {
    const c = apply(hero([{ class: 'warlock', levels: levels(1, 3) }, { class: 'wizard', levels: [4, 5, 6] }]));
    expect(castableSlots(c, { level: 1 })).toEqual([1, 2]);
    const hex = { resourceId: 'pact-slots' };
    expect(slotPoolFor(c, hex, 2)?.id).toBe('pact-slots');
    const spent = { ...c, resources: c.resources.map((r) => (r.id === 'pact-slots' ? { ...r, current: 0 } : r)) };
    expect(slotPoolFor(spent, hex, 2)?.id).toBe('slot-2');
  });

  it('grows cantrips with the hero’s level, not a class’s', () => {
    const b = setPicks(hero([{ class: 'fighter', levels: levels(1, 4) }, { class: 'wizard', levels: [5] }]), 'casting:wizard.spells-1/cantrips', ['fire-bolt']);
    const c = apply(b);
    expect(spellDamageAt(c, c.spells.find((s) => s.id === 'spell-fire-bolt')!)).toBe('2d10');
  });
});