import { newRound, type RollModifiers, type RoundState } from '@itd/game-logic/coc';
import type { Attack } from '@itd/schema';

/**
 * Pure decisions of the investigator's combat screen that the game logic leaves to the table: how
 * many shots a gun allows, what the hero fights back with, the round kept with the tab.
 */

/** The round of this investigator on this screen: which fight it belongs to and what carries over. */
export interface CocRound extends RoundState {
  inCombat: boolean;
  initiative: number | null;
  /** The fight this round belongs to (the table's `startedAt`, or a local mark); a new fight starts clean. */
  fightKey: string | null;
  /** Dived for cover after acting this round: the next round's action is lost. */
  forfeitNext?: boolean;
  /** Pulp «Крепкий орешек»: hit points already shrugged off this round (up to 5). */
  shrugged?: number;
  /** Pulp «Стремительная атака»: the extra melee attack of this round is taken. */
  rapidAttack?: boolean;
}

export const idleRound = (): CocRound => ({
  ...newRound(0),
  inCombat: false,
  initiative: null,
  fightKey: null,
});

/** The first round of a fight. */
export const freshRound = (fightKey: string, round = 1, initiative: number | null = null): CocRound => ({
  ...newRound(round),
  inCombat: true,
  initiative,
  fightKey,
});

/**
 * A new round begins: the action and the defences count anew, an aim carries over (it is spent by
 * the shot), and a dive for cover made after acting takes this round's action. The same round again
 * changes nothing, so a turn starting and a round changing may both call it.
 */
export function enterRound(current: CocRound, round: number): CocRound {
  if (round === current.round) return current;
  return {
    ...current,
    ...newRound(round, current.aimedWith),
    actionUsed: !!current.forfeitNext,
    forfeitNext: false,
    shrugged: 0,
    rapidAttack: false,
  };
}

/** Hurt: an aim is lost (7th edition: the aiming shooter must not move or be hurt). */
export const afterHurt = (current: CocRound): CocRound =>
  current.aimedWith ? { ...current, aimedWith: undefined } : current;

/** What Pulp «Крепкий орешек» still shrugs off this round: up to 5 hit points of a blow. */
export const TOUGH_GUY_POINTS = 5;
export const shrugOff = (current: CocRound, amount: number): number =>
  Math.max(0, Math.min(amount, TOUGH_GUY_POINTS - (current.shrugged ?? 0)));

/** The Luck a Pulp talent of the fight costs each time («Тяжёлая рука», «Крепкий орешек», «Стремительная атака»). */
export const TALENT_LUCK = 10;

/**
 * The round kept with the tab against the table's fight: a different fight (or none) starts clean,
 * a new round of the same fight is entered.
 */
export function syncWithTable(
  current: CocRound,
  fight: { startedAt: string; round: number } | null,
): CocRound {
  if (!fight) return current.inCombat || current.fightKey ? idleRound() : current;
  if (current.fightKey !== fight.startedAt) return freshRound(fight.startedAt, fight.round);
  return enterRound(current, fight.round);
}

/** A kept round, whatever the tab held (older versions kept no fight). */
export function readRound(raw: string | null): CocRound {
  try {
    const parsed = JSON.parse(raw ?? '{}') as Partial<CocRound>;
    return { ...idleRound(), ...parsed, fightKey: parsed.fightKey ?? null };
  } catch {
    return idleRound();
  }
}

/**
 * Shots a weapon may fire in a round, by its «Атак в раунд» field: "1 (3)" is up to three (a
 * handgun), "1 или 2" two (both barrels), "1" one; a burst is not counted as shots.
 */
export function shotsPerRound(uses: string | undefined): number {
  const numbers = (uses ?? '')
    .replace(/очеред\S*/gi, '')
    .match(/\d+/g)
    ?.map(Number)
    .filter((n) => n > 0);
  return Math.max(1, ...(numbers ?? [1]));
}

/** Shots fired: no more than asked, than the gun allows, than there are rounds in it. */
export const shotsToFire = (asked: number, max: number, ammo: number | undefined): number =>
  Math.max(0, Math.min(Math.max(1, asked), max, ammo ?? Infinity));

/** Weapons the hero may fight back with: those of a Fighting skill (Brawl without one). */
export const meleeWeapons = (attacks: Attack[]): Attack[] =>
  attacks.filter((a) => a.skill?.startsWith('fighting:'));

/** The Fighting skill of a fight back: the weapon's, or Brawl. */
export const fightBackSkill = (weapon: Pick<Attack, 'skill'> | undefined): string =>
  weapon?.skill?.startsWith('fighting:') ? weapon.skill : 'fighting:brawl';

/** A target of Build 4 or more is big: shots at it get a bonus die (7th edition). */
export const BIG_TARGET_BUILD = 4;

/** The shot's modifiers with a big target's bonus die; bonus and penalty dice still cancel. */
export function withBigTarget(mods: RollModifiers, big: boolean): RollModifiers {
  if (!big) return mods;
  const net = mods.bonus - mods.penalty + 1;
  return {
    ...mods,
    bonus: Math.max(0, Math.min(2, net)),
    penalty: Math.max(0, Math.min(2, -net)),
    reasons: [...mods.reasons, 'крупная цель: бонусная кость'],
  };
}

/**
 * Diving for cover (7th edition): the target of a firearm attack makes a Dodge roll instead of an
 * opposed defence; on a success the shooter rolls with a penalty die. Successful or not, the diver
 * forfeits their next attack: this round's, when they have yet to act, else the next round's.
 * A Pulp hero with «Проворный» keeps it. Moving to cover also spoils an aim.
 */
export function diveForCover(current: CocRound, nimble = false): CocRound {
  if (nimble) return { ...current, aimedWith: undefined };
  return current.actionUsed
    ? { ...current, forfeitNext: true }
    : { ...current, actionUsed: true, aimedWith: undefined };
}
