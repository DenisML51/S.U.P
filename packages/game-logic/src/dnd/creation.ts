import type { Build, CharacterDraft, InventoryItem } from '@itd/schema';
import { attributeScore } from '../rules/abilities';
import { buildNewCharacter, startingAttributes, startingSkills } from '../rules/creation';
import { getDefaultLimbs } from '../rules/health';
import { experienceForLevel } from '../rules/progression';
import { applyBuild, findBackground, findClass } from './build';
import { DND } from './content';
import type { KitOption } from './types';

/** A starting kit option of the build's class or background, by its id. */
export const classKit = (build: Pick<Build, 'class'>, id: string | undefined): KitOption | undefined =>
  findClass(build.class)?.startingEquipment.find((kit) => kit.id === id);
export const backgroundKit = (build: Pick<Build, 'background'>, id: string | undefined): KitOption | undefined =>
  findBackground(build.background)?.equipment.find((kit) => kit.id === id);

let serial = 0;
const itemId = (ref: string) => `item-${ref}-${Date.now().toString(36)}-${(serial += 1)}`;

/** Inventory entries of a starting kit; weapons and armour carry their table stats and their content id. */
export function kitItems(kit: KitOption): InventoryItem[] {
  return kit.items.flatMap(({ ref, quantity = 1 }): InventoryItem[] => {
    const weapon = DND.weapons.find((w) => w.id === ref);
    if (weapon) {
      const mastery = DND.masteries.find((m) => m.id === weapon.mastery);
      return [
        {
          id: itemId(ref),
          ref,
          name: weapon.name,
          type: 'weapon',
          equipped: false,
          weight: weapon.weight,
          cost: weapon.cost,
          quantity: quantity > 1 ? quantity : undefined,
          itemClass: weapon.category === 'simple' ? 'Простое оружие' : 'Воинское оружие',
          weaponClass: weapon.kind,
          damage: weapon.damage,
          damageType: weapon.damageType,
          ammunitionType: weapon.ammunition,
          description: [weapon.properties.join(', '), mastery && `Мастерство: ${mastery.name}`].filter(Boolean).join('\n\n'),
        },
      ];
    }
    const armor = DND.armor.find((a) => a.id === ref);
    if (armor) {
      return [
        {
          id: itemId(ref),
          ref,
          name: armor.name,
          type: 'armor',
          equipped: false,
          weight: armor.weight,
          cost: armor.cost,
          itemClass: { light: 'Лёгкий доспех', medium: 'Средний доспех', heavy: 'Тяжёлый доспех', shield: 'Щит' }[armor.category],
          baseAC: armor.category === 'shield' ? undefined : armor.baseAC,
          dexModifier: armor.dexModifier,
          maxDexModifier: armor.maxDex,
          description: [
            armor.strength && `Требуется Сила ${armor.strength}.`,
            armor.stealthDisadvantage && 'Помеха на проверки Ловкости (Скрытность).',
          ]
            .filter(Boolean)
            .join(' '),
        },
      ];
    }
    const gear = DND.gear.find((g) => g.id === ref);
    if (!gear) return [];
    return [
      {
        id: itemId(ref),
        ref,
        name: gear.name,
        type: gear.kind === 'ammunition' ? 'ammunition' : 'item',
        equipped: false,
        weight: gear.weight,
        cost: gear.cost,
        quantity,
        description: [gear.description, gear.contents && `Содержит: ${gear.contents.join(', ')}.`].filter(Boolean).join('\n\n'),
      },
    ];
  });
}

export interface DndHeroInput {
  name: string;
  build: Build;
  classKitId?: string;
  backgroundKitId?: string;
}

/**
 * A new hero from the D&D presets: the sheet of the build at its level, the starting kits of the
 * class and background in the inventory and their gold in the purse.
 */
export function createDndHero({ name, build, classKitId, backgroundKitId }: DndHeroInput): CharacterDraft {
  const base = buildNewCharacter({
    name,
    race: '',
    class: '',
    subclass: '',
    attributes: startingAttributes(),
    skills: startingSkills(),
    savingThrowProficiencies: [],
  });
  const { character } = applyBuild(base, build);
  const kits = [classKit(build, classKitId), backgroundKit(build, backgroundKitId)].filter((kit): kit is KitOption => !!kit);
  const gold = kits.reduce((sum, kit) => sum + kit.gold, 0);
  return {
    ...character,
    currentHP: character.maxHP,
    experience: experienceForLevel(build.level),
    limbs: getDefaultLimbs(character.maxHP, attributeScore(character, 'constitution'), character.armorClass),
    inventory: kits.flatMap(kitItems),
    currency: { ...character.currency, gold: character.currency.gold + gold },
  };
}
