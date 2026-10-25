import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { DndBuild, Character } from '@itd/schema';
import { startingSkills } from '../src';
import { DND, applyBuild, choiceOptions, collect, levelPlan } from '../src/dnd';
import { makeCharacter } from './helpers';

const build = (patch: Partial<DndBuild> = {}): DndBuild => ({
  ruleset: 'dnd2024',
  species: 'human',
  background: 'sage',
  class: 'warlock',
  abilityMethod: 'pointBuy',
  // Charisma 17 (+3), Constitution 15 (+2), Dexterity 14 (+2).
  baseAttributes: { strength: 8, dexterity: 14, constitution: 14, intelligence: 10, wisdom: 10, charisma: 15 },
  backgroundBonuses: { charisma: 2, constitution: 1 },
  choices: {},
  hitPoints: [],
  level: 1,
  ...patch,
});

const fresh = (): Character => makeCharacter({ skills: startingSkills(), maxHP: 10, currentHP: 10, inventory: [] });
const applied = (b: DndBuild) => applyBuild(fresh(), b);
const apply = (b: DndBuild) => applied(b).character;
/** Spells other agents are still writing may be missing; nothing else may. */
const unexpectedMissing = (b: DndBuild) => applied(b).missing.filter((id) => !id.startsWith('spell:'));

const INVOCATIONS = 'class:warlock.eldritch-invocations/invocations';
const resource = (c: Character, id: string) => c.resources.find((r) => r.id === id);
const ability = (c: Character, name: string) => c.abilities.find((a) => a.name === name);

describe('warlock', () => {
  it('writes a level-1 warlock onto the sheet', () => {
    const c = apply(build());
    expect(c.class).toBe('Колдун');
    expect(c.maxHP).toBe(10);
    expect(c.savingThrowProficiencies).toEqual(expect.arrayContaining(['wisdom', 'charisma']));
    const proficiencies = c.traits.find((t) => t.id === 'g-proficiencies')?.description ?? '';
    expect(proficiencies).toContain('Лёгкие доспехи');
    expect(proficiencies).toContain('Простое оружие');
    expect(proficiencies).not.toContain('Воинское оружие');
    expect(resource(c, 'pact-slots')).toMatchObject({ max: 1, spellSlotLevel: 1, recovery: 'short' });
    expect(resource(c, 'slot-1')).toBeUndefined();
    expect(c.spellcastingDifficultyValue).toBe(8 + 2 + 3);
  });

  it('asks for two cantrips, two spells and one invocation on level 1', () => {
    const plan = levelPlan(build(), 1);
    expect(plan.choices.find((c) => c.key.startsWith('casting:') && c.choice.id === 'cantrips')?.count).toBe(2);
    expect(plan.choices.find((c) => c.key.startsWith('casting:') && c.choice.id === 'spells')?.count).toBe(2);
    expect(plan.choices.find((c) => c.key === INVOCATIONS)?.count).toBe(1);
    expect(levelPlan(build(), 4).choices.find((c) => c.key.startsWith('casting:') && c.choice.id === 'cantrips')?.count).toBe(1);
    expect(levelPlan(build(), 10).choices.find((c) => c.key.startsWith('casting:') && c.choice.id === 'cantrips')?.count).toBe(1);
    // Prepared Spells column: 10 at level 9, 10 at level 10 — no new spell on 10.
    expect(levelPlan(build(), 10).choices.some((c) => c.key.startsWith('casting:') && c.choice.id === 'spells')).toBe(false);
    expect(levelPlan(build(), 6).choices.find((c) => c.key.startsWith('casting:') && c.choice.id === 'spells')?.count).toBe(1);
  });

  it('casts with pact slots that grow by the table', () => {
    const at = (level: number) => resource(apply(build({ level })), 'pact-slots');
    expect(at(2)).toMatchObject({ max: 2, spellSlotLevel: 1 });
    expect(at(5)).toMatchObject({ max: 2, spellSlotLevel: 3 });
    expect(at(9)).toMatchObject({ max: 2, spellSlotLevel: 5 });
    expect(at(11)).toMatchObject({ max: 3, spellSlotLevel: 5 });
    expect(at(17)).toMatchObject({ max: 4, spellSlotLevel: 5 });
  });

  it('follows the invocations column of the table', () => {
    const total = (level: number) =>
      collect(build({ level })).choices.filter((c) => c.choice.pool === 'invocations').reduce((sum, c) => sum + c.count, 0);
    expect([1, 2, 4, 5, 7, 9, 12, 15, 18, 20].map(total)).toEqual([1, 3, 3, 5, 6, 7, 8, 9, 10, 10]);
  });

  it('disables invocations whose level or pact prerequisite is not met', () => {
    const b = build();
    const open = levelPlan(b, 1).choices.find((c) => c.key === INVOCATIONS)!;
    const options = choiceOptions(b, 1, open);
    expect(options.length).toBe(DND.catalogs.invocations.length);
    expect(options.find((o) => o.id === 'agonizing-blast')?.disabled).toBe('С 2-го уровня');
    expect(options.find((o) => o.id === 'witch-sight')?.disabled).toBe('С 15-го уровня');
    expect(options.find((o) => o.id === 'armor-of-shadows')?.disabled).toBeUndefined();
    expect(options.find((o) => o.id === 'pact-of-the-blade')?.disabled).toBeUndefined();

    const at5 = build({ level: 5 });
    const fifth = levelPlan(at5, 5).choices.find((c) => c.key === 'class:warlock.invocations-5/invocations')!;
    expect(choiceOptions(at5, 5, fifth).find((o) => o.id === 'thirsting-blade')?.disabled).toMatch(/Договор клинка/);
    const blade = build({ level: 5, choices: { [INVOCATIONS]: ['pact-of-the-blade'] } });
    expect(choiceOptions(blade, 5, fifth).find((o) => o.id === 'thirsting-blade')?.disabled).toBeUndefined();
    expect(choiceOptions(blade, 5, fifth).find((o) => o.id === 'pact-of-the-blade')?.disabled).toBe('Уже есть');
  });

  it('writes invocations onto the sheet', () => {
    const c = apply(
      build({
        level: 5,
        choices: {
          [INVOCATIONS]: ['pact-of-the-blade'],
          'class:warlock.invocations-2/invocations': ['armor-of-shadows', 'agonizing-blast'],
          'class:warlock.invocations-5/invocations': ['eldritch-smite', 'thirsting-blade'],
        },
      }),
    );
    const mageArmor = c.spells.find((s) => s.id === 'spell-mage-armor');
    if (mageArmor) expect(mageArmor.alwaysPrepared).toBe(true);
    expect(ability(c, 'Договор клинка')?.actionType).toBe('bonus');
    // A 5th-level warlock has 3rd-level pact slots: 1d8 + 3d8.
    expect(ability(c, 'Мистическая кара')).toMatchObject({ resourceId: 'pact-slots', damage: '4d8', damageType: 'Силовой' });
    expect(ability(c, 'Жаждущий клинок')).toBeDefined();
  });

  it('offers the Book of Shadows picks of Pact of the Tome and the cantrip of Agonizing Blast', () => {
    const b = build({ level: 2, choices: { [INVOCATIONS]: ['pact-of-the-tome'], 'class:warlock.invocations-2/invocations': ['agonizing-blast'] } });
    const plan = levelPlan(b, 2);
    const cantrips = levelPlan(b, 1).choices.find((c) => c.key === `${INVOCATIONS}:pact-of-the-tome/cantrips`)!;
    expect(cantrips.count).toBe(3);
    expect(cantrips.choice.spellAbility).toBe('charisma');
    const rituals = levelPlan(b, 1).choices.find((c) => c.key === `${INVOCATIONS}:pact-of-the-tome/rituals`)!;
    expect(rituals.count).toBe(2);
    expect(choiceOptions(b, 1, rituals).every((o) => o.meta?.startsWith('1 круг'))).toBe(true);
    const blast = plan.choices.find((c) => c.key.endsWith(':agonizing-blast/cantrip'))!;
    expect(choiceOptions(b, 2, blast).map((o) => o.id)).toContain('eldritch-blast');
  });

  it('offers to replace an invocation on later levels', () => {
    const b = build({ level: 2, choices: { [INVOCATIONS]: ['armor-of-shadows'] } });
    const swap = levelPlan(b, 2).choices.find((c) => c.key === 'swap:invocations@2/forget')!;
    expect(swap).toBeDefined();
    expect(choiceOptions(b, 2, swap).map((o) => o.id)).toEqual(['armor-of-shadows']);
  });

  it('gives Magical Cunning, Contact Patron and a Mystic Arcanum of exactly its level', () => {
    const c = apply(build({ level: 17 }));
    expect(resource(c, 'warlock.magical-cunning')).toMatchObject({ max: 1, recovery: 'long' });
    expect(resource(c, 'warlock.contact-patron')?.max).toBe(1);
    for (const level of [6, 7, 8, 9]) expect(resource(c, `warlock.arcanum-${level}`)).toMatchObject({ max: 1, recovery: 'long' });

    const b = build({ level: 11 });
    const arcanum = levelPlan(b, 11).choices.find((c) => c.key === 'class:warlock.mystic-arcanum-6/spell')!;
    expect(arcanum.choice.spellResource).toBe('warlock.arcanum-6');
    const options = choiceOptions(b, 11, arcanum);
    expect(options.every((o) => o.meta?.startsWith('6 круг'))).toBe(true);
    if (options[0]) {
      const spell = apply({ ...b, choices: { [arcanum.key]: [options[0].id] } }).spells.find((s) => s.id === `spell-${options[0]!.id}`);
      expect(spell).toMatchObject({ resourceId: 'warlock.arcanum-6', alwaysPrepared: true });
    }
  });

  it('gives each patron its spells and numbers', () => {
    const celestial = apply(build({ level: 6, subclass: 'celestial-patron' }));
    expect(resource(celestial, 'celestial.healing-light')?.max).toBe(7);
    expect(ability(celestial, 'Лечащий свет')?.damage).toBe('3d6');
    expect(celestial.resistances.some((r) => r.type === 'Лучистый')).toBe(true);
    const fiend = apply(build({ level: 14, subclass: 'fiend-patron' }));
    expect(ability(fiend, 'Бросок через преисподнюю')).toMatchObject({ damage: '8d10', saveDC: 8 + 5 + 3, saveAttribute: 'charisma' });
    const archfey = apply(build({ level: 3, subclass: 'archfey-patron' }));
    expect(resource(archfey, 'archfey.steps-of-the-fey')?.max).toBe(3);
    expect(archfey.spells.find((s) => s.id === 'spell-misty-step')?.alwaysPrepared).toBe(true);
    const goo = apply(build({ level: 10, subclass: 'great-old-one-patron' }));
    expect(goo.spells.find((s) => s.id === 'spell-hex')?.alwaysPrepared).toBe(true);
    expect(goo.resistances.some((r) => r.type === 'Психический')).toBe(true);
  });

  it('builds every patron to level 20 without missing content', () => {
    const warlock = DND.classes.find((c) => c.id === 'warlock')!;
    expect(warlock.subclasses.filter((s) => !s.source).map((s) => s.id)).toEqual(['archfey-patron', 'celestial-patron', 'fiend-patron', 'great-old-one-patron']);
    for (const subclass of warlock.subclasses) {
      const b = build({ level: 20, subclass: subclass.id });
      expect(unexpectedMissing(b)).toEqual([]);
      expect(apply(b).subclass).toBe(subclass.name);
    }
  });

  it('has 28 invocations with valid references and catalogue icons', () => {
    const entries = DND.catalogs.invocations;
    expect(entries.length).toBe(28);
    expect(new Set(entries.map((e) => e.id)).size).toBe(entries.length);
    const ids = new Set(entries.map((e) => e.id));
    for (const entry of entries) if (entry.prerequisite?.entry) expect(ids.has(entry.prerequisite.entry)).toBe(true);
    const catalogue = readFileSync(fileURLToPath(new URL('../../../apps/web/src/ui/gameIconCatalog.ts', import.meta.url)), 'utf8');
    const known = new Set([...catalogue.matchAll(/^\s+'?([a-z0-9-]+)'?: Gi/gm)].map((m) => m[1]));
    expect(entries.filter((e) => !e.iconName || !known.has(e.iconName)).map((e) => e.id)).toEqual([]);
    const spells = new Set(DND.spells.map((s) => s.id));
    const missing = entries.flatMap((e) => (Array.isArray(e.effects) ? e.effects : [])).filter((e) => e.type === 'spell' && !spells.has(e.spell));
    expect(missing).toEqual([]);
  });
});
