import { describe, expect, it } from 'vitest';
import { firearmModifiers, weaponDef } from '@itd/game-logic/coc';
import type { Attack } from '@itd/schema';
import {
  diveForCover,
  enterRound,
  fightBackSkill,
  freshRound,
  idleRound,
  meleeWeapons,
  readRound,
  shotsPerRound,
  shotsToFire,
  syncWithTable,
  withBigTarget,
} from '../src/screens/coc/combatRules';

const attack = (id: string, skill?: string) => ({ id, name: id, skill }) as Attack;

describe('shotsPerRound', () => {
  it('reads the attacks per round of the weapon table', () => {
    expect(shotsPerRound(weaponDef('revolver-38')?.uses)).toBe(3);
    expect(shotsPerRound(weaponDef('rifle-30-06')?.uses)).toBe(1);
    expect(shotsPerRound(weaponDef('shotgun-12')?.uses)).toBe(2);
    expect(shotsPerRound('1 (2) или очередь')).toBe(2);
    expect(shotsPerRound(undefined)).toBe(1);
  });

  it('fires no more than the gun allows or holds', () => {
    expect(shotsToFire(3, 3, 2)).toBe(2);
    expect(shotsToFire(3, 1, 6)).toBe(1);
    expect(shotsToFire(2, 3, 0)).toBe(0);
    expect(shotsToFire(2, 3, undefined)).toBe(2);
  });
});

describe('fighting back', () => {
  it('uses the Fighting skill of the weapon, Brawl otherwise', () => {
    expect(fightBackSkill(attack('sword', 'fighting:sword'))).toBe('fighting:sword');
    expect(fightBackSkill(attack('gun', 'firearms:handgun'))).toBe('fighting:brawl');
    expect(fightBackSkill(undefined)).toBe('fighting:brawl');
    expect(meleeWeapons([attack('a', 'fighting:axe'), attack('b', 'firearms:rifle-shotgun')]).map((a) => a.id)).toEqual(['a']);
  });
});

describe('the round', () => {
  it('a new round gives the action back and keeps the aim', () => {
    const used = { ...freshRound('f', 1), actionUsed: true, reactions: 2, aimedWith: 'gun' };
    expect(enterRound(used, 2)).toMatchObject({ round: 2, actionUsed: false, reactions: 0, aimedWith: 'gun' });
    expect(enterRound(used, 1)).toBe(used);
  });

  it('another fight at the table starts clean; no fight ends it', () => {
    const old = { ...freshRound('old', 4), actionUsed: true, aimedWith: 'gun' };
    expect(syncWithTable(old, { startedAt: 'new', round: 1 })).toEqual(freshRound('new', 1));
    expect(syncWithTable(old, null)).toEqual(idleRound());
    expect(syncWithTable(old, { startedAt: 'old', round: 5 })).toMatchObject({ round: 5, actionUsed: false });
  });

  it('reads what older versions kept', () => {
    expect(readRound('{"round":3,"inCombat":true}')).toMatchObject({ round: 3, inCombat: true, fightKey: null });
    expect(readRound('not json')).toEqual(idleRound());
  });

  it('diving for cover takes this round’s action, or the next one’s', () => {
    const fresh = freshRound('f', 1);
    expect(diveForCover(fresh)).toMatchObject({ actionUsed: true });
    const acted = diveForCover({ ...fresh, actionUsed: true });
    expect(acted.forfeitNext).toBe(true);
    expect(enterRound(acted, 2)).toMatchObject({ actionUsed: true, forfeitNext: false });
  });
});

describe('a big target', () => {
  it('adds a bonus die that cancels a penalty one', () => {
    expect(withBigTarget(firearmModifiers({}), true)).toMatchObject({ bonus: 1, penalty: 0 });
    expect(withBigTarget(firearmModifiers({ intoMelee: true }), true)).toMatchObject({ bonus: 0, penalty: 0 });
    expect(withBigTarget(firearmModifiers({ intoMelee: true }), false)).toMatchObject({ penalty: 1 });
  });
});
