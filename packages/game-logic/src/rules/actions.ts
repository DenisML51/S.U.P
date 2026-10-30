import type { Ability, ActionCounters, Attack, Character, InventoryItem, Spell } from '@itd/schema';
import { isActiveFeature, spellBlocker, startConcentration, startFeature } from './concentration';
import type { RandomSource } from './dice';
import { payHitPoints } from './health';
import { changeItemQuantity, isWeaponStack, itemQuantity } from './inventory';
import { SLOT_CREATION_COST, changeResource, convertSlot } from './resources';
import { slotPoolFor } from './scaling';

export type ActionSlot = keyof Pick<ActionCounters, 'action' | 'bonus' | 'reaction'>;

export const ACTION_SLOTS: readonly ActionSlot[] = ['action', 'bonus', 'reaction'];
export const DEFAULT_ACTION_LIMITS: ActionCounters = { action: 1, bonus: 1, reaction: 1 };
const NO_SPENT_ACTIONS: ActionCounters = { action: 0, bonus: 0, reaction: 0 };

export const actionLimitsOf = (character: Pick<Character, 'actionLimits'>): ActionCounters =>
  character.actionLimits ?? DEFAULT_ACTION_LIMITS;

export const spentActionsOf = (character: Pick<Character, 'spentActions'>): ActionCounters =>
  character.spentActions ?? NO_SPENT_ACTIONS;

export const remainingActions = (character: Character, slot: ActionSlot): number =>
  Math.max(0, actionLimitsOf(character)[slot] - spentActionsOf(character)[slot]);

/**
 * Marks how many actions of a kind are spent this turn, within 0..limit. Another action spent or one
 * given back ends the attacks of the Attack action before it.
 */
export function setSpentActions(character: Character, slot: ActionSlot, spent: number): Character {
  const { strikes: _ended, ...counters } = spentActionsOf(character);
  return {
    ...character,
    spentActions: {
      ...(slot === 'action' ? counters : spentActionsOf(character)),
      [slot]: Math.min(actionLimitsOf(character)[slot], Math.max(0, Math.trunc(spent))),
    },
  };
}

/** Changes how many actions of a kind the character gets per turn (at least one). */
export function setActionLimit(character: Character, slot: ActionSlot, limit: number): Character {
  const limits = { ...actionLimitsOf(character), [slot]: Math.max(1, Math.trunc(limit)) };
  const spent = spentActionsOf(character);
  return { ...character, actionLimits: limits, spentActions: { ...spent, [slot]: Math.min(spent[slot], limits[slot]) } };
}

/**
 * Whether an ability can be used from the sheet: anything that takes an action, and a passive one
 * that spends uses (Sacred Weapon spends Channel Divinity as part of the Attack action), hit points or
 * is turned on and off (a Mutagen of an Alchemist's Mutate) — that one costs no action of its own.
 */
export const isUsable = (ability: Pick<Ability, 'actionType' | 'resourceId'> & Partial<Pick<Ability, 'stance' | 'hpCost'>>): boolean =>
  ability.actionType !== 'passive' || !!ability.resourceId || !!ability.stance || !!ability.hpCost;

/** Attacks one Attack action makes (Extra Attack). */
export const attacksPerActionOf = (character: Pick<Character, 'attacksPerAction'>): number => character.attacksPerAction ?? 1;

/**
 * Attacks left of the Attack action already taken this turn: with Extra Attack the second (and
 * third…) attack is part of the same action and costs none of its own.
 */
export function strikesLeft(character: Character): number {
  const strikes = spentActionsOf(character).strikes ?? 0;
  return strikes > 0 ? Math.max(0, attacksPerActionOf(character) - strikes) : 0;
}

const strikeOf = (strike: number, of: number) => `атака ${strike} из ${of}`;

/** A new turn: every action is available again. */
export const resetTurn = (character: Character): Character => {
  // Once-a-turn rules (Savage Attacker) are free again.
  const { turnUses: _used, ...rest } = character;
  return { ...rest, spentActions: { ...NO_SPENT_ACTIONS } };
};

// ---------------------------------------------------------------------------------------------
// Performing an attack, ability or spell
// ---------------------------------------------------------------------------------------------

export type PerformableKind = 'attack' | 'ability' | 'spell';

export interface PerformActionRequest {
  kind: PerformableKind;
  id: string;
  /** Ammunition stack to draw from when the weapon's ammunition cannot be matched unambiguously. */
  ammunitionItemId?: string;
  /** Spend an action of the matching kind from this turn's budget. */
  trackActionEconomy?: boolean;
  /** Cast a spell with a slot of this level (higher than its own to upcast). */
  slotLevel?: number;
  /** Cast a ritual spell as a ritual: no slot, 10 minutes longer, so never in a fight's turn. */
  asRitual?: boolean;
  /** How much of its pool an ability of a chosen cost spends (Lay on Hands), within its bounds. */
  resourceAmount?: number;
  /** The slot level a conversion turns into points or makes (Font of Magic). */
  conversionLevel?: number;
  /** Use an ability that can be strengthened in its stronger way (an amplified Blood Curse). */
  amplify?: boolean;
  /** Dice for the hit points an ability costs (Crimson Rite); Math.random unless given. */
  random?: RandomSource;
}

export type PerformActionFailure =
  | 'not_found'
  | 'passive'
  | 'not_prepared'
  | 'not_ritual'
  | 'no_action_left'
  | 'not_enough_resource'
  | 'ammunition_unresolved'
  | 'not_enough_ammunition'
  | 'already_active'
  | 'blocked_by_feature';

export interface PerformActionCosts {
  slot?: ActionSlot;
  resource?: { id: string; name: string; amount: number };
  ammunition?: { id: string; name: string; amount: number };
  /** Hit points the ability cost, as rolled. */
  hitPoints?: number;
  /** Of them, what came off the maximum until a long rest (a Vital Sacrifice). */
  maxHitPoints?: number;
}

export type PerformActionResult =
  | { ok: true; character: Character; costs: PerformActionCosts; message: string }
  | { ok: false; reason: PerformActionFailure; message: string };

const fail = (reason: PerformActionFailure, message: string): PerformActionResult => ({ ok: false, reason, message });

const ACTION_SLOT_NAMES: Record<ActionSlot, string> = {
  action: 'основное действие',
  bonus: 'бонусное действие',
  reaction: 'реакция',
};

/**
 * One stack of several of the same thing (two quivers of arrows from two kits): the first that still
 * has some. `null` when they differ (arrows and +1 arrows): the player says which.
 */
function sameKind(stacks: InventoryItem[]): InventoryItem | null {
  if (stacks.length === 0) return null;
  const name = stacks[0]!.name.trim().toLowerCase();
  if (stacks.some((s) => s.name.trim().toLowerCase() !== name)) return null;
  return stacks.find((s) => itemQuantity(s) > 0) ?? stacks[0]!;
}

/**
 * Ammunition a ranged attack draws from: the stack the player chose for it, else the stacks named
 * after the weapon's ammunition type, else every stack carried — when they are all the same thing.
 * `null` when the choice is the player's to make or there is nothing to use.
 */
export function resolveAmmunition(character: Character, attack: Attack): InventoryItem | null {
  const stacks = character.inventory.filter((item) => item.type === 'ammunition');
  const chosen = attack.ammunitionItemId ? stacks.find((s) => s.id === attack.ammunitionItemId) : undefined;
  if (chosen) return chosen;
  const weapon = attack.weaponId ? character.inventory.find((item) => item.id === attack.weaponId) : undefined;
  const wanted = weapon?.ammunitionType?.trim().toLowerCase();
  const matching = wanted
    ? stacks.filter((s) => s.name.toLowerCase().includes(wanted) || s.itemClass?.toLowerCase() === wanted)
    : [];
  return sameKind(matching.length > 0 ? matching : stacks);
}

/** Stacks of ammunition the player may choose from for a ranged attack. */
export const ammunitionChoices = (character: Pick<Character, 'inventory'>): InventoryItem[] =>
  character.inventory.filter((item) => item.type === 'ammunition');

/**
 * Uses an attack, ability or spell and pays for it: the resource it costs, the ammunition it fires
 * and, in combat, the action it takes. Nothing is spent unless everything can be paid. An entry that
 * needs concentration starts it.
 */
export function performAction(character: Character, request: PerformActionRequest): PerformActionResult {
  const source =
    request.kind === 'attack'
      ? character.attacks.find((a) => a.id === request.id)
      : request.kind === 'ability'
        ? character.abilities.find((a) => a.id === request.id)
        : character.spells.find((s) => s.id === request.id);
  if (!source) return fail('not_found', 'Действие не найдено');
  const slot = source.actionType;
  const free = slot === 'passive';
  if (free && !(request.kind === 'ability' && isUsable(source as Ability))) {
    return fail('passive', `«${source.name}» — пассивная способность`);
  }
  const spell = request.kind === 'spell' ? (source as Character['spells'][number]) : undefined;
  const ritual = !!request.asRitual && !!spell;
  if (ritual) {
    if (!spell!.ritual) return fail('not_ritual', `«${source.name}» нельзя сотворить ритуалом`);
    if (request.trackActionEconomy) return fail('not_ritual', 'Ритуал идёт на 10 минут дольше — не в ход боя');
    // A Wizard casts a ritual straight from the spellbook; everyone else from what they prepared.
    if (!spell!.prepared && !character.ritualsFromBook) return fail('not_prepared', `Заклинание «${source.name}» не подготовлено`);
  } else if (spell && !spell.prepared) {
    return fail('not_prepared', `Заклинание «${source.name}» не подготовлено`);
  }
  // Rage and Wild Shape forbid spells while they are on.
  const blocker = spell ? spellBlocker(character) : undefined;
  if (blocker) return fail('blocked_by_feature', `Пока действует «${blocker.name}», заклинания не творятся`);
  const stance = request.kind === 'ability' && (source as Ability).stance ? (source as Ability) : undefined;
  if (stance && isActiveFeature(character, stance.id)) return fail('already_active', `«${source.name}» уже действует`);

  let next = character;
  const costs: PerformActionCosts = {};

  // An attack of the Attack action: with Extra Attack the next ones belong to the action already taken.
  const strike = request.kind === 'attack' && slot === 'action' && attacksPerActionOf(next) > 1;
  let strikeNote = '';
  if (request.trackActionEconomy && !free) {
    if (strike && strikesLeft(next) > 0) {
      const strikes = (spentActionsOf(next).strikes ?? 0) + 1;
      next = { ...next, spentActions: { ...spentActionsOf(next), strikes } };
      strikeNote = ` · ${strikeOf(strikes, attacksPerActionOf(next))}`;
    } else {
      if (remainingActions(next, slot as ActionSlot) === 0) {
        return fail('no_action_left', `Не осталось действий: ${ACTION_SLOT_NAMES[slot]}`);
      }
      next = setSpentActions(next, slot as ActionSlot, spentActionsOf(next)[slot as ActionSlot] + 1);
      if (strike) {
        next = { ...next, spentActions: { ...spentActionsOf(next), strikes: 1 } };
        strikeNote = ` · ${strikeOf(1, attacksPerActionOf(next))}`;
      }
      costs.slot = slot as ActionSlot;
    }
  }

  // A spell cast with a chosen slot spends that slot instead of the one of its own level.
  const chosenSlot =
    request.kind === 'spell' && request.slotLevel !== undefined ? slotPoolFor(next, source as Spell, request.slotLevel)?.id : undefined;
  // A ritual takes no slot.
  const ability = request.kind === 'ability' ? (source as Ability) : undefined;
  // A conversion (Font of Magic) moves a slot and points together, below.
  const resourceId = ritual || ability?.convert ? undefined : (chosenSlot ?? ('resourceId' in source ? source.resourceId : undefined));
  let overdrawn = false;
  if (resourceId) {
    const base = ('resourceCost' in source ? source.resourceCost : undefined) ?? 1;
    // An ability of a chosen cost (Lay on Hands) spends what the player asked, within its bounds.
    const amount = ability?.resourceCostMax
      ? Math.min(ability.resourceCostMax, Math.max(base, Math.trunc(request.resourceAmount ?? base)))
      : base;
    const resource = next.resources.find((r) => r.id === resourceId);
    if (!resource) return fail('not_enough_resource', 'Ресурс для действия не найден');
    // With the pool empty, an ability that allows it is paid in hit points instead (a Blood Rite).
    if (resource.current < amount && ability?.hpCostWhenSpent) overdrawn = true;
    else if (resource.current < amount) {
      return fail('not_enough_resource', `Недостаточно ресурса «${resource.name}»: нужно ${amount}, есть ${resource.current}`);
    } else {
      next = changeResource(next, resourceId, -amount)!.character;
      costs.resource = { id: resource.id, name: resource.name, amount };
    }
  }

  let conversion = '';
  if (ability?.convert && ability.resourceId) {
    const converted = convertSlot(next, ability.resourceId, ability.convert, request.conversionLevel ?? 0);
    if (!converted) return fail('not_enough_resource', `«${source.name}»: так сейчас нельзя`);
    next = converted;
    const level = request.conversionLevel;
    const points = ability.convert === 'slotToPoints' ? level : SLOT_CREATION_COST[(level ?? 1) - 1];
    conversion = ability.convert === 'slotToPoints' ? `ячейка ${level} круга → очки +${points}` : `очки −${points} → ячейка ${level} круга`;
  }

  if (request.kind === 'attack' && (source as Attack).usesAmmunition) {
    const attack = source as Attack;
    const amount = attack.ammunitionCost ?? 1;
    const ammunition = request.ammunitionItemId
      ? next.inventory.find((item) => item.id === request.ammunitionItemId && item.type === 'ammunition')
      : resolveAmmunition(next, attack);
    if (!ammunition)
      return ammunitionChoices(next).length > 0
        ? fail('ammunition_unresolved', 'Выберите, чем стрелять')
        : fail('not_enough_ammunition', 'Нет боеприпасов');
    if (itemQuantity(ammunition) < amount) {
      return fail('not_enough_ammunition', `Недостаточно боеприпасов «${ammunition.name}»`);
    }
    next = changeItemQuantity(next, ammunition.id, -amount);
    costs.ammunition = { id: ammunition.id, name: ammunition.name, amount };
  }

  // A throw spends one from a counted stack of the weapon (javelins, darts); a lone dagger is picked up.
  if (request.kind === 'attack' && (source as Attack).thrown) {
    const weapon = next.inventory.find((item) => item.id === (source as Attack).weaponId);
    if (weapon && isWeaponStack(weapon)) {
      if (itemQuantity(weapon) < 1) return fail('not_enough_ammunition', `Не осталось: ${weapon.name}`);
      next = changeItemQuantity(next, weapon.id, -1);
      costs.ammunition = { id: weapon.id, name: weapon.name, amount: 1 };
    }
  }

  // A spell or ability that needs concentration starts it, ending any other.
  const concentrates = request.kind !== 'attack' && 'concentration' in source && !!source.concentration;
  if (concentrates) next = startConcentration(next, { kind: request.kind as 'spell' | 'ability', id: source.id, name: source.name });
  // An ability that is on until ended (Rage) turns on.
  if (stance) next = startFeature(next, stance);
  // Hit points it costs come last: falling to 0 by them ends what has just started.
  // Each cost is rolled on its own: an empowered rite with no free use left is two sacrifices.
  const amplified = !!request.amplify && !!ability?.amplify;
  const hitPointCosts = [ability?.hpCost, overdrawn ? ability?.hpCostWhenSpent : undefined, amplified ? ability?.amplify?.hpCost : undefined];
  for (const cost of hitPointCosts) {
    if (!cost) continue;
    const payment = payHitPoints(next, cost, request.random);
    next = payment.character;
    costs.hitPoints = (costs.hitPoints ?? 0) + payment.paid;
    if (cost.lowersMax) costs.maxHitPoints = (costs.maxHitPoints ?? 0) + payment.paid;
  }

  const paid = [
    conversion,
    costs.resource && `${costs.resource.name} −${costs.resource.amount}`,
    costs.ammunition && `${costs.ammunition.name} −${costs.ammunition.amount}`,
    costs.hitPoints !== undefined && `хиты −${costs.hitPoints}${costs.maxHitPoints ? ' (и максимум)' : ''}`,
  ].filter(Boolean);
  const verb = request.kind === 'attack' ? 'Атака' : ritual ? 'Ритуал' : request.kind === 'spell' ? 'Заклинание' : 'Способность';
  const message = `${verb}: ${source.name}${amplified ? ' (усилено)' : ''}${paid.length ? ` (${paid.join(', ')})` : ''}${strikeNote}${concentrates ? ' · концентрация' : ''}${stance ? ' · действует' : ''}`;

  return { ok: true, character: next, costs, message };
}
