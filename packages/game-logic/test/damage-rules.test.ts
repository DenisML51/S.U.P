import { describe, expect, it } from 'vitest';
import { createCharacterDocument, type Character, type DndBuild } from '@itd/schema';
import { damageRulesFor, resetTurn, rollFormula, rollOptionsOf, spendTurnRules } from '../src';
import { applyBuild, createDndHero, setPicks } from '../src/dnd';
import { sequence } from './helpers';

/** A random source that lands each die of `sides` on the given faces, in order. */
const faces = (sides: number, ...values: number[]) => sequence(...values.map((v) => (v - 0.5) / sides));

describe('dice options of features', () => {
  it('rolls twice and keeps the better total', () => {
    const roll = rollFormula('1d12+3', faces(12, 2, 9), { twice: true });
    expect(roll.total).toBe(12);
    expect(roll.discarded?.total).toBe(5);
  });

  it('rolls a 1 again once and keeps the new result', () => {
    expect(rollFormula('2d6', faces(6, 1, 1, 4), { rerollOnes: true }).rolls.map((r) => r.value)).toEqual([1, 4]);
  });

  it('counts a 1 as 2', () => {
    expect(rollFormula('2d8', faces(8, 1, 5), { onesAsTwos: true }).total).toBe(7);
  });

  it('rolls the lowest die again when it is below average, and adds a die on a crit', () => {
    expect(rollFormula('2d8', faces(8, 7, 2, 6), { rerollLowest: true }).rolls.map((r) => r.value)).toEqual([7, 6]);
    expect(rollFormula('2d8', faces(8, 7, 5), { rerollLowest: true }).rolls.map((r) => r.value)).toEqual([7, 5]);
    expect(rollFormula('1d8+2', faces(8, 1, 1, 1), { critical: true, extraCritDice: 1 }).rolls).toHaveLength(3);
  });
});

const build = (patch: Partial<DndBuild> = {}): DndBuild => ({
  ruleset: 'dnd2024',
  species: 'human',
  background: 'soldier',
  class: 'fighter',
  abilityMethod: 'pointBuy',
  baseAttributes: { strength: 15, dexterity: 14, constitution: 13, intelligence: 8, wisdom: 12, charisma: 10 },
  backgroundBonuses: { strength: 2, constitution: 1 },
  choices: {},
  hitPoints: [],
  level: 1,
  ...patch,
});
const hero = (b: DndBuild): Character => createCharacterDocument(createDndHero({ name: 'Т', build: b, classKitId: 'a', backgroundKitId: 'a' }));

describe('feats that change damage dice', () => {
  it('Savage Attacker rolls weapon damage twice, once a turn', () => {
    // The Soldier's origin feat.
    const fighter = hero(build());
    const rules = damageRulesFor(fighter, { kind: 'weapon', attack: true }, 'Рубящий');
    expect(rules.map((r) => r.name)).toEqual(['Неистово атакующий']);
    expect(rollOptionsOf(rules).twice).toBe(true);
    expect(damageRulesFor(fighter, { kind: 'spell' }, 'Огонь')).toEqual([]);
    const used = spendTurnRules(fighter, rules);
    expect(damageRulesFor(used, { kind: 'weapon', attack: true }, 'Рубящий')).toEqual([]);
    expect(damageRulesFor(resetTurn(used), { kind: 'weapon', attack: true }, 'Рубящий')).toHaveLength(1);
  });

  it('Tavern Brawler gives an unarmed strike of 1d4 + Strength whose ones are rolled again', () => {
    const brawler = hero(build({ background: 'sailor' }));
    expect(brawler.attacks.find((a) => a.name === 'Безоружный удар')).toMatchObject({ damage: '1d4+3', damageType: 'Дробящий' });
    expect(damageRulesFor(brawler, { kind: 'unarmed', attack: true }, 'Дробящий').map((r) => r.rerollOnes)).toEqual([true]);
  });

  it('Elemental Adept counts ones as twos on spells of its type only', () => {
    let b = setPicks(build({ class: 'wizard', level: 4, baseAttributes: { strength: 8, dexterity: 14, constitution: 13, intelligence: 15, wisdom: 12, charisma: 10 } }), 'class:wizard.asi-4/feat', ['elemental-adept']);
    b = setPicks(b, 'class:wizard.asi-4/feat:elemental-adept/damage-type', ['fire']);
    const wizard = applyBuild(hero(build({ class: 'wizard' })), b).character;
    expect(damageRulesFor(wizard, { kind: 'spell' }, 'Огонь').map((r) => r.onesAsTwos)).toEqual([true]);
    expect(damageRulesFor(wizard, { kind: 'spell' }, 'Холод')).toEqual([]);
  });
});
