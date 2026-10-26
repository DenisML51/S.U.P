import { z } from 'zod';

/**
 * Character document, schema version 1.
 *
 * The document is owned by its player and edited offline-first, so the schema is the contract
 * between every copy of it: browser storage, the API and exported files.
 *
 * - Fields with a sensible empty value carry a default, so parsing doubles as normalisation.
 * - Objects are "loose": unknown keys survive a round trip. Imported and hand-written sheets carry
 *   extra metadata (`meta`, `spellcasting`, ...) that must never be silently dropped.
 * - Every string and collection is bounded, because the API stores whatever passes this schema.
 */

export const CHARACTER_SCHEMA_VERSION = 1;

const LIMITS = {
  shortText: 500,
  longText: 200_000,
  /** Avatars are embedded as data URLs; ~3 MB covers a cropped JPEG with room to spare. */
  avatar: 4_000_000,
  collection: 1_000,
  history: 200,
} as const;

export const EntityIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/, 'Only latin letters, digits, "_" and "-" are allowed');

/**
 * Form inputs hand us `NaN` (`parseInt('')`), numeric strings and `null` (what `NaN` becomes after
 * `JSON.stringify`). Numbers are therefore coerced before validation: a numeric string becomes a
 * number, anything non-finite becomes `undefined` and falls back to the field default (or fails a
 * required field). Other types are passed through untouched so they still fail validation.
 */
const toNumber = (value: unknown): unknown => {
  if (value === null) return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }
  return value;
};
const nullToUndefined = (value: unknown): unknown => (value === null ? undefined : value);

/**
 * At runtime the object keeps unknown keys; its static type lists only the declared ones. Extra keys
 * are opaque passengers, and an index signature on the type would break `keyof`/`Omit` for every
 * consumer of these types.
 */
const passthroughObject = <S extends z.ZodRawShape>(shape: S) =>
  z.looseObject(shape) as unknown as ReturnType<typeof z.object<S>>;

const numeric = <T extends z.ZodType>(schema: T) => z.preprocess(toNumber, schema);
const text = <T extends z.ZodType>(schema: T) => z.preprocess(nullToUndefined, schema);

const int = z.number().int();
const num = z.number();
const shortString = z.string().max(LIMITS.shortText);
const longString = z.string().max(LIMITS.longText);

const shortText = text(shortString);
const shortTextOr = (fallback = '') => text(shortString.default(fallback));
const optionalShortText = text(shortString.optional());
const longTextOr = (fallback = '') => text(longString.default(fallback));
const optionalLongText = text(longString.optional());
const numberOr = (fallback: number) => numeric(num.default(fallback));
const optionalNumber = numeric(num.optional());
const flag = (fallback: boolean) => text(z.boolean().default(fallback));
const optionalFlag = text(z.boolean().optional());
const list = <T extends z.ZodType>(item: T) => text(z.array(item).max(LIMITS.collection).default([]));
const optionalList = <T extends z.ZodType>(item: T) => text(z.array(item).max(LIMITS.collection).optional());
/** Ids of nested entities are free-form: legacy sheets use arbitrary strings. */
const nestedId = z.string().min(1).max(200);
const optionalNestedId = text(nestedId.optional());

/** `passive` abilities exist in real sheets: they are always on and never spend an action. */
export const ActionTypeSchema = z.enum(['action', 'bonus', 'reaction', 'passive']);
export const ItemTypeSchema = z.enum(['armor', 'weapon', 'ammunition', 'item']);
export const WeaponClassSchema = z.enum(['melee', 'ranged']);
export const ResistanceLevelSchema = z.enum(['resistance', 'vulnerability', 'immunity', 'none']);
/** The universe a character comes from; drives the visual theme of the sheet. */
export const SETTINGS = ['high-fantasy', 'sci-fi', 'dark-fantasy', 'cyberpunk', 'lovecraft', 'elden-ring'] as const;
export const SettingSchema = z.enum(SETTINGS);
export const DEFAULT_SETTING: z.infer<typeof SettingSchema> = 'high-fantasy';
/** Settings that were merged into another one; documents saved with them read as their successor. */
const RETIRED_SETTINGS: Record<string, z.infer<typeof SettingSchema>> = { grimdark: 'dark-fantasy' };

/** When a resource comes back: on a short rest (and a long one), only on a long rest, or by hand. */
export const RecoverySchema = z.enum(['short', 'long', 'manual']);

export const HistoryEntryTypeSchema = z.enum(['health', 'sanity', 'resource', 'inventory', 'exp', 'other']);

export const DamageComponentSchema = passthroughObject({
  damage: shortTextOr(),
  type: shortTextOr(),
});

export const SkillSchema = passthroughObject({
  id: nestedId,
  name: shortText,
  attribute: shortText,
  proficient: flag(false),
  expertise: flag(false),
  /** A flat bonus a preset feature gives to checks of the skill (a Thaumaturge's Wisdom to Arcana). */
  bonus: optionalNumber,
});

export const ResourceSchema = passthroughObject({
  id: nestedId,
  name: shortText,
  iconName: shortTextOr(),
  current: numberOr(0),
  max: numberOr(0),
  description: longTextOr(),
  spellSlotLevel: optionalNumber,
  /** The pool is hit dice of this size (10 for d10): a short rest spends them to heal. */
  hitDie: optionalNumber,
  /** Which rest restores it; a short rest also counts as part of a long one. */
  recovery: text(RecoverySchema.default('long')),
  /** How much a short rest returns ("one use"); absent means all of it. A long rest always returns all. */
  recoveryAmount: optionalNumber,
  color: optionalShortText,
  /** Id of the preset feature that wrote this entry; such entries are rebuilt from the build. */
  grant: optionalShortText,
});

export const CurrencySchema = passthroughObject({
  copper: numberOr(0),
  silver: numberOr(0),
  gold: numberOr(0),
});

export const LimbArmorSchema = passthroughObject({
  head: numberOr(0),
  torso: numberOr(0),
  rightArm: numberOr(0),
  leftArm: numberOr(0),
  rightLeg: numberOr(0),
  leftLeg: numberOr(0),
});

export const InventoryItemSchema = passthroughObject({
  id: nestedId,
  name: shortText,
  type: text(ItemTypeSchema.default('item')),
  equipped: flag(false),
  weight: numberOr(0),
  cost: numberOr(0),
  description: longTextOr(),
  quantity: optionalNumber,
  itemClass: optionalShortText,

  baseAC: optionalNumber,
  dexModifier: optionalFlag,
  /** `null` means "no cap on the Dexterity bonus", which is distinct from "not set". */
  maxDexModifier: z.preprocess((v) => (v === null ? null : toNumber(v)), num.nullable().optional()),
  limbACs: text(LimbArmorSchema.optional()),

  weaponClass: text(WeaponClassSchema.optional()),
  damage: optionalShortText,
  damageType: optionalShortText,
  damageComponents: optionalList(DamageComponentSchema),
  ammunitionType: optionalShortText,
  /** A weapon that can be thrown (dagger, javelin, dart): a throw spends one from its stack. */
  thrown: optionalFlag,
  iconName: optionalShortText,
  color: optionalShortText,
  /** Id of the preset weapon, armour or gear the item was made from (D&D 2024 tables). */
  ref: optionalShortText,
});

export const AttackSchema = passthroughObject({
  id: nestedId,
  name: shortText,
  description: optionalLongText,
  damage: shortTextOr(),
  damageType: shortTextOr(),
  damageComponents: optionalList(DamageComponentSchema),
  hitBonus: numberOr(0),
  actionType: text(ActionTypeSchema.default('action')),
  weaponId: optionalNestedId,
  usesAmmunition: optionalFlag,
  ammunitionCost: optionalNumber,
  /** The stack of ammunition the player chose for it, when several would fit. */
  ammunitionItemId: optionalNestedId,
  /** A throw of the weapon itself: spends one from the weapon's stack, if it is counted. */
  thrown: optionalFlag,
  /** Dice of its damage count as at least this (Great Weapon Fighting: 3). */
  minDie: optionalNumber,
  /** Its damage held in both hands (a versatile weapon: "1d10 + 3"). */
  damageTwoHanded: optionalShortText,
  attribute: optionalShortText,
  /** Call of Cthulhu: the skill it is rolled with (`firearms:handgun`). */
  skill: optionalShortText,
  /** Call of Cthulhu: range ("15 ярд."), attacks per round ("1 (3)"), rounds loaded and capacity. */
  range: optionalShortText,
  uses: optionalShortText,
  ammo: optionalNumber,
  magazine: optionalNumber,
  /** Call of Cthulhu: a roll at or above this jams the gun. */
  malfunction: optionalNumber,
  /** Call of Cthulhu: an extreme success adds the maximum of the damage. */
  impale: optionalFlag,
  iconName: optionalShortText,
  color: optionalShortText,
  /** Id of the preset feature that wrote this entry (a Monk's Unarmed Strike); rebuilt from the build. */
  grant: optionalShortText,
});

export const AbilitySchema = passthroughObject({
  id: nestedId,
  name: shortText,
  description: longTextOr(),
  actionType: text(ActionTypeSchema.default('action')),
  resourceId: optionalNestedId,
  resourceCost: optionalNumber,
  effect: longTextOr(),
  damage: optionalShortText,
  damageType: optionalShortText,
  damageComponents: optionalList(DamageComponentSchema),
  /** How it hits: a saving throw of this ability against `saveDC`, or an attack roll with `hitBonus`. */
  saveAttribute: optionalShortText,
  saveDC: optionalNumber,
  hitBonus: optionalNumber,
  /** Using it starts concentration, which a new concentration, a failed save or incapacitation ends. */
  concentration: optionalFlag,
  iconName: optionalShortText,
  color: optionalShortText,
  /** Id of the preset feature that wrote this entry; such entries are rebuilt from the build. */
  grant: optionalShortText,
});

export const LimbSchema = passthroughObject({
  id: nestedId,
  name: shortText,
  currentHP: numeric(num),
  maxHP: numeric(num),
  /** The limb's armour class as older versions stored it; read once to derive `acBonus`. */
  ac: numberOr(0),
  /**
   * The player's modifier on top of the limb's derived armour class (worn armour, else 10 + DEX).
   * Absent on sheets saved before it existed.
   */
  acBonus: optionalNumber,
});

export const TraitSchema = passthroughObject({
  id: nestedId,
  name: shortText,
  description: longTextOr(),
  iconName: optionalShortText,
  /** Id of the preset feature that wrote this entry; such entries are rebuilt from the build. */
  grant: optionalShortText,
});

export const SpellSchema = passthroughObject({
  id: nestedId,
  name: shortText,
  // Homebrew content goes beyond the 9 standard spell levels.
  level: numeric(int.min(0).max(99).default(0)),
  school: shortTextOr(),
  castingTime: shortTextOr(),
  actionType: text(ActionTypeSchema.default('action')),
  range: shortTextOr(),
  components: shortTextOr(),
  duration: shortTextOr(),
  description: longTextOr(),
  effect: longTextOr(),
  damage: optionalShortText,
  damageType: optionalShortText,
  damageComponents: optionalList(DamageComponentSchema),
  /** Dice added per slot level above the spell's own when cast with a higher slot. */
  upcastDamage: optionalShortText,
  /** A cantrip whose dice count grows with character level (5, 11, 17). */
  cantripScaling: optionalFlag,
  /** The spellcasting modifier is added to the damage or healing. */
  addModifier: optionalFlag,
  /** A spell attack roll (`melee`/`ranged`) or the ability of the target's saving throw. */
  attackRoll: text(z.enum(['melee', 'ranged']).optional()),
  saveAttribute: optionalShortText,
  /** Casting it starts concentration, which a new concentration, a failed save or incapacitation ends. */
  concentration: optionalFlag,
  /** Can be cast as a ritual: 10 minutes longer, without a spell slot. */
  ritual: optionalFlag,
  prepared: flag(false),
  /** Granted by a feature (oath spells): always prepared and not counted against the limit. */
  alwaysPrepared: optionalFlag,
  /** Spellcasting ability of a spell granted outside the class list (species, feats). */
  ability: optionalShortText,
  resourceId: optionalNestedId,
  resourceCost: optionalNumber,
  iconName: optionalShortText,
  color: optionalShortText,
  /** Id of the preset feature that wrote this entry; such entries are rebuilt from the build. */
  grant: optionalShortText,
});

export const HistoryEntrySchema = passthroughObject({
  id: nestedId,
  timestamp: numeric(num),
  message: shortText,
  type: text(HistoryEntryTypeSchema.default('other')),
});

export const ResistanceSchema = passthroughObject({
  id: nestedId,
  type: shortText,
  level: ResistanceLevelSchema,
  /** Id of the preset feature that wrote this entry; such entries are rebuilt from the build. */
  grant: optionalShortText,
});

export const ConcentrationSchema = passthroughObject({
  kind: z.enum(['spell', 'ability']),
  id: nestedId,
  /** Shown even if the entry is renamed or deleted meanwhile. */
  name: shortText,
  startedAt: numeric(num),
});

/** Death saving throws of a hero at 0 hit points: three successes steady them, three failures kill. */
export const DeathSavesSchema = passthroughObject({
  successes: numeric(int.min(0).max(3).default(0)),
  failures: numeric(int.min(0).max(3).default(0)),
});

export const ActionCountersSchema =passthroughObject({
  action: numeric(int.min(0).default(0)),
  bonus: numeric(int.min(0).default(0)),
  reaction: numeric(int.min(0).default(0)),
  /** Spent turns only: attacks made with the Attack action taken last, for Extra Attack. */
  strikes: numeric(int.min(0).optional()),
});

const numberMap = (maxKeyLength: number) =>
  text(z.record(z.string().max(maxKeyLength), numeric(num)).default({}));

/**
 * Rules systems a hero can be built by. Each one has its own build engine and preset content in
 * `@itd/game-logic` (loaded on demand); a system whose choices differ from D&D's turns `BuildSchema`
 * into a union discriminated by `ruleset`.
 */
export const RULESETS = ['dnd2024', 'coc7'] as const;
export type RulesetId = (typeof RULESETS)[number];

/**
 * The preset choices a hero was built from (D&D 2024). The sheet's granted entries (abilities,
 * traits, resources, spells marked with `grant`) are derived from it and rebuilt on every level-up;
 * everything else on the sheet stays the player's.
 */
export const DndBuildSchema = passthroughObject({
  ruleset: z.literal('dnd2024'),
  species: shortTextOr(),
  background: shortTextOr(),
  class: shortTextOr(),
  subclass: optionalShortText,
  abilityMethod: text(z.enum(['pointBuy', 'roll', 'manual']).default('manual')),
  /** Scores before any increase. */
  baseAttributes: numberMap(64),
  /** The background's +2/+1 or +1/+1/+1. */
  backgroundBonuses: numberMap(64),
  /** Picks by choice path (`class:fighter.fighting-style/style`). */
  choices: text(z.record(z.string().max(500), z.array(shortString).max(50)).default({})),
  /** Hit points gained on each level after the first. */
  hitPoints: list(
    passthroughObject({
      level: numeric(int.min(2).max(20)),
      method: z.enum(['average', 'roll']),
      value: numeric(int.min(1).max(20)),
    }),
  ),
  level: numeric(int.min(1).max(20).default(1)),
});

/**
 * Who a Call of Cthulhu investigator is (7th edition, or Pulp Cthulhu): the choices the sheet's
 * derived numbers and the creation summary come from. Everything that changes in play (scores,
 * skills, luck, insanity) is in the `coc` block of the sheet.
 */
export const CocBuildSchema = passthroughObject({
  ruleset: z.literal('coc7'),
  variant: text(z.enum(['classic', 'pulp']).default('classic')),
  era: text(z.enum(['1920s', 'modern']).default('1920s')),
  occupation: shortTextOr(),
  /** Pulp only. */
  archetype: optionalShortText,
  /** Pulp talents, by id. */
  talents: text(z.array(shortString).max(20).default([])),
  age: numeric(int.min(15).max(99).default(25)),
});

export const BuildSchema = z.discriminatedUnion('ruleset', [DndBuildSchema, CocBuildSchema]);

/** A percentile skill of an investigator; `id` is the content id (`spot-hidden`, `science:biology`). */
export const CocSkillSchema = passthroughObject({
  id: nestedId,
  /** A speciality of the player's own ("Искусство (Танго)"), or a renamed skill. */
  name: optionalShortText,
  value: numeric(int.min(0).max(999).default(0)),
  /** Ticked after a successful use; the development phase may raise it. */
  check: flag(false),
  /** One of the occupation's skills (shown with a mark). */
  occupation: optionalFlag,
});

export const CocSpellSchema = passthroughObject({
  id: nestedId,
  name: shortText,
  cost: shortTextOr(),
  castingTime: shortTextOr(),
  description: longTextOr(),
  /** Id of the grimoire spell it was copied from. */
  ref: optionalShortText,
});

export const CocMadnessSchema = passthroughObject({
  id: nestedId,
  name: shortText,
  kind: z.enum(['phobia', 'mania']),
  description: longTextOr(),
});

/** The investigator's backstory, in the order of the 7th edition sheet. */
export const CocBackstorySchema = passthroughObject({
  personalDescription: longTextOr(),
  ideology: longTextOr(),
  significantPeople: longTextOr(),
  meaningfulLocations: longTextOr(),
  treasuredPossessions: longTextOr(),
  traits: longTextOr(),
  injuries: longTextOr(),
  arcaneTomes: longTextOr(),
  encounters: longTextOr(),
});

/**
 * The live part of a Call of Cthulhu investigator. Hit points and sanity use the sheet's common
 * `currentHP`/`maxHP` and `sanity`; states like a major wound or insanity are `conditions`.
 */
export const CocSheetSchema = passthroughObject({
  /** STR, CON, SIZ, DEX, APP, INT, POW, EDU by id (`str`…`edu`), 0–99 and beyond for monsters. */
  characteristics: numberMap(16),
  skills: list(CocSkillSchema),
  luck: numberOr(50),
  /** Luck as rolled at creation, the cap of Pulp luck recovery. */
  startingLuck: optionalNumber,
  magicPoints: numberOr(0),
  /** Sanity at creation (equal to POW). */
  startingSanity: optionalNumber,
  /** Sanity when the current day began: losing a fifth of it in a day means indefinite insanity. */
  sanityAtDayStart: optionalNumber,
  /** Points of armour worn (0–20), taken off every blow; absent means none (sheets saved before it). */
  armor: numeric(int.min(0).max(20).optional()),
  residence: shortTextOr(),
  birthplace: shortTextOr(),
  cash: numberOr(0),
  assets: shortTextOr(),
  backstory: text(CocBackstorySchema.prefault({})),
  madness: list(CocMadnessSchema),
  spells: list(CocSpellSchema),
});

/** Uploaded artwork, referenced by asset id (see the API's /assets). */
export const AssetIdSchema = z.uuid();
export const CharacterImagesSchema = passthroughObject({
  /** Full-height art for the hero screens. */
  full: text(AssetIdSchema.optional()),
  /** Square-ish portrait for lists, the sheet header and combat. */
  portrait: text(AssetIdSchema.optional()),
});

export const CharacterSchema = passthroughObject({
  schemaVersion: z.literal(CHARACTER_SCHEMA_VERSION),
  id: EntityIdSchema,

  name: text(shortString.trim().min(1)),
  /** Absent on older sheets: they read as `DEFAULT_SETTING`. */
  setting: text(z.preprocess((v) => (typeof v === 'string' ? (RETIRED_SETTINGS[v] ?? v) : v), SettingSchema.optional())),
  race: shortTextOr(),
  subrace: optionalShortText,
  class: shortTextOr(),
  subclass: shortTextOr(),
  level: numeric(int.min(1).max(100).default(1)),
  experience: numberOr(0),
  speed: numberOr(30),
  /**
   * Walking speed features add only while the gear allows it: `unarmored` without armour or a
   * shield (Unarmored Movement), `noHeavyArmor` unless heavy armour is worn (Fast Movement).
   */
  speedBonus: text(passthroughObject({ unarmored: optionalNumber, noHeavyArmor: optionalNumber }).optional()),
  /** Climbing, swimming and flying speed in feet; 0 means equal to the walking speed. */
  movement: text(passthroughObject({ climb: optionalNumber, swim: optionalNumber, fly: optionalNumber }).optional()),
  /** Darkvision range in feet. */
  darkvision: optionalNumber,
  /** The armour class as older versions stored it; read once to derive `armorClassBonus.manual`. */
  armorClass: numberOr(10),
  /**
   * Armour class beyond the gear: from features (Defense fighting style), always and while armoured,
   * and the player's own modifier. `manual` is absent on sheets saved before it existed.
   */
  armorClassBonus: text(
    passthroughObject({
      always: numberOr(0),
      armored: numberOr(0),
      manual: optionalNumber,
      /** Unarmored Defense: without armour the AC is 10 + Dexterity + this ability's modifier. */
      unarmored: optionalShortText,
      /** The Unarmored Defense is lost while holding a shield (Monk). */
      unarmoredNoShield: optionalFlag,
    }).optional(),
  ),
  initiativeBonus: optionalNumber,
  /** Half the proficiency bonus on checks without proficiency, initiative included (Jack of All Trades). */
  halfProficiency: optionalFlag,
  /** Ritual spells of the spellbook are cast as rituals without being prepared (a Wizard). */
  ritualsFromBook: optionalFlag,
  /** Attacks one Attack action makes (Extra Attack); absent means one. */
  attacksPerAction: numeric(int.min(1).max(8).optional()),
  /** The lowest natural d20 of a weapon attack that is a critical hit (19 for a Champion); absent means 20. */
  critRange: numeric(int.min(2).max(20).optional()),
  /**
   * d20 rolls the hero always makes with advantage, from features: `initiative`, `deathSave`,
   * `skill:<id>`, `save:<ability>`, `check:<ability>`.
   */
  advantageOn: optionalList(shortString),
  /** Exhaustion level 0–6 (D&D 2024): −2 per level to every d20 test and −5 feet of speed; 6 is death. */
  exhaustion: numeric(int.min(0).max(6).optional()),

  sanity: numberOr(50),
  /**
   * Added to the maximum sanity the rules give (a gift, a relic). Absent on sheets saved before it
   * existed: reading them turns sanity above the computed maximum into this bonus.
   */
  maxSanityBonus: optionalNumber,
  currentHP: numberOr(10),
  maxHP: numberOr(10),
  tempHP: numberOr(0),
  maxHPBonus: numberOr(0),
  limbs: list(LimbSchema),
  resistances: list(ResistanceSchema),
  conditions: list(shortString),
  /** The spell or ability the hero keeps concentration on; absent when not concentrating. */
  concentratingOn: text(ConcentrationSchema.optional()),
  /** Kept while the hero lies at 0 hit points; absent otherwise. */
  deathSaves: text(DeathSavesSchema.optional()),

  attributes: numberMap(64),
  attributeBonuses: numberMap(64),
  skills: list(SkillSchema),
  proficiencyBonus: numberOr(2),
  savingThrowProficiencies: list(shortString),

  inventory: list(InventoryItemSchema),
  currency: text(CurrencySchema.default({ copper: 0, silver: 0, gold: 0 })),
  attacks: list(AttackSchema),
  abilities: list(AbilitySchema),
  traits: list(TraitSchema),
  resources: list(ResourceSchema),

  spells: list(SpellSchema),
  spellcastingDifficultyName: optionalShortText,
  spellcastingDifficultyValue: optionalNumber,
  knownSchools: list(shortString),
  /** Maximum prepared spells, keyed by spell level ("0".."9"). */
  maxPreparedSpells: numberMap(8),

  inventoryNotes: longTextOr(),
  attacksNotes: longTextOr(),
  equipmentNotes: longTextOr(),
  abilitiesNotes: longTextOr(),
  spellsNotes: longTextOr(),
  languagesAndProficiencies: longTextOr(),
  appearance: longTextOr(),
  backstory: longTextOr(),
  alignment: longTextOr(),
  alliesAndOrganizations: longTextOr(),
  personalityTraits: longTextOr(),
  ideals: longTextOr(),
  bonds: longTextOr(),
  flaws: longTextOr(),

  images: text(CharacterImagesSchema.optional()),
  /** Legacy embedded portrait (data URL) from before uploaded images; read when `images.portrait` is absent. */
  avatar: text(z.string().max(LIMITS.avatar).optional()),
  history: text(z.array(HistoryEntrySchema).max(LIMITS.history).default([])),
  actionLimits: text(ActionCountersSchema.optional()),
  build: text(BuildSchema.optional()),
  /** Call of Cthulhu investigators only. */
  coc: text(CocSheetSchema.optional()),
  spentActions: text(ActionCountersSchema.optional()),
});

export type ActionType = z.infer<typeof ActionTypeSchema>;
export type ItemType = z.infer<typeof ItemTypeSchema>;
export type WeaponClass = z.infer<typeof WeaponClassSchema>;
export type ResistanceLevel = z.infer<typeof ResistanceLevelSchema>;
export type HistoryEntryType = z.infer<typeof HistoryEntryTypeSchema>;
export type Recovery = z.infer<typeof RecoverySchema>;
export type Setting = z.infer<typeof SettingSchema>;
export type DamageComponent = z.infer<typeof DamageComponentSchema>;
export type Skill = z.infer<typeof SkillSchema>;
export type Resource = z.infer<typeof ResourceSchema>;
export type Currency = z.infer<typeof CurrencySchema>;
export type LimbArmor = z.infer<typeof LimbArmorSchema>;
export type InventoryItem = z.infer<typeof InventoryItemSchema>;
export type Attack = z.infer<typeof AttackSchema>;
export type Ability = z.infer<typeof AbilitySchema>;
export type Limb = z.infer<typeof LimbSchema>;
export type Trait = z.infer<typeof TraitSchema>;
export type Spell = z.infer<typeof SpellSchema>;
export type HistoryEntry = z.infer<typeof HistoryEntrySchema>;
export type Resistance = z.infer<typeof ResistanceSchema>;
export type ActionCounters = z.infer<typeof ActionCountersSchema>;
export type Concentration = z.infer<typeof ConcentrationSchema>;
export type DeathSaves = z.infer<typeof DeathSavesSchema>;
export type CharacterImages = z.infer<typeof CharacterImagesSchema>;
export type Build = z.infer<typeof BuildSchema>;
export type DndBuild = z.infer<typeof DndBuildSchema>;
export type CocBuild = z.infer<typeof CocBuildSchema>;
export type CocSheet = z.infer<typeof CocSheetSchema>;
export type CocSkill = z.infer<typeof CocSkillSchema>;
export type CocSpell = z.infer<typeof CocSpellSchema>;
export type CocMadness = z.infer<typeof CocMadnessSchema>;
export type Character = z.infer<typeof CharacterSchema>;

/** A character before it has an identity: what the creation wizard produces. */
export type CharacterDraft = Omit<Character, 'id' | 'schemaVersion'>;
