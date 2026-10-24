import { describe, expect, it } from 'vitest';
import type { Build, Character } from '@itd/schema';
import { DND, applyBuild, choiceOptions, levelPlan, setPicks, startingSkills } from '../src';
import { makeCharacter } from './helpers';

const build = (patch: Partial<Build> = {}): Build => ({
  ruleset: 'dnd2024',
  species: 'human',
  background: 'sage',
  class: 'wizard',
  abilityMethod: 'pointBuy',
  // Intelligence 17 (+3), Dexterity 15 (+2), Constitution 14 (+2).
  baseAttributes: { strength: 8, dexterity: 14, constitution: 14, intelligence: 15, wisdom: 10, charisma: 10 },
  backgroundBonuses: { intelligence: 2, dexterity: 1 },
  choices: {},
  hitPoints: [],
  level: 1,
  ...patch,
});

const fresh = (): Character => makeCharacter({ skills: startingSkills(), maxHP: 10, currentHP: 10, inventory: [] });
const applied = (b: Build) => applyBuild(fresh(), b);
const apply = (b: Build) => applied(b).character;
const unexpectedMissing = (b: Build) => applied(b).missing.filter((id) => !id.startsWith('spell:'));
const resource = (c: Character, id: string) => c.resources.find((r) => r.id === id);
const school = (id: string) => DND.spells.find((s) => s.id === id)?.school;

describe('wizard', () => {
  it('writes a level-1 wizard onto the sheet', () => {
    const c = apply(build());
    expect(c.class).toBe('Волшебник');
    expect(c.maxHP).toBe(8);
    expect(c.savingThrowProficiencies).toEqual(expect.arrayContaining(['intelligence', 'wisdom']));
    expect(c.traits.find((t) => t.id === 'g-proficiencies')?.description).toContain('Простое оружие');
    expect(resource(c, 'wizard.arcane-recovery')).toMatchObject({ max: 1, recovery: 'long' });
    expect(resource(c, 'slot-1')?.max).toBe(2);
    expect(c.maxPreparedSpells.total).toBe(4);
    expect(c.spellcastingDifficultyValue).toBe(8 + 2 + 3);
    expect(DND.classes.find((k) => k.id === 'wizard')?.startingEquipment[0]?.items.some((i) => i.ref === 'spellbook')).toBe(true);
  });

  it('writes six spells into the book on level 1 and two a level after, with three cantrips', () => {
    let b = build();
    const plan = levelPlan(b, 1);
    const book = plan.choices.find((c) => c.key.startsWith('casting:') && c.choice.id === 'spellbook')!;
    expect(book.count).toBe(6);
    expect(plan.choices.find((c) => c.key.startsWith('casting:') && c.choice.id === 'cantrips')?.count).toBe(3);
    b = setPicks(b, book.key, ['magic-missile', 'shield']);
    const c = apply(b);
    expect(c.spells.find((s) => s.id === 'spell-magic-missile')?.alwaysPrepared).toBeFalsy();
    expect(levelPlan(b, 2).choices.find((c) => c.key.startsWith('casting:') && c.choice.id === 'spellbook')?.count).toBe(2);
    expect(levelPlan(b, 4).choices.find((c) => c.key.startsWith('casting:') && c.choice.id === 'cantrips')?.count).toBe(1);
    expect(levelPlan(b, 10).choices.find((c) => c.key.startsWith('casting:') && c.choice.id === 'cantrips')?.count).toBe(1);
  });

  it('prepares spells by the class table', () => {
    const prepared = (level: number) => apply(build({ level })).maxPreparedSpells.total;
    expect([1, 5, 12, 13, 15, 16, 20].map(prepared)).toEqual([4, 9, 16, 17, 19, 21, 25]);
    const slots = apply(build({ level: 20 })).resources.filter((r) => r.id.startsWith('slot-')).map((r) => r.max);
    expect(slots).toEqual([4, 3, 3, 3, 3, 2, 2, 1, 1]);
  });

  it('offers Scholar expertise only among its skills', () => {
    let b = build({ level: 2 });
    const skills = levelPlan(b, 1).choices.find((c) => c.key === 'class:wizard.skills/skills')!;
    b = setPicks(b, skills.key, ['arcana', 'insight']);
    const expertise = levelPlan(b, 2).choices.find((c) => c.key === 'class:wizard.scholar/expertise')!;
    const ids = choiceOptions(b, 2, expertise).map((o) => o.id);
    expect(ids).toContain('arcana');
    expect(ids).toContain('history'); // the Sage background gives History
    expect(ids).not.toContain('insight');
  });

  it('adds Savant spells of the school to the book on level 3 and on every new spell level', () => {
    let b = build({ level: 3, subclass: 'evoker' });
    const savant = levelPlan(b, 3).choices.find((c) => c.key === 'subclass:evoker.savant/spells')!;
    expect(savant.count).toBe(2);
    const options = choiceOptions(b, 3, savant);
    expect(options.length).toBeGreaterThan(0);
    expect(options.every((o) => school(o.id) === 'Воплощение')).toBe(true);
    expect(options.every((o) => o.meta?.startsWith('1 круг') || o.meta?.startsWith('2 круг'))).toBe(true);
    b = setPicks(b, savant.key, ['magic-missile']);
    expect(apply(b).spells.find((s) => s.id === 'spell-magic-missile')?.alwaysPrepared).toBeFalsy();
    const fifth = levelPlan(b, 5).choices.find((c) => c.key === 'subclass:evoker.savant-5/spells')!;
    expect(fifth.count).toBe(1);
    expect(choiceOptions({ ...b, level: 5 }, 5, fifth).some((o) => o.id === 'fireball')).toBe(true);
    expect(levelPlan(b, 6).choices.some((c) => c.key.startsWith('subclass:evoker.savant'))).toBe(false);
    expect(levelPlan(b, 17).choices.find((c) => c.key === 'subclass:evoker.savant-17/spells')).toBeDefined();
  });

  it('computes the school resources', () => {
    expect(resource(apply(build({ level: 3, subclass: 'abjurer' })), 'abjurer.arcane-ward')?.max).toBe(2 * 3 + 3);
    expect(resource(apply(build({ level: 10, subclass: 'abjurer' })), 'abjurer.arcane-ward')?.max).toBe(2 * 10 + 3);
    expect(apply(build({ level: 10, subclass: 'abjurer' })).spells.find((s) => s.id === 'spell-counterspell')?.alwaysPrepared).toBe(true);
    expect(resource(apply(build({ level: 3, subclass: 'diviner' })), 'diviner.portent')?.max).toBe(2);
    expect(resource(apply(build({ level: 14, subclass: 'diviner' })), 'diviner.portent')?.max).toBe(3);
    expect(resource(apply(build({ level: 10, subclass: 'diviner' })), 'diviner.third-eye')?.recovery).toBe('short');
    const illusionist = apply(build({ level: 10, subclass: 'illusionist' }));
    expect(illusionist.spells.find((s) => s.id === 'spell-minor-illusion')?.alwaysPrepared).toBe(true);
    expect(resource(illusionist, 'illusionist.illusory-self')?.recovery).toBe('short');
    expect(resource(illusionist, 'illusionist.phantasmal-creatures')?.max).toBe(2);
    expect(resource(apply(build({ level: 14, subclass: 'evoker' })), 'evoker.overchannel')?.max).toBe(1);
  });

  it('picks Spell Mastery and Signature Spells as always prepared', () => {
    let b = build({ level: 20 });
    const first = levelPlan(b, 18).choices.find((c) => c.key === 'class:wizard.spell-mastery/first')!;
    const second = levelPlan(b, 18).choices.find((c) => c.key === 'class:wizard.spell-mastery/second')!;
    expect(choiceOptions(b, 18, first).every((o) => o.meta?.startsWith('1 круг'))).toBe(true);
    expect(choiceOptions(b, 18, second).every((o) => o.meta?.startsWith('2 круг'))).toBe(true);
    const signature = levelPlan(b, 20).choices.find((c) => c.key === 'class:wizard.signature-spells/spells')!;
    expect(signature.count).toBe(2);
    b = setPicks(b, signature.key, ['fireball', 'counterspell']);
    const c = apply(b);
    expect(c.spells.find((s) => s.id === 'spell-fireball')?.alwaysPrepared).toBe(true);
    expect(resource(c, 'wizard.signature-spells')).toMatchObject({ max: 2, recovery: 'short' });
  });

  it('applies every school at level 20 with nothing missing but pending spells', () => {
    for (const subclass of ['abjurer', 'diviner', 'evoker', 'illusionist']) {
      expect(unexpectedMissing(build({ level: 20, subclass }))).toEqual([]);
    }
  });
});
