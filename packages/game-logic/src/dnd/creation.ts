import type { Build, Character, CharacterDraft, InventoryItem } from '@itd/schema';
import { attributeScore } from '../rules/abilities';
import { isShield } from '../rules/armor';
import { buildNewCharacter, startingAttributes, startingSkills } from '../rules/creation';
import { getDefaultLimbs } from '../rules/health';
import { equipItem } from '../rules/inventory';
import { rollDie } from '../rules/dice';
import { experienceForLevel } from '../rules/progression';
import { maxSanityOf } from '../rules/sanity';
import { applyBuild, findBackground, findClass, spellcastingOf, type OpenChoice } from './build';
import { DND } from './content';
import { DND_ICONS, armorIcon, gearIcon } from './content/icons';
import type { KitOption } from './types';

/** A starting kit option of the build's class or background, by its id. */
export const classKit = (build: Pick<Build, 'class'>, id: string | undefined): KitOption | undefined =>
  findClass(build.class)?.startingEquipment.find((kit) => kit.id === id);
export const backgroundKit = (build: Pick<Build, 'background'>, id: string | undefined): KitOption | undefined =>
  findBackground(build.background)?.equipment.find((kit) => kit.id === id);

/** Gear that is used up in play: it gets a count, and the hotbar offers it among the items. */
const CONSUMABLE_GEAR = new Set(['caltrops', 'candle', 'healers-kit', 'holy-water', 'oil', 'rations', 'torch']);

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
          iconName: DND_ICONS.weapons[weapon.id],
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
          iconName: armorIcon(armor),
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
        // Only what gets used up is counted (and shows on the hotbar as a consumable).
        quantity: gear.kind === 'ammunition' || CONSUMABLE_GEAR.has(ref) || quantity > 1 ? quantity : undefined,
        iconName: gearIcon(gear),
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
  const base = skeleton(name);
  const built = applyBuild(base, build).character;
  const kits = [classKit(build, classKitId), backgroundKit(build, backgroundKitId)].filter((kit): kit is KitOption => !!kit);
  const gold = kits.reduce((sum, kit) => sum + kit.gold, 0);
  const inventory = kits.flatMap(kitItems);
  let hero = {
    ...built,
    currentHP: built.maxHP,
    experience: experienceForLevel(build.level),
    limbs: getDefaultLimbs(built.maxHP, attributeScore(built, 'constitution')),
    inventory,
    currency: { ...built.currency, gold: built.currency.gold + gold },
  };
  // The hero sets out dressed: the first body armour, a shield and the first weapon are worn.
  const worn = [
    inventory.find((i) => i.type === 'armor' && !isShield(i)),
    inventory.find((i) => isShield(i)),
    inventory.find((i) => i.type === 'weapon'),
  ].filter((i): i is InventoryItem => !!i);
  for (const item of worn) hero = equipItem(hero as Character, item.id);
  // Attack bonuses of the new weapon attacks follow the build; the spells chosen at creation start prepared.
  const result = applyBuild(hero, build).character;
  const prepared = new Set(build.choices[PREPARED_AT_CREATION] ?? []);
  return {
    ...result,
    sanity: maxSanityOf(result),
    spells: result.spells.map((s) => (prepared.has(s.id.replace(/^spell-/, '')) ? { ...s, prepared: true } : s)),
  };
}

/**
 * Key in `build.choices` of the spells a preparing caster (paladin) starts with prepared. They are
 * not part of the build's rules: after creation the player changes them on the sheet.
 */
export const PREPARED_AT_CREATION = 'creation:prepared';

/** The pick of starting prepared spells, as a choice the creation screen can show. */
export function preparedSpellsChoice(build: Build): OpenChoice | null {
  const casting = spellcastingOf(build);
  if (casting?.mode !== 'prepared') return null;
  const level = build.level;
  const count = applyBuild(skeleton('—'), build).character.maxPreparedSpells.total ?? 0;
  const maxLevel = casting.slots[level - 1]?.length ?? 0;
  const feature = { id: 'creation.prepared', name: 'Использование заклинаний', description: '' };
  return {
    key: PREPARED_AT_CREATION,
    count,
    picked: build.choices[PREPARED_AT_CREATION] ?? [],
    level,
    choice: {
      id: 'prepared',
      label: 'Подготовленные заклинания',
      count,
      options: { from: 'spells', lists: [casting.list], minLevel: 1, maxLevel },
      hint: 'Список можно менять после продолжительного отдыха, на листе в разделе «Магия».',
    },
    owner: { key: 'creation', feature, level, source: 'class' },
  };
}

/** An empty first-level sheet the build is written onto. */
const skeleton = (name: string) =>
  buildNewCharacter({
    name,
    race: '',
    class: '',
    subclass: '',
    attributes: startingAttributes(),
    skills: startingSkills(),
    savingThrowProficiencies: [],
  });

/** Six ability scores rolled the classic way: 4d6, the lowest die dropped. */
export function rollAbilityScores(random: () => number = Math.random): number[] {
  return Array.from({ length: 6 }, () => {
    const dice = Array.from({ length: 4 }, () => rollDie(6, random)).sort((a, b) => a - b);
    return dice[1]! + dice[2]! + dice[3]!;
  });
}

/** An empty D&D 2024 build: nothing chosen, every score 8 for point buy. */
export const emptyBuild = (): Build => ({
  ruleset: 'dnd2024',
  species: '',
  background: '',
  class: '',
  abilityMethod: 'pointBuy',
  baseAttributes: startingAttributes(),
  backgroundBonuses: {},
  choices: {},
  hitPoints: [],
  level: 1,
});

/** Picks under a root of the build (`species`, `background`, `class`…) are forgotten when it changes. */
export const withoutPicks = (build: Build, ...roots: string[]): Build => ({
  ...build,
  choices: Object.fromEntries(Object.entries(build.choices).filter(([key]) => !roots.some((root) => key.startsWith(`${root}:`)))),
});

/** The background's ability increases are valid as +2/+1 to two of its scores or +1 to all three. */
export function validBackgroundBonuses(build: Build): boolean {
  const background = findBackground(build.background);
  if (!background) return false;
  const values = Object.entries(build.backgroundBonuses).filter(([, v]) => v > 0);
  if (values.some(([id]) => !background.abilities.includes(id as never))) return false;
  const sorted = values.map(([, v]) => v).sort();
  return sorted.join() === '1,2' || sorted.join() === '1,1,1';
}
