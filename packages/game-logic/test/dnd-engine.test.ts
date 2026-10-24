import { describe, expect, it } from 'vitest';
import type { Build, Character } from '@itd/schema';
import {
  applyBuild,
  armorClassOf,
  choiceOptions,
  collect,
  initiativeModifier,
  levelPlan,
  performAction,
  setPicks,
  skillModifier,
  startingSkills,
  unfinishedChoices,
  weaponProficient,
  DND,
} from '../src';
import { makeCharacter } from './helpers';

/** Engine mechanics shared by the classes: replacing picks, catalogs, attacks, armour without armour. */

const build = (patch: Partial<Build> = {}): Build => ({
  ruleset: 'dnd2024',
  species: 'human',
  background: 'soldier',
  class: 'fighter',
  abilityMethod: 'pointBuy',
  baseAttributes: { strength: 15, dexterity: 14, constitution: 14, intelligence: 12, wisdom: 10, charisma: 8 },
  backgroundBonuses: { strength: 2, constitution: 1 },
  choices: {},
  hitPoints: [],
  level: 1,
  ...patch,
});

const fresh = (): Character => makeCharacter({ skills: startingSkills(), maxHP: 10, currentHP: 10 });
const apply = (b: Build, character = fresh()) => applyBuild(character, b).character;

describe('replacing picks on a level-up', () => {
  const master = (level: number, choices: Build['choices'] = {}) =>
    build({ subclass: 'battle-master', level, choices: { 'subclass:battle-master.combat-superiority/maneuvers': ['maneuver.ambush', 'maneuver.bait-and-switch', 'maneuver.riposte'], ...choices } });

  it('offers to give up one maneuver from level 4 on, without requiring it', () => {
    expect(levelPlan(master(3), 3).choices.some((c) => c.key.startsWith('swap:'))).toBe(false);
    const plan = levelPlan(master(4), 4);
    const forget = plan.choices.find((c) => c.key === 'swap:maneuvers@4/forget');
    expect(forget?.choice.optional).toBe(true);
    expect(unfinishedChoices(master(4), plan).some((c) => c.key === forget?.key)).toBe(false);
    expect(choiceOptions(master(4), 4, forget!).map((o) => o.id).sort()).toEqual(['maneuver.ambush', 'maneuver.bait-and-switch', 'maneuver.riposte']);
    // Nothing given up: no replacement asked for.
    expect(plan.choices.some((c) => c.key === 'swap:maneuvers@4/learn')).toBe(false);
  });

  it('drops the given-up maneuver and asks for its replacement', () => {
    let b = setPicks(master(4), 'swap:maneuvers@4/forget', ['maneuver.riposte']);
    const learn = levelPlan(b, 4).choices.find((c) => c.key === 'swap:maneuvers@4/learn')!;
    expect(learn.count).toBe(1);
    const options = choiceOptions(b, 4, learn);
    expect(options.find((o) => o.id === 'maneuver.ambush')?.disabled).toBeTruthy();
    expect(unfinishedChoices(b, levelPlan(b, 4)).some((c) => c.key === learn.key)).toBe(true);

    b = setPicks(b, learn.key, ['maneuver.parry']);
    const ids = collect(b).features.map((f) => f.feature.id);
    expect(ids).toContain('maneuver.parry');
    expect(ids).not.toContain('maneuver.riposte');
    expect(apply(b).abilities.some((a) => a.name === DND.maneuvers.find((m) => m.id === 'maneuver.riposte')!.name)).toBe(false);
  });

  it('lets an Eldritch Knight replace a known spell', () => {
    const b = build({
      subclass: 'eldritch-knight',
      level: 4,
      baseAttributes: { strength: 15, dexterity: 12, constitution: 14, intelligence: 14, wisdom: 10, charisma: 8 },
      choices: { 'casting:spells-3/spells': ['shield', 'magic-missile', 'sleep'], 'casting:spells-3/cantrips': ['fire-bolt', 'light'] },
    });
    const plan = levelPlan(b, 4);
    expect(plan.choices.some((c) => c.key === 'swap:known-spells@4/forget')).toBe(true);
    expect(plan.choices.some((c) => c.key === 'swap:known-cantrips@4/forget')).toBe(true);
    const swapped = setPicks(setPicks(b, 'swap:known-spells@4/forget', ['sleep']), 'swap:known-spells@4/learn', ['thunderwave']);
    const spells = apply(swapped).spells.map((s) => s.id);
    expect(spells).toContain('spell-thunderwave');
    expect(spells).not.toContain('spell-sleep');
  });
});

describe('weapon attacks of a preset hero', () => {
  it('adds the proficiency bonus only for weapons the hero is proficient with', () => {
    const longsword = DND.weapons.find((w) => w.id === 'longsword')!;
    const rapier = DND.weapons.find((w) => w.id === 'rapier')!;
    const simple = [{ type: 'proficiency' as const, category: 'weapon' as const, value: 'Простое оружие' }];
    expect(weaponProficient(longsword, simple)).toBe(false);
    expect(weaponProficient(rapier, [...simple, { type: 'proficiency', category: 'weapon', value: 'Воинское оружие (фехтовальное или лёгкое)' }])).toBe(true);
    expect(weaponProficient(longsword, [{ type: 'proficiency', category: 'weapon', value: 'Воинское оружие' }])).toBe(true);
  });
});

describe('sheet rules the presets rely on', () => {
  it('derives Unarmored Defense and loses it to a shield when the feature says so', () => {
    const base = makeCharacter({ attributes: { dexterity: 14, wisdom: 16, constitution: 10 } });
    const monk = { ...base, armorClassBonus: { always: 0, armored: 0, unarmored: 'wisdom', unarmoredNoShield: true } };
    expect(armorClassOf(monk)).toBe(10 + 2 + 3);
    const shield = { id: 's', name: 'Щит', type: 'armor' as const, equipped: true, weight: 6, cost: 10, description: '' };
    expect(armorClassOf({ ...monk, inventory: [shield] })).toBe(10 + 2 + 2);
  });

  it('adds half proficiency to unproficient checks and initiative, and flat skill bonuses', () => {
    const character = makeCharacter({ skills: startingSkills(), proficiencyBonus: 3, halfProficiency: true, attributes: { dexterity: 12 } });
    expect(skillModifier(character, 'stealth')).toBe(1 + 1);
    expect(initiativeModifier(character)).toBe(1 + 1);
    const bonus = { ...character, skills: character.skills.map((s) => (s.id === 'arcana' ? { ...s, bonus: 2 } : s)) };
    expect(skillModifier(bonus, 'arcana')).toBe(0 + 1 + 2);
  });

  it('uses a passive ability that spends uses without spending an action', () => {
    const character = makeCharacter({
      abilities: [{ id: 'sw', name: 'Священное оружие', description: '', actionType: 'passive', resourceId: 'cd', resourceCost: 1, effect: '' }],
      resources: [{ id: 'cd', name: 'Проведение', iconName: '', current: 2, max: 2, description: '', recovery: 'short' }],
    });
    const result = performAction(character, { kind: 'ability', id: 'sw', trackActionEconomy: true });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.character.resources[0]!.current).toBe(1);
      expect(result.costs.slot).toBeUndefined();
    }
  });
});

describe('monk weapons', () => {
  it('hit with Dexterity and the Martial Arts die when it is bigger than the weapon’s', () => {
    const spear = { id: 'w1', ref: 'spear', name: 'Копьё', type: 'weapon' as const, equipped: true, weight: 3, cost: 1, description: '', damage: '1d6', weaponClass: 'melee' as const };
    const attack = { id: 'a1', name: 'Копьё', damage: '1d6', damageType: 'Колющий', hitBonus: 0, actionType: 'action' as const, weaponId: 'w1' };
    const monk = (level: number) =>
      apply(
        build({ class: 'monk', level, baseAttributes: { strength: 10, dexterity: 15, constitution: 14, intelligence: 10, wisdom: 15, charisma: 8 }, backgroundBonuses: { dexterity: 2, wisdom: 1 } }),
        makeCharacter({ skills: startingSkills(), inventory: [spear], attacks: [attack] }),
      ).attacks.find((a) => a.id === 'a1')!;
    expect(monk(1)).toMatchObject({ damage: '1d6+3', hitBonus: 2 + 3, attribute: 'dexterity' });
    expect(monk(5).damage).toBe('1d8+3');
  });
});

describe('wizard spellbook', () => {
  it('offers Spell Mastery only from the spellbook, where book spells are not "known"', () => {
    const b = build({
      class: 'wizard',
      level: 18,
      baseAttributes: { strength: 8, dexterity: 14, constitution: 14, intelligence: 15, wisdom: 12, charisma: 10 },
      backgroundBonuses: { intelligence: 2, constitution: 1 },
      choices: { 'casting:spells-1/spellbook': ['shield', 'magic-missile', 'sleep', 'detect-magic', 'mage-armor', 'thunderwave'] },
    });
    const open = collect(b).choices.find((c) => c.key.endsWith('wizard.spell-mastery/first'))!;
    const options = choiceOptions(b, 18, open);
    expect(options.map((o) => o.id).sort()).toEqual(['detect-magic', 'mage-armor', 'magic-missile', 'shield', 'sleep', 'thunderwave']);
    expect(options.every((o) => !o.disabled)).toBe(true);
  });
});
