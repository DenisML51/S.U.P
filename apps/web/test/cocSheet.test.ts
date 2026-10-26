import { describe, expect, it } from 'vitest';
import {
  applyDevelopment,
  createInvestigator,
  rollDevelopment,
  type SkillCheck,
} from '@itd/game-logic/coc';
import { createCharacterDocument, type Character } from '@itd/schema';
import { effectiveMadnessEffects } from '../src/data/settings';
import {
  boughtLevel,
  canBuyWithLuck,
  canPush,
  canRollDamage,
  followUpsOf,
  type RollRecord,
} from '../src/screens/coc/context';
import {
  NO_MODS,
  addCondition,
  describeMods,
  diceOnly,
  isPlainMods,
  isSanitySpec,
  modsAfterRoll,
  modsToRoll,
  parseCashInput,
  parseNumberInput,
  setArmor,
} from '../src/screens/coc/sheetRules';

const investigator = (): Character =>
  createCharacterDocument(
    createInvestigator({
      name: 'Тест',
      build: { ruleset: 'coc7', variant: 'classic', era: '1920s', occupation: 'professor', talents: [], age: 30 },
      characteristics: { str: 50, con: 50, siz: 50, dex: 50, app: 50, int: 70, pow: 60, edu: 70 },
      luck: 50,
      skills: { history: 40, 'spot-hidden': 89 },
      occupationSkills: [],
      weapons: [],
    }),
  );

/** A d100 that comes out as `values` in order (0..1 each). */
const sequence = (values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length]!;
};

const record = ({ check, ...patch }: Omit<Partial<RollRecord>, 'check'> & { check: Partial<SkillCheck> }): RollRecord =>
  ({
    label: 'Навык',
    value: 50,
    kind: 'skill',
    serial: 1,
    ...patch,
    check: { total: 70, units: 0, tens: [7], level: 'failure', success: false, ...check },
  }) as RollRecord;

describe('roll modifiers', () => {
  it('turns dice into bonus and penalty and keeps the difficulty apart for opposed rolls', () => {
    expect(modsToRoll({ difficulty: 'hard', dice: -2 })).toEqual({ difficulty: 'hard', bonus: 0, penalty: 2 });
    expect(diceOnly({ difficulty: 'extreme', dice: 1 })).toEqual({ bonus: 1, penalty: 0 });
  });

  it('go back to plain after a roll unless pinned', () => {
    expect(modsAfterRoll({ difficulty: 'hard', dice: 1 })).toEqual(NO_MODS);
    const pinned = { difficulty: 'hard' as const, dice: 1, pinned: true };
    expect(modsAfterRoll(pinned)).toBe(pinned);
  });

  it('say what is set beyond plain', () => {
    expect(isPlainMods(NO_MODS)).toBe(true);
    expect(describeMods(NO_MODS)).toBe('');
    expect(describeMods({ difficulty: 'hard', dice: 1 })).toBe('трудная · 1 бонусная');
    expect(describeMods({ difficulty: 'regular', dice: -2 })).toBe('2 штрафные');
  });
});

describe('typed numbers', () => {
  it('treat an empty or unreadable entry as no change', () => {
    expect(parseNumberInput('')).toBeNull();
    expect(parseNumberInput('   ')).toBeNull();
    expect(parseNumberInput('abc')).toBeNull();
  });

  it('round and clamp the rest', () => {
    expect(parseNumberInput('120', 0, 99)).toBe(99);
    expect(parseNumberInput('−5', 0, 99)).toBe(0);
    expect(parseNumberInput('42,6', 0, 99)).toBe(43);
  });

  it('read money to the cent and refuse negatives', () => {
    expect(parseCashInput('')).toBeNull();
    expect(parseCashInput('$1 250,505')).toBe(1250.51);
    expect(parseCashInput('-3')).toBeNull();
  });
});

describe('sanity costs', () => {
  it('accept what the rulebook writes', () => {
    for (const spec of ['0/1d6', '1/1d4+1', '1d3/1d10', '0/1', '1d6', ' 1 / 1d8 ', '2/1к10']) expect(isSanitySpec(spec)).toBe(true);
  });

  it('refuse garbage', () => {
    for (const spec of ['', 'abc', '0/', '1/2/3', '1d', 'd/1d6x']) expect(isSanitySpec(spec)).toBe(false);
  });
});

describe('what a sanity loss leaves to do', () => {
  const outcome = { needsIntRoll: false, boutTriggered: false, indefinite: false, permanent: false };

  it('asks for the INT roll on a loss of five or more', () => {
    expect(followUpsOf('Тело', { ...outcome, needsIntRoll: true }, false)).toEqual({ int: { source: 'Тело' } });
  });

  it('brings a bout at once to someone already insane, without the INT roll', () => {
    const next = followUpsOf('Тело', { ...outcome, needsIntRoll: true, boutTriggered: true }, false);
    expect(next.int).toBeUndefined();
    expect(next.bout?.reason).toContain('безумии');
  });

  it('brings a bout with newly indefinite insanity, not with one already there', () => {
    expect(followUpsOf('Тело', { ...outcome, indefinite: true }, false).bout).toBeDefined();
    expect(followUpsOf('Тело', { ...outcome, indefinite: true }, true).bout).toBeUndefined();
  });

  it('leaves nothing to roll once sanity is gone', () => {
    expect(followUpsOf('Тело', { ...outcome, needsIntRoll: true, permanent: true }, false)).toEqual({ int: null });
  });
});

describe('the roll toast', () => {
  it('buys with Luck the level the difficulty asked for', () => {
    expect(boughtLevel({ difficulty: 'hard' })).toBe('hard');
    expect(boughtLevel({})).toBe('regular');
  });

  it('never pushes nor buys the rules’ own rolls', () => {
    const rule = record({ kind: 'rule', check: {} });
    expect(canPush(rule)).toBe(false);
    expect(canBuyWithLuck(rule, 99)).toBe(false);
    expect(canBuyWithLuck(record({ check: {} }), 99)).toBe(true);
  });

  it('offers damage only when the screen did not roll it itself', () => {
    const hit = record({ kind: 'attack', check: { success: true, level: 'regular' } });
    expect(canRollDamage(hit)).toBe(true);
    expect(canRollDamage({ ...hit, damageRolled: true })).toBe(false);
    expect(canRollDamage({ ...hit, damage: { total: 3, formula: '1d6' } })).toBe(false);
    expect(canRollDamage(null)).toBe(false);
  });

  it('never pushes a roll of the fight; a fight back deals damage only once it won', () => {
    const dodge = record({ kind: 'skill', combat: 'dodge', check: {} });
    expect(canPush(dodge)).toBe(false);
    expect(canPush(record({ kind: 'skill', check: {} }))).toBe(true);
    expect(canBuyWithLuck(dodge, 99)).toBe(true);
    const fightBack = record({ kind: 'attack', combat: 'fightBack', check: { success: true, level: 'regular' } });
    expect(canRollDamage(fightBack)).toBe(false);
    expect(canRollDamage(fightBack, { tone: 'danger' })).toBe(false);
    expect(canRollDamage(fightBack, { tone: 'success' })).toBe(true);
  });
});

describe('edits run twice by the store give the same sheet', () => {
  it('development rolled once and applied twice', () => {
    const doc = investigator();
    const ticked: Character = {
      ...doc,
      coc: { ...doc.coc!, skills: doc.coc!.skills.map((s) => (s.id === 'spot-hidden' ? { ...s, check: true } : s)) },
    };
    // d100 = 100 (over 89), d10 = 5, then 2d6 for reaching 90.
    const rolls = rollDevelopment(ticked, sequence([0.995, 0.45, 0.5, 0.5]));
    const edit = applyDevelopment(rolls);
    expect(edit(ticked)).toEqual(edit(ticked));
    expect(edit(ticked).coc!.skills.find((s) => s.id === 'spot-hidden')!.value).toBe(94);
  });

  it('conditions and armour', () => {
    const doc = investigator();
    expect(addCondition('dying')(addCondition('dying')(doc)).conditions.filter((c) => c === 'dying')).toHaveLength(1);
    expect(setArmor(25)(doc).coc!.armor).toBe(20);
    expect(setArmor(-1)(doc).coc!.armor).toBe(0);
  });
});

describe('madness effects', () => {
  it('turn calm for reduced motion, but stay off when off', () => {
    expect(effectiveMadnessEffects('full', true)).toBe('calm');
    expect(effectiveMadnessEffects('full', false)).toBe('full');
    expect(effectiveMadnessEffects('off', true)).toBe('off');
  });
});

