import { isStackable, itemQuantity, remainingActions, resolveAmmunition } from '@itd/game-logic';
import type { ActionType, Character, InventoryItem } from '@itd/schema';
import { ACTION_TYPES } from '../../ui/actionTypes';
import { damageParts, describeDamage } from '../sheet/parts/damage';
import type { EntryKind } from '../sheet/dialogs/context';

export type SlotGroup = 'attacks' | 'abilities' | 'spells' | 'items';

export const SLOT_GROUPS: { id: SlotGroup; label: string }[] = [
  { id: 'attacks', label: 'Атаки' },
  { id: 'abilities', label: 'Умения' },
  { id: 'spells', label: 'Магия' },
  { id: 'items', label: 'Вещи' },
];

/** One button of the combat bar: something the hero can do right now, and whether they can. */
export interface Slot {
  key: string;
  kind: EntryKind;
  id: string;
  name: string;
  /** Short facts under the name: damage, cost, quantity. */
  detail: string;
  actionType?: ActionType;
  /** Spell circle, shown in the corner. */
  level?: number;
  /** Why it cannot be used now, if it cannot. */
  blocked: string | null;
  description: string;
}

const costText = (character: Character, resourceId?: string, cost?: number) => {
  const resource = resourceId ? character.resources.find((r) => r.id === resourceId) : undefined;
  return resource ? `${cost ?? 1} ${resource.name}` : '';
};

/** Reasons shared by everything that takes an action and may cost a resource. */
function blockedBy(
  character: Character,
  inCombat: boolean,
  actionType: ActionType,
  resourceId?: string,
  cost = 1,
): string | null {
  if (actionType === 'passive') return null;
  if (inCombat && remainingActions(character, actionType) === 0)
    return `Не осталось: ${ACTION_TYPES[actionType].short}`;
  if (resourceId) {
    const resource = character.resources.find((r) => r.id === resourceId);
    if (!resource) return 'Ресурс не найден';
    if (resource.current < cost) return `Не хватает: ${resource.name}`;
  }
  return null;
}

const usableItem = (item: InventoryItem) => item.type === 'item' && isStackable(item);

/** The combat bar's buttons by group, with what blocks each of them right now. */
export function buildSlots(character: Character, inCombat: boolean): Record<SlotGroup, Slot[]> {
  const attacks = character.attacks.map((attack): Slot => {
    let blocked = blockedBy(character, inCombat, attack.actionType);
    if (!blocked && attack.usesAmmunition) {
      const ammunition = resolveAmmunition(character, attack);
      if (ammunition && itemQuantity(ammunition) < (attack.ammunitionCost ?? 1))
        blocked = `Кончились: ${ammunition.name}`;
    }
    return {
      key: `attack:${attack.id}`,
      kind: 'attack',
      id: attack.id,
      name: attack.name,
      detail: [`${attack.hitBonus >= 0 ? '+' : ''}${attack.hitBonus}`, describeDamage(damageParts(attack))]
        .filter(Boolean)
        .join(' · '),
      actionType: attack.actionType,
      blocked,
      description: attack.description ?? '',
    };
  });

  const abilities = character.abilities
    .filter((a) => a.actionType !== 'passive')
    .map((ability): Slot => ({
      key: `ability:${ability.id}`,
      kind: 'ability',
      id: ability.id,
      name: ability.name,
      detail: [
        costText(character, ability.resourceId, ability.resourceCost),
        describeDamage(damageParts(ability)),
      ]
        .filter(Boolean)
        .join(' · '),
      actionType: ability.actionType,
      blocked: blockedBy(
        character,
        inCombat,
        ability.actionType,
        ability.resourceId,
        ability.resourceCost ?? 1,
      ),
      description: ability.effect || ability.description,
    }));

  const spells = character.spells
    .filter((s) => s.prepared)
    .sort((a, b) => a.level - b.level)
    .map((spell): Slot => ({
      key: `spell:${spell.id}`,
      kind: 'spell',
      id: spell.id,
      name: spell.name,
      detail: [costText(character, spell.resourceId, spell.resourceCost), describeDamage(damageParts(spell))]
        .filter(Boolean)
        .join(' · '),
      actionType: spell.actionType,
      level: spell.level,
      blocked: blockedBy(character, inCombat, spell.actionType, spell.resourceId, spell.resourceCost ?? 1),
      description: spell.effect || spell.description,
    }));

  const items = character.inventory.filter(usableItem).map((item): Slot => ({
    key: `item:${item.id}`,
    kind: 'item',
    id: item.id,
    name: item.name,
    detail: `${itemQuantity(item)} шт.`,
    blocked: itemQuantity(item) <= 0 ? 'Закончилось' : null,
    description: item.description,
  }));

  return { attacks, abilities, spells, items };
}
