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
  /** The shot cannot be made at all (the target is beyond the weapon's reach). */
  impossible?: boolean;
  /** A shotgun's damage band at this range, for `weaponDamageDetailed` (0 up close). */
  band?: number;
}

/** Up to the base range, up to twice it, up to four times it, and beyond reach. */
export type FirearmRange = 'base' | 'long' | 'veryLong' | 'beyond';

/** The yards of a weapon's range: one number, or a shotgun's bands ("10/20/50 ярд."); none for touch or STR/5. */
export function rangeBands(spec: string | undefined): number[] {
  const parts = (spec ?? '').replace(/ярд\.?/i, '').split('/').map((part) => part.trim());
  return parts.every((part) => /^\d+$/.test(part)) ? parts.map(Number) : [];
}

export interface RangeOf {
  range: FirearmRange;
  /** The damage band (always 0 for a weapon with one). */
  band: number;
  /** How many damage bands the weapon has: more than one for shotguns. */
  bands: number;
}

/**
 * Where a distance in yards falls for a weapon's range. One range: up to it regular, up to twice
 * hard, up to four times extreme, past that impossible. A shotgun's bands ("10/20/50") are `base`,
 * `long` and `veryLong` in turn, but make no roll harder (`firearmModifiers` with `bands`): each
 * band farther deals the next, smaller damage, and past the last it cannot reach. Undefined when the
 * range is not in yards (touch, thrown by STR).
 */
export function firearmRangeOf(distance: number, spec: string | undefined): RangeOf | undefined {
  const bands = rangeBands(spec);
  if (bands.length === 0) return undefined;
  if (bands.length > 1) {
    const band = bands.findIndex((yards) => distance <= yards);
    const steps: FirearmRange[] = ['base', 'long', 'veryLong'];
    return band < 0
      ? { range: 'beyond', band: bands.length - 1, bands: bands.length }
      : { range: steps[Math.min(band, steps.length - 1)], band, bands: bands.length };
  }
  const [base] = bands;
  const range: FirearmRange =
    distance <= base ? 'base' : distance <= base * 2 ? 'long' : distance <= base * 4 ? 'veryLong' : 'beyond';
  return { range, band: 0, bands: 1 };
}

export interface FirearmSituation {
  /** Within a fifth of the shooter's DEX in feet: a bonus die. */
  pointBlank?: boolean;
  /** A round spent aiming: a bonus die (lost if the shooter moves or is hurt). */
  aimed?: boolean;
  /** Shots fired this round with a handgun: more than one gives every shot a penalty die. */
  shots?: number;
  /**
   * Up to the weapon's base range is regular, up to twice it hard, up to four times extreme, beyond
   * that impossible. For a shotgun (`bands` > 1) the range picks the damage band instead.
   */
  range?: FirearmRange;
  /** Damage bands of the weapon ("4d6/2d6/1d6" is 3): a shotgun loses dice with range, not accuracy. */
  bands?: number;
  /** Shooting into a melee: a penalty die. */
  intoMelee?: boolean;
  /** The target dived for cover (a successful Dodge this round): a penalty die. */
  targetDivedForCover?: boolean;
  /** The target is small, fast or half hidden: a penalty die. */
  targetHidden?: boolean;
  /** Pulp «Беглый огонь»: several handgun shots in a round carry no penalty die. */
  rapidFire?: boolean;
  /** Pulp «Зоркий глаз»: an aimed shot ignores a small target and shooting into a melee. */
  beadyEye?: boolean;
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
  const sharpAim = !!(s.beadyEye && s.aimed);
  if ((s.shots ?? 1) > 1) {
    if (s.rapidFire) reasons.push(`${s.shots} выстрела: беглый огонь, без штрафа`);
    else {
      penalty++;
      reasons.push(`${s.shots} выстрела: штрафная кость на каждый`);
    }
  }
  if (s.intoMelee) {
    if (sharpAim) reasons.push('в свалку: зоркий глаз, без штрафа');
    else {
      penalty++;
      reasons.push('в свалку: штрафная кость');
    }
  }
  if (s.targetDivedForCover) {
    penalty++;
    reasons.push('цель в укрытии: штрафная кость');
  }
  if (s.targetHidden) {
    if (sharpAim) reasons.push('мелкая цель: зоркий глаз, без штрафа');
    else {
      penalty++;
      reasons.push('цель скрыта или мала: штрафная кость');
    }
  }
  const bands = Math.max(1, s.bands ?? 1);
  const impossible = s.range === 'beyond';
  if (impossible) reasons.push('вне досягаемости: выстрел невозможен');
  let difficulty: Difficulty = 'regular';
  let band: number | undefined;
  if (bands > 1) {
    band = Math.min(bands - 1, s.range === 'veryLong' || impossible ? 2 : s.range === 'long' ? 1 : 0);
    if (band > 0) reasons.push(`дробь рассеялась: урон ${band + 1}-й дистанции`);
  } else if (!impossible) {
    difficulty = s.range === 'veryLong' ? 'extreme' : s.range === 'long' ? 'hard' : 'regular';
    if (difficulty !== 'regular') reasons.push(difficulty === 'hard' ? 'дальняя дистанция: трудный бросок' : 'очень дальняя: экстремальный');
  }
  const net = bonus - penalty;
  return {
    difficulty,
    bonus: Math.max(0, Math.min(2, net)),
    penalty: Math.max(0, Math.min(2, -net)),
    reasons,
    ...(impossible ? { impossible } : {}),
    ...(band !== undefined ? { band } : {}),
  };
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
 * A fighting manoeuvre (disarm, knock down, grab, push) against a target's Build: a penalty die for
 * each point the target's Build is bigger (one or two), three or more bigger is impossible.
 */
export function manoeuvreChance(attackerBuild: number, targetBuild: number): ManoeuvreChance {
  const gap = targetBuild - attackerBuild;
  if (gap >= 3) return { possible: false, reason: 'Цель слишком велика: комплекция больше на 3 и более' };
  if (gap === 2) return { possible: true, difficulty: 'regular', bonus: 0, penalty: 2, reasons: ['цель крупнее на 2: две штрафные кости'] };
  if (gap === 1) return { possible: true, difficulty: 'regular', bonus: 0, penalty: 1, reasons: ['цель крупнее на 1: штрафная кость'] };
  return { possible: true, difficulty: 'regular', bonus: 0, penalty: 0, reasons: [] };
}

/** A Pulp hero's talent: the build writes each onto the sheet as a trait granted `talent:<id>`. */
export const hasTalent = (character: { traits: { grant?: string }[] }, id: string): boolean =>
  character.traits.some((trait) => trait.grant === `talent:${id}`);

/** The first die of a damage formula ("1d8+2+DB" → 8): what Pulp «Тяжёлая рука» adds once more. */
export function damageDieOf(damage: string): number | undefined {
  const match = /\d*d(\d+)/i.exec(damage.split('/')[0] ?? '');
  return match ? Number(match[1]) : undefined;
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
