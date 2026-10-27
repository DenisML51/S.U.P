import type { Character, InventoryItem, Limb, LimbArmor } from '@itd/schema';
import { BASE_ARMOR_CLASS, SHIELD_ARMOR_BONUS } from '../content/progression';
import { attributeModifier } from './abilities';

/** Shields are ordinary items recognised by name; the sheet has no dedicated item type for them. */
export const isShield = (item: Pick<InventoryItem, 'name'>): boolean => {
  const name = item.name.toLowerCase();
  return name.includes('щит') || name.includes('shield');
};

export const equippedArmor = (inventory: readonly InventoryItem[]): InventoryItem | undefined =>
  inventory.find((item) => item.type === 'armor' && item.equipped && !isShield(item));

/** One term of an armour class: "броня 16", "ЛВК 2", "щит 2". */
export interface ArmorClassPart {
  label: string;
  value: number;
}

/** An armour class and what it is made of, for showing the sum ("броня 16 + ЛВК 2 = 18"). */
export interface ArmorClassBreakdown {
  parts: ArmorClassPart[];
  total: number;
}

type ArmorSource = Pick<Character, 'inventory' | 'attributes' | 'attributeBonuses'> &
  Partial<Pick<Character, 'armorClassBonus'>>;

/** The first term (the base) always shows; the others only when they change something. */
const breakdown = (parts: ArmorClassPart[]): ArmorClassBreakdown => {
  const shown = parts.filter((part, index) => index === 0 || part.value !== 0);
  return { parts: shown, total: shown.reduce((sum, part) => sum + part.value, 0) };
};

const MANUAL_LABEL = 'бонус';

const ABILITY_LABELS: Record<string, string> = {
  strength: 'СИЛ',
  dexterity: 'ЛВК',
  constitution: 'ТЕЛ',
  intelligence: 'ИНТ',
  wisdom: 'МДР',
  charisma: 'ХАР',
};

/** Heavy armour adds none of the wearer's Dexterity; that is how a sheet's armour tells it apart. */
export const wearsHeavyArmor = (character: Pick<Character, 'inventory'>): boolean => equippedArmor(character.inventory)?.dexModifier === false;

const hasShield = (character: ArmorSource): boolean => character.inventory.some((item) => item.equipped && isShield(item));

/**
 * Unarmoured: 10 + Dexterity, plus features that always apply. Unarmored Defense adds an ability
 * (Constitution, Wisdom) unless it is lost to a shield.
 */
const unarmoredParts = (character: ArmorSource): ArmorClassPart[] => {
  const bonus = character.armorClassBonus;
  const unarmored = bonus?.unarmored && !(bonus.unarmoredNoShield && hasShield(character)) ? bonus.unarmored : undefined;
  return [
    { label: 'основа', value: BASE_ARMOR_CLASS },
    { label: 'ЛВК', value: attributeModifier(character, 'dexterity') },
    ...(unarmored ? [{ label: ABILITY_LABELS[unarmored] ?? unarmored, value: attributeModifier(character, unarmored) }] : []),
    { label: 'особенности', value: (bonus?.always ?? 0) + (bonus?.noHeavyArmor ?? 0) },
  ];
};

/**
 * Armour class from equipment and features: worn armour sets the base (and how much Dexterity
 * applies), an equipped shield adds a flat bonus; without armour it is 10 + Dexterity. Features
 * (a fighting style) add their bonus.
 */
function gearParts(character: ArmorSource): ArmorClassPart[] {
  // A beast's shape has its own armour class; what the druid wore merges into the form.
  const form = character.armorClassBonus?.form;
  if (form) return [{ label: 'облик', value: form }];
  const armor = equippedArmor(character.inventory);
  const shield = hasShield(character);
  const shieldPart = { label: 'щит', value: shield ? SHIELD_ARMOR_BONUS : 0 };
  if (!armor) return [...unarmoredParts(character), shieldPart];

  const dexterity = attributeModifier(character, 'dexterity');
  const cap = armor.maxDexModifier;
  const appliedDexterity = !armor.dexModifier ? 0 : cap === null || cap === undefined ? dexterity : Math.min(dexterity, cap);
  const bonus = character.armorClassBonus;
  return [
    { label: 'броня', value: armor.baseAC ?? BASE_ARMOR_CLASS },
    { label: 'ЛВК', value: appliedDexterity },
    shieldPart,
    { label: 'особенности', value: (bonus?.always ?? 0) + (bonus?.armored ?? 0) + (armor.dexModifier === false ? 0 : (bonus?.noHeavyArmor ?? 0)) },
  ];
}

/** Armour class the gear and features give, before the player's own modifier. */
export const calculateArmorClass = (character: ArmorSource): number => breakdown(gearParts(character)).total;

/** The hero's armour class and its terms, the player's modifier included. */
export const armorClassBreakdown = (character: ArmorSource): ArmorClassBreakdown =>
  breakdown([...gearParts(character), { label: MANUAL_LABEL, value: character.armorClassBonus?.manual ?? 0 }]);

/** The hero's armour class: gear, features and the player's modifier. */
export const armorClassOf = (character: ArmorSource): number => armorClassBreakdown(character).total;

/**
 * A limb's armour class before its own modifier: the worn armour's value for the limb when it sets
 * one, otherwise 10 + Dexterity as for an unarmoured hero. A shield protects the hero, not a limb.
 */
function limbGearParts(character: ArmorSource, limbId: string): ArmorClassPart[] {
  const fromArmor = equippedArmor(character.inventory)?.limbACs?.[limbId as keyof LimbArmor];
  return fromArmor ? [{ label: 'броня', value: fromArmor }] : unarmoredParts(character);
}

export const limbArmorClassBreakdown = (
  character: ArmorSource,
  limb: Pick<Limb, 'id' | 'acBonus'>,
): ArmorClassBreakdown => breakdown([...limbGearParts(character, limb.id), { label: MANUAL_LABEL, value: limb.acBonus ?? 0 }]);

export const limbArmorClassOf = (character: ArmorSource, limb: Pick<Limb, 'id' | 'acBonus'>): number =>
  limbArmorClassBreakdown(character, limb).total;

/** Sets the player's modifier of the hero's armour class. */
export const setArmorClassBonus = (character: Character, manual: number): Character => ({
  ...character,
  armorClassBonus: { always: 0, armored: 0, ...character.armorClassBonus, manual: Math.trunc(manual) },
});

/**
 * Sheets saved before armour class was derived stored only the total, for the hero and each limb.
 * The difference from what the gear gives becomes the player's modifier, so the numbers the sheet
 * showed stay. A stored limb value of 0 is what unequipping armour used to leave, not a choice: it
 * reads as no modifier.
 */
export function deriveArmorClassBonuses(character: Character): Character {
  const hero =
    character.armorClassBonus?.manual === undefined
      ? setArmorClassBonus(character, character.armorClass - calculateArmorClass(character))
      : character;
  if (hero.limbs.every((limb) => limb.acBonus !== undefined)) return hero;
  return {
    ...hero,
    limbs: hero.limbs.map((limb) =>
      limb.acBonus !== undefined
        ? limb
        : { ...limb, acBonus: limb.ac === 0 ? 0 : limb.ac - breakdown(limbGearParts(hero, limb.id)).total },
    ),
  };
}
