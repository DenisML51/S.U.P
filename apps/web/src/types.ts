/**
 * Domain types and rules for the UI. The definitions live in the shared packages; this module only
 * re-exports them (so components import from one place) and adds UI-only types.
 */
export type {
  Ability,
  ActionCounters,
  ActionType,
  Attack,
  Character,
  CharacterDraft,
  CharacterPreview,
  Currency,
  DamageComponent,
  HistoryEntry,
  HistoryEntryType,
  InventoryItem,
  ItemType,
  Limb,
  Resistance,
  ResistanceLevel,
  Resource,
  Skill,
  Spell,
  Trait,
  WeaponClass,
} from '@itd/schema';

export * from '@itd/game-logic';

export type ViewMode = 'tabs' | 'hotbar';

