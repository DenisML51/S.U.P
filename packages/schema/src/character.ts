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
export const SETTINGS = ['high-fantasy', 'grimdark', 'sci-fi', 'dark-fantasy'] as const;
export const SettingSchema = z.enum(SETTINGS);
export const DEFAULT_SETTING: z.infer<typeof SettingSchema> = 'high-fantasy';

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
});

export const ResourceSchema = passthroughObject({
  id: nestedId,
  name: shortText,
  iconName: shortTextOr(),
  current: numberOr(0),
  max: numberOr(0),
  description: longTextOr(),
  spellSlotLevel: optionalNumber,
  color: optionalShortText,
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
  iconName: optionalShortText,
  color: optionalShortText,
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
  attribute: optionalShortText,
  iconName: optionalShortText,
  color: optionalShortText,
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
  iconName: optionalShortText,
  color: optionalShortText,
});

export const LimbSchema = passthroughObject({
  id: nestedId,
  name: shortText,
  currentHP: numeric(num),
  maxHP: numeric(num),
  ac: numberOr(0),
});

export const TraitSchema = passthroughObject({
  id: nestedId,
  name: shortText,
  description: longTextOr(),
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
  prepared: flag(false),
  resourceId: optionalNestedId,
  resourceCost: optionalNumber,
  iconName: optionalShortText,
  color: optionalShortText,
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
});

export const ActionCountersSchema = passthroughObject({
  action: numeric(int.min(0).default(0)),
  bonus: numeric(int.min(0).default(0)),
  reaction: numeric(int.min(0).default(0)),
});

const numberMap = (maxKeyLength: number) =>
  text(z.record(z.string().max(maxKeyLength), numeric(num)).default({}));

export const CharacterSchema = passthroughObject({
  schemaVersion: z.literal(CHARACTER_SCHEMA_VERSION),
  id: EntityIdSchema,

  name: text(shortString.trim().min(1)),
  /** Absent on older sheets: they read as `DEFAULT_SETTING`. */
  setting: text(SettingSchema.optional()),
  race: shortTextOr(),
  subrace: optionalShortText,
  class: shortTextOr(),
  subclass: shortTextOr(),
  level: numeric(int.min(1).max(100).default(1)),
  experience: numberOr(0),
  speed: numberOr(30),
  armorClass: numberOr(10),
  initiativeBonus: optionalNumber,

  sanity: numberOr(50),
  currentHP: numberOr(10),
  maxHP: numberOr(10),
  tempHP: numberOr(0),
  maxHPBonus: numberOr(0),
  limbs: list(LimbSchema),
  resistances: list(ResistanceSchema),
  conditions: list(shortString),

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

  avatar: text(z.string().max(LIMITS.avatar).optional()),
  history: text(z.array(HistoryEntrySchema).max(LIMITS.history).default([])),
  actionLimits: text(ActionCountersSchema.optional()),
  spentActions: text(ActionCountersSchema.optional()),
});

export type ActionType = z.infer<typeof ActionTypeSchema>;
export type ItemType = z.infer<typeof ItemTypeSchema>;
export type WeaponClass = z.infer<typeof WeaponClassSchema>;
export type ResistanceLevel = z.infer<typeof ResistanceLevelSchema>;
export type HistoryEntryType = z.infer<typeof HistoryEntryTypeSchema>;
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
export type Character = z.infer<typeof CharacterSchema>;

/** A character before it has an identity: what the creation wizard produces. */
export type CharacterDraft = Omit<Character, 'id' | 'schemaVersion'>;
