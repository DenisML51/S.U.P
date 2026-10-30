import type { Character, Limb, Resource } from '@itd/schema';
import { attributeModifier } from './abilities';
import { resetTurn } from './actions';
import { endAllFeatures, endConcentration, endFeatures } from './concentration';
import { rollDie, type RandomSource } from './dice';
import { exhaustionLevel, setExhaustion } from './d20';
import { LIMB_LOST_HP, settleHealth, totalMaxHP } from './health';

/** A night's sleep mends a limb by half its maximum; a lost limb stays lost. */
const mendLimb = (limb: Limb): Limb => {
  if (limb.currentHP >= limb.maxHP || limb.currentHP <= LIMB_LOST_HP) return limb;
  return { ...limb, currentHP: Math.min(limb.maxHP, limb.currentHP + Math.max(1, Math.ceil(limb.maxHP / 2))) };
};

/** Limbs still hurt, for the line of what a rest changed. */
const hurtLimbs = (limbs: Limb[]) => limbs.filter((limb) => limb.currentHP < limb.maxHP).length;

/** Hit points of a hit die taken as its average instead of a roll: d10 → 6. */
export const averageHitPoints = (hitDie: number): number => hitDie / 2 + 1;

/**
 * The pools of hit dice the sheet keeps, one per die size: a fighter who took wizard levels has d10s
 * and d6s, spent and counted apart.
 */
export const hitDicePools = (character: Pick<Character, 'resources'>): Resource[] =>
  character.resources.filter((r) => r.hitDie !== undefined);

/** Id of a preset hero's pool of hit dice of one size. */
export const hitDiceId = (hitDie: number): string => `hit-dice-${hitDie}`;

/** One line of "what the rest changed": a value before and after. */
export interface RestChange {
  /** `hp`, `tempHP` or the id of the resource. */
  id: string;
  label: string;
  before: number;
  after: number;
  max?: number;
}

export interface RestResult {
  character: Character;
  changes: RestChange[];
  /** The line for the hero's log: "Короткий отдых: хиты 20 → 32, Второе дыхание 1 → 2". */
  message: string;
}

export type RestKind = 'short' | 'long';

export type HitDieMethod = 'roll' | 'average';

export interface ShortRestOptions {
  /** Hit dice to spend on healing, by the id of their pool; at most what is left of each. */
  hitDice?: Record<string, number>;
  method?: HitDieMethod;
  /**
   * Hit dice already rolled, by pool, in order. An edit may be applied more than once (on screen,
   * then to the stored copy), so the caller rolls once and passes the results; missing ones are
   * rolled here.
   */
  rolls?: Record<string, number[]>;
  random?: RandomSource;
}

/** How many dice of a pool a short rest spends: what was asked, at most what is left. */
export const hitDiceToSpend = (pool: Resource, options: Pick<ShortRestOptions, 'hitDice'>): number =>
  Math.max(0, Math.min(Math.trunc(options.hitDice?.[pool.id] ?? 0), pool.current));

const describe = (title: string, changes: RestChange[]): string =>
  changes.length === 0
    ? `${title}: без изменений`
    : `${title}: ${changes.map((c) => `${c.label} ${c.before} → ${c.after}`).join(', ')}`;

const restoredResource = (resource: Resource, kind: RestKind): Resource => {
  if (resource.hitDie !== undefined) return resource;
  const restores = resource.recovery === 'short' || (kind === 'long' && resource.recovery === 'long');
  if (!restores) return resource;
  const amount =
    kind === 'short' && resource.recoveryAmount !== undefined ? resource.recoveryAmount : resource.max;
  const current = Math.min(resource.max, resource.current + Math.max(0, amount));
  return current === resource.current ? resource : { ...resource, current };
};

/** Pools a rest restores, and the lines that tell what changed in them. */
function restoreResources(
  character: Character,
  kind: RestKind,
): { resources: Resource[]; changes: RestChange[] } {
  const changes: RestChange[] = [];
  const resources = character.resources.map((resource) => {
    const restored = restoredResource(resource, kind);
    if (restored !== resource) {
      changes.push({
        id: resource.id,
        label: resource.name,
        before: resource.current,
        after: restored.current,
        max: resource.max,
      });
    }
    return restored;
  });
  return { resources, changes };
}

const replaceResource = (resources: Resource[], next: Resource): Resource[] =>
  resources.map((r) => (r.id === next.id ? next : r));

/**
 * A short rest: the hero may spend hit dice of any of their pools, each healing its roll (or
 * average) plus the Constitution modifier, at least 1; resources that come back on a short rest
 * return (all of them, or `recoveryAmount`).
 */
export function shortRest(character: Character, options: ShortRestOptions = {}): RestResult {
  const { method = 'roll', random = Math.random } = options;
  const { resources, changes } = restoreResources(character, 'short');
  // Features that last until any rest (Crimson Rite, a Mutagen) end with this one.
  let next: Character = endFeatures({ ...character, resources }, (ability) => !!ability.stanceUntilShortRest);

  const constitution = attributeModifier(character, 'constitution');
  let healing = 0;
  const poolChanges: RestChange[] = [];
  const rolled: string[] = [];
  for (const pool of hitDicePools(character)) {
    const spent = hitDiceToSpend(pool, options);
    if (spent === 0) continue;
    const dice: number[] = [];
    for (let i = 0; i < spent; i += 1) {
      const die = method === 'average' ? averageHitPoints(pool.hitDie!) : (options.rolls?.[pool.id]?.[i] ?? rollDie(pool.hitDie!, random));
      dice.push(die);
      healing += Math.max(1, die + constitution);
    }
    if (method === 'roll') rolled.push(`к${pool.hitDie}: ${dice.join(', ')}`);
    next = { ...next, resources: replaceResource(next.resources, { ...pool, current: pool.current - spent }) };
    poolChanges.push({ id: pool.id, label: pool.name, before: pool.current, after: pool.current - spent, max: pool.max });
  }
  if (poolChanges.length > 0) {
    const currentHP = Math.min(totalMaxHP(character), character.currentHP + healing);
    // Healed off the floor, the hero wakes and the death saves end.
    next = settleHealth({ ...next, currentHP });
    changes.unshift({ id: 'hp', label: 'Хиты', before: character.currentHP, after: currentHP, max: totalMaxHP(character) }, ...poolChanges);
  }

  const dice = rolled.length > 0 ? ` (${rolled.join('; ')})` : '';
  return { character: next, changes, message: describe('Короткий отдых', changes) + dice };
}

/**
 * A long rest: full hit points, no temporary ones, every short- and long-rest resource (spell slots
 * among them) restored, every hit die back (D&D 2024), one level of exhaustion gone, limbs mended by
 * half their maximum (a lost one stays lost), this turn's actions reset and concentration over.
 * Sanity does not come back with sleep.
 */
export function longRest(character: Character): RestResult {
  const { resources, changes } = restoreResources(character, 'long');
  // What was taken off the maximum until a long rest (a Vital Sacrifice) comes back first.
  const { maxHPReduction: lowered, ...whole } = character;
  const maxHP = totalMaxHP(whole);
  let next: Character = endAllFeatures(endConcentration(resetTurn({ ...whole, resources, currentHP: maxHP, tempHP: 0 })));
  if (lowered) changes.push({ id: 'maxHP', label: 'Максимум хитов', before: totalMaxHP(character), after: maxHP });

  // Every hit die of every pool comes back (D&D 2024).
  for (const pool of [...hitDicePools(character)].reverse()) {
    if (pool.current >= pool.max) continue;
    next = { ...next, resources: replaceResource(next.resources, { ...pool, current: pool.max }) };
    changes.unshift({ id: pool.id, label: pool.name, before: pool.current, after: pool.max, max: pool.max });
  }
  const mended = next.limbs.map(mendLimb);
  if (mended.some((limb, i) => limb !== next.limbs[i])) {
    next = { ...next, limbs: mended };
    changes.push({ id: 'limbs', label: 'Раны конечностей', before: hurtLimbs(character.limbs), after: hurtLimbs(mended) });
  }
  const exhaustion = exhaustionLevel(character);
  if (exhaustion > 0) {
    next = setExhaustion(next, exhaustion - 1);
    changes.push({ id: 'exhaustion', label: 'Истощение', before: exhaustion, after: exhaustion - 1 });
  }
  if (character.tempHP > 0)
    changes.unshift({ id: 'tempHP', label: 'Временные хиты', before: character.tempHP, after: 0 });
  if (character.currentHP !== maxHP)
    changes.unshift({ id: 'hp', label: 'Хиты', before: character.currentHP, after: maxHP, max: maxHP });

  return { character: next, changes, message: describe('Долгий отдых', changes) };
}
