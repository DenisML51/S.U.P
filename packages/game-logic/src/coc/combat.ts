import type { Difficulty, SuccessLevel } from './engine';

/**
 * Combat by the rules of Call of Cthulhu 7th edition: who acts first, how an attack meets a
 * defence, what modifies a shot, when a manoeuvre is possible. Pure decisions; the screens roll
 * through `checkSkill` and apply damage through `applyDamage`.
 */

const RANK: Record<SuccessLevel, number> = { fumble: 0, failure: 1, regular: 2, hard: 3, extreme: 4, critical: 5 };

/** Initiative is DEX; a firearm drawn and ready adds 50 for the order (and ties go to the higher combat skill). */
export const initiativeOf = (dex: number, firearmReady = false): number => dex + (firearmReady ? 50 : 0);

export type Defence = 'dodge' | 'fightBack';
export type OpposedWinner = 'attacker' | 'defender' | 'none';

/**
 * An attack against a defence: the higher level of success wins. A tie goes to the defender who
 * dodges and to the attacker against one who fights back; when neither succeeds nothing happens.
 * A defender who wins by fighting back deals their own damage.
 */
export function opposedResult(attack: SuccessLevel, defence: SuccessLevel, mode: Defence): OpposedWinner {
  const a = RANK[attack] >= RANK.regular ? RANK[attack] : 0;
  const d = RANK[defence] >= RANK.regular ? RANK[defence] : 0;
  if (a === 0 && d === 0) return 'none';
  if (a > d) return 'attacker';
  if (d > a) return 'defender';
  return mode === 'dodge' ? 'defender' : 'attacker';
}

export interface RollModifiers {
  difficulty: Difficulty;
  bonus: number;
  penalty: number;
  /** Why, for people ("в упор: +1 бонусная"). */
  reasons: string[];
}

export type FirearmRange = 'base' | 'long' | 'veryLong';

export interface FirearmSituation {
  /** Within a fifth of the shooter's DEX in feet: a bonus die. */
  pointBlank?: boolean;
  /** A round spent aiming: a bonus die (lost if the shooter moves or is hurt). */
  aimed?: boolean;
  /** Shots fired this round with a handgun: more than one gives every shot a penalty die. */
  shots?: number;
  /** Beyond the weapon's range is hard, beyond twice is extreme (three times the most). */
  range?: FirearmRange;
  /** Shooting into a melee: a penalty die. */
  intoMelee?: boolean;
  /** The target dived for cover (a successful Dodge this round): a penalty die. */
  targetDivedForCover?: boolean;
  /** The target is small, fast or half hidden: a penalty die. */
  targetHidden?: boolean;
}

/** What a shot rolls with, by the situation; bonus and penalty dice cancel each other. */
export function firearmModifiers(s: FirearmSituation): RollModifiers {
  const reasons: string[] = [];
  let bonus = 0;
  let penalty = 0;
  if (s.pointBlank) {
    bonus++;
    reasons.push('в упор: бонусная кость');
  }
  if (s.aimed) {
    bonus++;
    reasons.push('прицелился: бонусная кость');
  }
  if ((s.shots ?? 1) > 1) {
    penalty++;
    reasons.push(`${s.shots} выстрела: штрафная кость на каждый`);
  }
  if (s.intoMelee) {
    penalty++;
    reasons.push('в свалку: штрафная кость');
  }
  if (s.targetDivedForCover) {
    penalty++;
    reasons.push('цель в укрытии: штрафная кость');
  }
  if (s.targetHidden) {
    penalty++;
    reasons.push('цель скрыта или мала: штрафная кость');
  }
  const difficulty: Difficulty = s.range === 'veryLong' ? 'extreme' : s.range === 'long' ? 'hard' : 'regular';
  if (difficulty !== 'regular') reasons.push(difficulty === 'hard' ? 'дальняя дистанция: трудный бросок' : 'очень дальняя: экстремальный');
  const net = bonus - penalty;
  return { difficulty, bonus: Math.max(0, Math.min(2, net)), penalty: Math.max(0, Math.min(2, -net)), reasons };
}

export interface MeleeSituation {
  /** The defender already dodged or fought back this round as often as this: each later attacker gets a bonus die. */
  defenderReactedThisRound?: number;
  /** The attacker is outnumbered too, or prone, or otherwise hampered: a penalty die. */
  hampered?: boolean;
  /** The defender was surprised: no defence at all (the screen says so). */
  surprised?: boolean;
}

/** What a melee attack rolls with: outnumbering the defender gives a bonus die. */
export function meleeModifiers(s: MeleeSituation): RollModifiers {
  const reasons: string[] = [];
  let bonus = 0;
  let penalty = 0;
  if ((s.defenderReactedThisRound ?? 0) > 0) {
    bonus++;
    reasons.push('цель уже защищалась в этом раунде: бонусная кость');
  }
  if (s.hampered) {
    penalty++;
    reasons.push('помеха: штрафная кость');
  }
  if (s.surprised) reasons.push('цель застигнута врасплох: защиты нет');
  const net = bonus - penalty;
  return { difficulty: 'regular', bonus: Math.max(0, net), penalty: Math.max(0, -net), reasons };
}

export type ManoeuvreChance = { possible: false; reason: string } | ({ possible: true } & RollModifiers);

/**
 * A fighting manoeuvre (disarm, knock down, grab, push) against a target's Build: one smaller gives
 * a penalty die, two smaller makes it hard, three or more is impossible.
 */
export function manoeuvreChance(attackerBuild: number, targetBuild: number): ManoeuvreChance {
  const gap = targetBuild - attackerBuild;
  if (gap >= 3) return { possible: false, reason: 'Цель слишком велика: комплекция больше на 3 и более' };
  if (gap === 2) return { possible: true, difficulty: 'hard', bonus: 0, penalty: 0, reasons: ['цель крупнее на 2: трудный бросок'] };
  if (gap === 1) return { possible: true, difficulty: 'regular', bonus: 0, penalty: 1, reasons: ['цель крупнее на 1: штрафная кость'] };
  return { possible: true, difficulty: 'regular', bonus: 0, penalty: 0, reasons: [] };
}

/** One round of a combatant: the action, and how often they defended (outnumbering counts it). */
export interface RoundState {
  round: number;
  actionUsed: boolean;
  reactions: number;
  /** Aimed last round with this weapon. */
  aimedWith?: string;
}

export const newRound = (round: number, aimedWith?: string): RoundState => ({ round, actionUsed: false, reactions: 0, aimedWith });
