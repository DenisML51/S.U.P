import { describe, expect, it } from 'vitest';
import type { Build, Character } from '@itd/schema';
import { DND, applyBuild, choiceOptions, levelPlan, startingSkills } from '../src';
import { makeCharacter } from './helpers';

const build = (patch: Partial<Build> = {}): Build => ({
  ruleset: 'dnd2024',
  species: 'human',
  background: 'guide',
  class: 'ranger',
  abilityMethod: 'pointBuy',
  // Dexterity 17 (+3), Wisdom 15 (+2), Constitution 14 (+2).
  baseAttributes: { strength: 10, dexterity: 15, constitution: 14, intelligence: 8, wisdom: 14, charisma: 8 },
  backgroundBonuses: { dexterity: 2, wisdom: 1 },
  choices: {},
  hitPoints: [],
  level: 1,
  ...patch,
});

const fresh = (): Character => makeCharacter({ skills: startingSkills(), maxHP: 10, currentHP: 10, inventory: [] });
const applied = (b: Build) => applyBuild(fresh(), b);
const apply = (b: Build) => applied(b).character;
/** Spells other agents are still writing may be missing; nothing else may. */
const unexpectedMissing = (b: Build) => applied(b).missing.filter((id) => !id.startsWith('spell:'));

const resource = (c: Character, id: string) => c.resources.find((r) => r.id === id);
const ability = (c: Character, name: string) => c.abilities.find((a) => a.name === name);

describe('ranger', () => {
  it('writes a level-1 ranger onto the sheet', () => {
    const c = apply(build());
    expect(c.class).toBe('Следопыт');
    expect(c.maxHP).toBe(12);
    expect(c.savingThrowProficiencies).toEqual(expect.arrayContaining(['strength', 'dexterity']));
    const proficiencies = c.traits.find((t) => t.id === 'g-proficiencies')?.description ?? '';
    for (const value of ['Лёгкие доспехи', 'Средние доспехи', 'Щиты', 'Простое оружие', 'Воинское оружие']) expect(proficiencies).toContain(value);
    expect(proficiencies).not.toContain('Тяжёлые доспехи');
    expect(resource(c, 'ranger.favored-enemy')).toMatchObject({ max: 2, recovery: 'long' });
    const mark = c.spells.find((s) => s.id === 'spell-hunters-mark');
    expect(mark?.alwaysPrepared && mark.prepared).toBe(true);
    expect(resource(c, 'slot-1')?.max).toBe(2);
    expect(resource(c, 'slot-2')).toBeUndefined();
    expect(c.maxPreparedSpells.total).toBe(2);
    expect(c.spellcastingDifficultyValue).toBe(8 + 2 + 2);
  });

  it('asks for skills and weapon masteries on level 1', () => {
    const plan = levelPlan(build(), 1);
    expect(plan.choices.find((c) => c.key === 'class:ranger.skills/skills')?.count).toBe(3);
    expect(plan.choices.find((c) => c.choice.pool === 'weapon-mastery')?.count).toBe(2);
    // A preparing caster has no picks of known spells.
    expect(plan.choices.some((c) => c.key.startsWith('casting:'))).toBe(false);
  });

  it('opens Deft Explorer and the Fighting Style on level 2', () => {
    const b = build({ level: 2, choices: { 'class:ranger.skills/skills': ['stealth', 'perception', 'nature'] } });
    const plan = levelPlan(b, 2);
    const expertise = plan.choices.find((c) => c.key === 'class:ranger.deft-explorer/expertise')!;
    expect(expertise.count).toBe(1);
    expect(choiceOptions(b, 2, expertise).map((o) => o.id)).toEqual(expect.arrayContaining(['stealth', 'perception', 'nature']));
    expect(plan.choices.find((c) => c.key === 'class:ranger.deft-explorer/languages')?.count).toBe(2);

    const style = plan.choices.find((c) => c.key === 'class:ranger.fighting-style/style')!;
    expect(choiceOptions(b, 2, style).map((o) => o.id)).toEqual(['feat', 'druidic-warrior']);
    const druidic = { ...b, choices: { ...b.choices, [style.key]: ['druidic-warrior'] } };
    const cantrips = levelPlan(druidic, 2).choices.find((c) => c.key.endsWith('ranger.druidic-warrior/cantrips'))!;
    expect(cantrips.count).toBe(2);
    expect(cantrips.choice.spellAbility).toBe('wisdom');
    const options = choiceOptions(druidic, 2, cantrips);
    expect(options.length).toBeGreaterThan(3);
    expect(options.every((o) => o.meta?.startsWith('Заговор'))).toBe(true);
  });

  it('grows Favored Enemy, slots and prepared spells by the table', () => {
    const at = (level: number) => apply(build({ level }));
    expect(resource(at(4), 'ranger.favored-enemy')?.max).toBe(2);
    expect(resource(at(5), 'ranger.favored-enemy')?.max).toBe(3);
    expect(resource(at(9), 'ranger.favored-enemy')?.max).toBe(4);
    expect(resource(at(13), 'ranger.favored-enemy')?.max).toBe(5);
    expect(resource(at(17), 'ranger.favored-enemy')?.max).toBe(6);
    expect(at(5).maxPreparedSpells.total).toBe(6);
    expect(at(9).maxPreparedSpells.total).toBe(9);
    expect(at(20).maxPreparedSpells.total).toBe(15);
    expect(resource(at(5), 'slot-2')?.max).toBe(2);
    expect(resource(at(17), 'slot-5')?.max).toBe(1);
    expect(resource(at(20), 'slot-5')?.max).toBe(2);
  });

  it('adds Roving speed, Tireless and Nature’s Veil with Wisdom uses', () => {
    const c10 = apply(build({ level: 10 }));
    expect(c10.speed).toBe(40);
    expect(resource(c10, 'ranger.tireless')?.max).toBe(2);
    expect(ability(c10, 'Неутомимость')).toMatchObject({ actionType: 'action', damage: '1d8+2' });
    const c14 = apply(build({ level: 14 }));
    expect(resource(c14, 'ranger.natures-veil')?.max).toBe(2);
    expect(ability(c14, 'Завеса природы')?.actionType).toBe('bonus');
    expect(levelPlan(build({ level: 9 }), 9).choices.find((c) => c.key === 'class:ranger.expertise/expertise')?.count).toBe(2);
  });

  it('gives the Beast Master a primal companion with its own strike', () => {
    const b = build({
      level: 5,
      subclass: 'beast-master',
      choices: { 'subclass:beast-master.primal-companion/beast': ['beast-of-the-land'] },
    });
    const c = apply(b);
    const strike = c.attacks.find((a) => a.id === 'g-attack-beast-master.beast-of-the-land-strike')!;
    // Spell attack bonus: proficiency 3 + Wisdom 2; damage 1d8 + 2 + Wisdom.
    expect(strike.hitBonus).toBe(5);
    expect(strike.damage).toBe('1d8+2+2');
    expect(strike.actionType).toBe('bonus');
    expect(ability(c, 'Земной зверь')?.damage).toBe('1d8+4');
    const sky = apply({ ...b, choices: { 'subclass:beast-master.primal-companion/beast': ['beast-of-the-sky'] } });
    expect(sky.attacks.find((a) => a.id === 'g-attack-beast-master.beast-of-the-sky-strike')?.damage).toBe('1d4+3+2');
    expect(sky.attacks.some((a) => a.id === 'g-attack-beast-master.beast-of-the-land-strike')).toBe(false);
  });

  it('grows the Gloom Stalker’s Dreadful Strike and adds Wisdom to initiative', () => {
    const at = (level: number) => apply(build({ level, subclass: 'gloom-stalker' }));
    expect(at(3).initiativeBonus).toBe(2);
    expect(resource(at(3), 'gloom-stalker.dreadful-strike')?.max).toBe(2);
    expect(ability(at(3), 'Ужасающий удар')?.damage).toBe('2d6');
    expect(ability(at(11), 'Ужасающий удар')?.damage).toBe('2d8');
    expect(at(7).savingThrowProficiencies).toContain('wisdom');
    expect(at(3).spells.find((s) => s.id === 'spell-disguise-self')?.alwaysPrepared).toBe(true);
  });

  it('grows the Fey Wanderer’s Dreadful Strikes and adds Wisdom to Charisma skills', () => {
    const at = (level: number) => apply(build({ level, subclass: 'fey-wanderer' }));
    expect(ability(at(3), 'Ужасающие удары')?.damage).toBe('1d4');
    expect(ability(at(11), 'Ужасающие удары')?.damage).toBe('1d6');
    expect(at(3).skills.find((s) => s.id === 'persuasion')?.bonus).toBe(2);
    expect(at(3).spells.find((s) => s.id === 'spell-charm-person')?.alwaysPrepared).toBe(true);
    expect(resource(at(15), 'fey-wanderer.misty-wanderer')?.max).toBe(2);
  });

  it('lets the Hunter pick its prey and tactics', () => {
    const b = build({ level: 7, subclass: 'hunter' });
    const plan = levelPlan(b, 3);
    const prey = plan.choices.find((c) => c.key === 'subclass:hunter.hunters-prey/prey')!;
    expect(choiceOptions(b, 3, prey).map((o) => o.id)).toEqual(['colossus-slayer', 'horde-breaker']);
    const c = apply({ ...b, choices: { [prey.key]: ['colossus-slayer'], 'subclass:hunter.defensive-tactics/tactics': ['escape-the-horde'] } });
    expect(ability(c, 'Убийца колоссов')?.damage).toBe('1d8');
    expect(ability(c, 'Побег от орды')).toBeDefined();
  });

  it('builds every subclass to level 20 without missing content', () => {
    const ranger = DND.classes.find((c) => c.id === 'ranger')!;
    expect(ranger.subclasses.filter((s) => !s.source).map((s) => s.id)).toEqual(['beast-master', 'fey-wanderer', 'gloom-stalker', 'hunter']);
    for (const subclass of ranger.subclasses) {
      const b = build({ level: 20, subclass: subclass.id });
      expect(unexpectedMissing(b)).toEqual([]);
      const c = apply(b);
      expect(c.subclass).toBe(subclass.name);
      expect(c.abilities.some((a) => a.name === 'Истребитель врагов')).toBe(true);
    }
  });
});
