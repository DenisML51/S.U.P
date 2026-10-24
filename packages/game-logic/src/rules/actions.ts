import type { ActionCounters, Attack, Character, InventoryItem } from '@itd/schema';
import { changeItemQuantity, itemQuantity } from './inventory';
import { changeResource } from './resources';

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

/** Marks how many actions of a kind are spent this turn, within 0..limit. */
export const setSpentActions = (character: Character, slot: ActionSlot, spent: number): Character => ({
  ...character,
  spentActions: {
    ...spentActionsOf(character),
    [slot]: Math.min(actionLimitsOf(character)[slot], Math.max(0, Math.trunc(spent))),
  },
});

/** Changes how many actions of a kind the character gets per turn (at least one). */
export function setActionLimit(character: Character, slot: ActionSlot, limit: number): Character {
  const limits = { ...actionLimitsOf(character), [slot]: Math.max(1, Math.trunc(limit)) };
  const spent = spentActionsOf(character);
  return { ...character, actionLimits: limits, spentActions: { ...spent, [slot]: Math.min(spent[slot], limits[slot]) } };
}

/** A new turn: every action is available again. */
export const resetTurn = (character: Character): Character => ({ ...character, spentActions: { ...NO_SPENT_ACTIONS } });

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
}

export type PerformActionFailure =
  | 'not_found'
  | 'passive'
  | 'not_prepared'
  | 'no_action_left'
  | 'not_enough_resource'
  | 'ammunition_unresolved'
  | 'not_enough_ammunition';

export interface PerformActionCosts {
  slot?: ActionSlot;
  resource?: { id: string; name: string; amount: number };
  ammunition?: { id: string; name: string; amount: number };
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
 * Ammunition a ranged attack draws from: the stack named after the weapon's ammunition type, or the
 * only stack the character carries. `null` when the choice is ambiguous or there is nothing to use.
 */
export function resolveAmmunition(character: Character, attack: Attack): InventoryItem | null {
  const stacks = character.inventory.filter((item) => item.type === 'ammunition');
  const weapon = attack.weaponId ? character.inventory.find((item) => item.id === attack.weaponId) : undefined;
  const wanted = weapon?.ammunitionType?.trim().toLowerCase();

  if (wanted) {
    const matching = stacks.filter((s) => s.name.toLowerCase().includes(wanted) || s.itemClass?.toLowerCase() === wanted);
    if (matching.length === 1) return matching[0]!;
    if (matching.length > 1) return null;
  }
  return stacks.length === 1 ? stacks[0]! : null;
}

/**
 * Uses an attack, ability or spell and pays for it: the resource it costs, the ammunition it fires
 * and, in combat, the action it takes. Nothing is spent unless everything can be paid.
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
  if (slot === 'passive') return fail('passive', `«${source.name}» — пассивная способность`);
  if (request.kind === 'spell' && !(source as Character['spells'][number]).prepared) {
    return fail('not_prepared', `Заклинание «${source.name}» не подготовлено`);
  }

  let next = character;
  const costs: PerformActionCosts = {};

  if (request.trackActionEconomy) {
    if (remainingActions(next, slot) === 0) {
      return fail('no_action_left', `Не осталось действий: ${ACTION_SLOT_NAMES[slot]}`);
    }
    next = setSpentActions(next, slot, spentActionsOf(next)[slot] + 1);
    costs.slot = slot;
  }

  // A spell cast with a chosen slot spends that slot instead of the one of its own level.
  const chosenSlot =
    request.kind === 'spell' && request.slotLevel !== undefined
      ? next.resources.find((r) => r.spellSlotLevel === request.slotLevel)?.id
      : undefined;
  const resourceId = chosenSlot ?? ('resourceId' in source ? source.resourceId : undefined);
  if (resourceId) {
    const amount = ('resourceCost' in source ? source.resourceCost : undefined) ?? 1;
    const resource = next.resources.find((r) => r.id === resourceId);
    if (!resource) return fail('not_enough_resource', 'Ресурс для действия не найден');
    if (resource.current < amount) {
      return fail('not_enough_resource', `Недостаточно ресурса «${resource.name}»: нужно ${amount}, есть ${resource.current}`);
    }
    next = changeResource(next, resourceId, -amount)!.character;
    costs.resource = { id: resource.id, name: resource.name, amount };
  }

  if (request.kind === 'attack' && (source as Attack).usesAmmunition) {
    const attack = source as Attack;
    const amount = attack.ammunitionCost ?? 1;
    const ammunition = request.ammunitionItemId
      ? next.inventory.find((item) => item.id === request.ammunitionItemId && item.type === 'ammunition')
      : resolveAmmunition(next, attack);
    if (!ammunition) return fail('ammunition_unresolved', 'Выберите боеприпасы для атаки');
    if (itemQuantity(ammunition) < amount) {
      return fail('not_enough_ammunition', `Недостаточно боеприпасов «${ammunition.name}»`);
    }
    next = changeItemQuantity(next, ammunition.id, -amount);
    costs.ammunition = { id: ammunition.id, name: ammunition.name, amount };
  }

  const paid = [
    costs.resource && `${costs.resource.name} −${costs.resource.amount}`,
    costs.ammunition && `${costs.ammunition.name} −${costs.ammunition.amount}`,
  ].filter(Boolean);
  const verb = request.kind === 'attack' ? 'Атака' : request.kind === 'spell' ? 'Заклинание' : 'Способность';
  const message = `${verb}: ${source.name}${paid.length ? ` (${paid.join(', ')})` : ''}`;

  return { ok: true, character: next, costs, message };
}
