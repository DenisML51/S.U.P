import type { Character, Resource } from '@itd/schema';
import { attributeModifier } from './abilities';
import { resetTurn } from './actions';
import { rollDie, type RandomSource } from './dice';
import { totalMaxHP } from './health';

/** Hit points of a hit die taken as its average instead of a roll: d10 → 6. */
export const averageHitPoints = (hitDie: number): number => hitDie / 2 + 1;

/** The pool of hit dice, if the sheet keeps one. */
export const hitDiceOf = (character: Pick<Character, 'resources'>): Resource | undefined =>
  character.resources.find((r) => r.hitDie !== undefined);

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
  /** Hit dice to spend on healing; at most what is left. */
  hitDice?: number;
  method?: HitDieMethod;
  /**
   * Hit dice already rolled, in order. An edit may be applied more than once (on screen, then to the
   * stored copy), so the caller rolls once and passes the results; missing ones are rolled here.
   */
  rolls?: number[];
  random?: RandomSource;
}

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
 * A short rest: the hero may spend hit dice, each healing its roll (or average) plus the
 * Constitution modifier, at least 1; resources that come back on a short rest return (all of them,
 * or `recoveryAmount`).
 */
export function shortRest(character: Character, options: ShortRestOptions = {}): RestResult {
  const { method = 'roll', random = Math.random } = options;
  const { resources, changes } = restoreResources(character, 'short');
  let next: Character = { ...character, resources };

  const pool = hitDiceOf(character);
  const spent = pool ? Math.max(0, Math.min(Math.trunc(options.hitDice ?? 0), pool.current)) : 0;
  const rolled: number[] = [];
  if (pool && spent > 0) {
    const constitution = attributeModifier(character, 'constitution');
    let healing = 0;
    for (let i = 0; i < spent; i += 1) {
      const die =
        method === 'average'
          ? averageHitPoints(pool.hitDie!)
          : (options.rolls?.[i] ?? rollDie(pool.hitDie!, random));
      if (method === 'roll') rolled.push(die);
      healing += Math.max(1, die + constitution);
    }
    const currentHP = Math.min(totalMaxHP(character), character.currentHP + healing);
    next = {
      ...next,
      currentHP,
      resources: replaceResource(next.resources, { ...pool, current: pool.current - spent }),
    };
    changes.unshift(
      { id: 'hp', label: 'Хиты', before: character.currentHP, after: currentHP, max: totalMaxHP(character) },
      { id: pool.id, label: pool.name, before: pool.current, after: pool.current - spent, max: pool.max },
    );
  }

  const dice = rolled.length > 0 ? ` (к${pool!.hitDie}: ${rolled.join(', ')})` : '';
  return { character: next, changes, message: describe('Короткий отдых', changes) + dice };
}

/**
 * A long rest: full hit points, no temporary ones, every short- and long-rest resource (spell slots
 * among them) restored, half of the hit dice back (at least one), this turn's actions reset.
 * Sanity does not come back with sleep.
 */
export function longRest(character: Character): RestResult {
  const { resources, changes } = restoreResources(character, 'long');
  const maxHP = totalMaxHP(character);
  let next: Character = resetTurn({ ...character, resources, currentHP: maxHP, tempHP: 0 });

  const pool = hitDiceOf(character);
  if (pool && pool.current < pool.max) {
    const current = Math.min(pool.max, pool.current + Math.max(1, Math.floor(pool.max / 2)));
    next = { ...next, resources: replaceResource(next.resources, { ...pool, current }) };
    changes.unshift({ id: pool.id, label: pool.name, before: pool.current, after: current, max: pool.max });
  }
  if (character.tempHP > 0)
    changes.unshift({ id: 'tempHP', label: 'Временные хиты', before: character.tempHP, after: 0 });
  if (character.currentHP !== maxHP)
    changes.unshift({ id: 'hp', label: 'Хиты', before: character.currentHP, after: maxHP, max: maxHP });

  return { character: next, changes, message: describe('Долгий отдых', changes) };
}
