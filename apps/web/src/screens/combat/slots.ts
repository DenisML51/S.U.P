import {
  attacksPerActionOf,
  formatModifier,
  isActiveFeature,
  isStackable,
  isWeaponStack,
  itemQuantity,
  remainingActions,
  resolveAmmunition,
  spellColor,
  isUsable,
  strikesLeft,
} from '@itd/game-logic';
import type { ActionType, Character, InventoryItem } from '@itd/schema';
import { ACTION_TYPES } from '../../ui/actionTypes';
import { itemClassName } from '../../ui/characterLabels';
import type { GameIconId, IconKind } from '../../ui/GameIcon';
import { damageFact as damageLine, damageParts, hitLabel, spellDamageParts } from '../sheet/parts/damage';
import type { EntryKind } from '../sheet/dialogs/context';
import { tIn } from '../../i18n';

export type SlotGroup = 'attacks' | 'abilities' | 'spells' | 'items';

export const SLOT_GROUPS: { id: SlotGroup; label: string; icon: GameIconId; empty: string }[] = [
  { id: 'attacks', label: 'Атаки', icon: 'crossed-swords', empty: 'Нет атак' },
  { id: 'abilities', label: 'Умения', icon: 'sparkles', empty: 'Нет активных умений' },
  { id: 'spells', label: tIn('ui', 'Магия'), icon: 'spell-book', empty: 'Нет подготовленных заклинаний' },
  { id: 'items', label: 'Вещи', icon: 'swap-bag', empty: 'Нет расходуемых вещей' },
];

/** One icon of the combat bar: something the hero can do right now, and whether they can. */
export interface Slot {
  key: string;
  kind: EntryKind & IconKind;
  id: string;
  name: string;
  iconName?: string;
  color?: string;
  /** Under the name in the hint: "Атака оружием", "Воплощение · 3 круг". */
  subtitle: string;
  /** Figures of the hint: "Попадание +7", "Урон 2d6 огонь". */
  facts: [string, string][];
  actionType?: ActionType;
  /** Spell circle, in the icon's corner. */
  level?: number;
  /** How many are left, in the icon's corner: items and ammunition. */
  count?: number;
  /** Why it cannot be used now, if it cannot. */
  blocked: string | null;
  /** An ability that is on (Rage): using the slot ends it. */
  active?: boolean;
  description: string;
  effect?: string;
}

const costFact = (character: Character, resourceId?: string, cost?: number): [string, string] | null => {
  const resource = resourceId ? character.resources.find((r) => r.id === resourceId) : undefined;
  return resource ? ['Стоимость', `${cost ?? 1} ${resource.name} (есть ${resource.current})`] : null;
};

const damageFact = (entry: Parameters<typeof damageParts>[0]) => damageLine(damageParts(entry));

const facts = (...list: ([string, string] | null | false | undefined)[]) =>
  list.filter((f): f is [string, string] => !!f && f[1].trim() !== '');

/** Reasons shared by everything that takes an action and may cost a resource. */
function blockedBy(
  character: Character,
  inCombat: boolean,
  actionType: ActionType,
  resourceId?: string,
  cost = 1,
): string | null {
  if (actionType !== 'passive' && inCombat && remainingActions(character, actionType) === 0)
    return `Не осталось: ${ACTION_TYPES[actionType].short}`;
  if (resourceId) {
    const resource = character.resources.find((r) => r.id === resourceId);
    if (!resource) return 'Ресурс не найден';
    if (resource.current < cost) return `Не хватает: ${resource.name}`;
  }
  return null;
}

const usableItem = (item: InventoryItem) => item.type === 'item' && isStackable(item);

/** The combat bar's icons by group, with what blocks each of them right now. */
export function buildSlots(character: Character, inCombat: boolean): Record<SlotGroup, Slot[]> {
  const attacks = character.attacks.map((attack): Slot => {
    // The next attack of an Attack action already taken (Extra Attack) needs no action of its own.
    const followUp = attack.actionType === 'action' && strikesLeft(character) > 0;
    let blocked = followUp ? null : blockedBy(character, inCombat, attack.actionType);
    const ammunition = attack.usesAmmunition ? resolveAmmunition(character, attack) : undefined;
    if (!blocked && ammunition && itemQuantity(ammunition) < (attack.ammunitionCost ?? 1))
      blocked = `Кончились: ${ammunition.name}`;
    const weapon = attack.weaponId ? character.inventory.find((i) => i.id === attack.weaponId) : undefined;
    // A throw from a counted stack (javelins, darts) counts down the weapon itself.
    const thrownStack = attack.thrown && weapon && isWeaponStack(weapon) ? weapon : undefined;
    if (!blocked && thrownStack && itemQuantity(thrownStack) < 1) blocked = `Кончились: ${thrownStack.name}`;
    return {
      key: `attack:${attack.id}`,
      kind: 'attack',
      id: attack.id,
      name: attack.name,
      iconName: attack.iconName,
      color: attack.color,
      subtitle: weapon ? `Атака оружием · ${weapon.name}` : 'Приём',
      facts: facts(
        ['Попадание', formatModifier(attack.hitBonus)],
        damageFact(attack),
        attack.actionType === 'action' && attacksPerActionOf(character) > 1 && ['Атак за действие', `${attacksPerActionOf(character)}`],
        ammunition && ['Боеприпасы', `${ammunition.name}: ${itemQuantity(ammunition)}`],
        thrownStack && ['Осталось', `${itemQuantity(thrownStack)}`],
        !!attack.damageTwoHanded && ['Двумя руками', attack.damageTwoHanded],
      ),
      actionType: attack.actionType,
      count: ammunition ? itemQuantity(ammunition) : thrownStack ? itemQuantity(thrownStack) : undefined,
      blocked,
      description: attack.description ?? '',
    };
  });

  const abilities = character.abilities
    .filter(isUsable)
    .map((ability): Slot => ({
      key: `ability:${ability.id}`,
      kind: 'ability',
      id: ability.id,
      name: ability.name,
      iconName: ability.iconName,
      color: ability.color,
      subtitle: isActiveFeature(character, ability.id) ? 'Умение · действует' : 'Умение',
      active: isActiveFeature(character, ability.id) || undefined,
      facts: facts(
        costFact(character, ability.resourceId, ability.resourceCost),
        damageFact(ability),
        ['Попадание', hitLabel(character, ability) ?? ''],
      ),
      actionType: ability.actionType,
      // Ending what is on costs nothing.
      blocked: isActiveFeature(character, ability.id)
        ? null
        : blockedBy(character, inCombat, ability.actionType, ability.resourceId, ability.resourceCost ?? 1),
      description: ability.description,
      effect: ability.effect,
    }));

  const spells = character.spells
    .filter((s) => s.prepared)
    .sort((a, b) => a.level - b.level)
    .map((spell): Slot => ({
      key: `spell:${spell.id}`,
      kind: 'spell',
      id: spell.id,
      name: spell.name,
      iconName: spell.iconName,
      color: spellColor(spell),
      subtitle: [spell.school, spell.level === 0 ? 'заговор' : `${spell.level} круг`]
        .filter(Boolean)
        .join(' · '),
      facts: facts(
        ['Время', spell.castingTime],
        ['Дистанция', spell.range],
        ['Длительность', spell.duration],
        costFact(character, spell.resourceId, spell.resourceCost),
        damageLine(spellDamageParts(character, spell)),
        ['Попадание', hitLabel(character, spell, true) ?? ''],
      ),
      actionType: spell.actionType,
      level: spell.level,
      blocked: blockedBy(character, inCombat, spell.actionType, spell.resourceId, spell.resourceCost ?? 1),
      description: spell.description,
      effect: spell.effect,
    }));

  const items = character.inventory.filter(usableItem).map((item): Slot => ({
    key: `item:${item.id}`,
    kind: 'item',
    id: item.id,
    name: item.name,
    iconName: item.iconName,
    color: item.color,
    subtitle: itemClassName(item.itemClass) || 'Расходуемое',
    facts: facts(['Осталось', `${itemQuantity(item)} шт.`], damageFact(item)),
    count: itemQuantity(item),
    blocked: itemQuantity(item) <= 0 ? 'Закончилось' : null,
    description: item.description,
  }));

  return { attacks, abilities, spells, items };
}
